# 2. Use inline content transfer for the remote renderer MCP server

Date: 2026-04-11

## Status

Accepted

## Context

The **oh-my-cv-render** MCP server currently runs locally and operates on absolute filesystem paths: the client passes a path to a rendered Markdown file and an output location, and the server reads/writes directly from disk.

We plan to host this server on the internet so it can be shared across machines and agents without requiring a local Docker container. A remote server cannot access the client's filesystem, so the tool interface must change to transfer file *content* rather than file *paths*.

### Scope reduction: `merge_and_render` removed

The server previously exposed a `merge_and_render` tool that accepted three YAML file paths (base, contact, AI overlay), merged them into a JSON Resume document, converted to Markdown, and rendered to PDF — all server-side.

This tool has been removed from the MCP server. The merge and conversion logic remains available as a library (`src/converter/`) and via the CLI (`merge` command), but the MCP server is now a **pure renderer**: Markdown in, PDF out. The rationale:

1. **Single responsibility.** The renderer's job is typesetting, not data assembly. Merging YAML files is a client concern — the skill reads the user's filesystem, performs the merge, writes intermediate files, and calls `render_resume` with the result.
2. **Simpler remote interface.** Transferring one Markdown string is simpler than three YAML strings plus orchestrating merge, validation, and conversion server-side.
3. **Client already owns the merge.** The skill needs the merged Markdown for page-fit verification loops, artifact presentation, and local file management. Running the merge client-side avoids duplicating that state.

### MCP content primitives

The MCP specification (2025-06-18) provides:

| Direction | Primitive | Mechanism |
|-----------|-----------|-----------|
| Server → client | `EmbeddedResource` (`BlobResourceContents`) | Base64 `blob` field — first-class spec primitive |
| Server → client | `EmbeddedResource` (`TextResourceContents`) | Inline `text` field — first-class spec primitive |
| Server → client | `ResourceLink` | URI-only lazy reference; client fetches via `resources/read` |
| Client → server | *(none)* | No dedicated primitive; tool `inputSchema` must define string properties carrying content |

The key asymmetry: **outputs** have rich protocol-level support, but **inputs** must be modelled as plain JSON Schema properties in the tool's `inputSchema`.

### Options considered

**A. Inline content in tool arguments + EmbeddedResource in responses**
Pass Markdown text directly as a string argument. Return PDF bytes as base64 in `BlobResourceContents`. No external infrastructure required.

**B. Object storage (S3/GCS) with pre-signed URLs**
Client uploads source file to a bucket, passes pre-signed URL. Server uploads rendered output, returns download URL. Handles arbitrarily large files but requires cloud storage infrastructure, IAM configuration, and pre-signed URL lifecycle management.

**C. ResourceLink for lazy output retrieval**
Same as option A for inputs. For outputs, return a `ResourceLink` and let the client fetch the PDF via `resources/read` on demand. More elegant flow control, but `ResourceLink` was added in the 2025-06-18 spec revision and client support is not yet universal.

**D. Network filesystem (NFS/VPN mount)**
Mount the user's data directory on the remote server. No API changes, but creates a security and networking burden that defeats the purpose of hosting remotely.

### File size analysis

With the renderer reduced to a single tool, the files involved are small:

| File | Typical size | Encoding |
|------|-------------|----------|
| Rendered Markdown (input) | 3-8 KB | Plain text |
| style.css (optional input) | 1-3 KB | Plain text |
| Rendered PDF (output) | 50-150 KB | Base64 (~70-200 KB) |

Total round-trip payload stays well under 300 KB, comfortably within MCP message limits.

## Decision

Adopt **option A: inline content transfer**.

### Input changes (`render_resume`)

Replace filesystem paths with content strings in the tool's `inputSchema`:

| Current parameter | Type | New parameter | Type |
|-------------------|------|---------------|------|
| `input` (path) | string | `input` (Markdown text) | string |
| `output` (path) | string | `filename` (stem only, no path) | string |
| `css` (path) | string | `css` (CSS text, optional) | string |
| `html` (bool) | boolean | *(removed)* | — |
| `metadata` (object) | object | `metadata` (unchanged) | object |

Notes:
- `input` carries the full Markdown content instead of a filesystem path.
- `output` is replaced by `filename` — a stem like `"20260410_Energetech_Resume"` since the server no longer writes to the client's filesystem.
- `css` carries inline CSS text. If omitted, the server uses its bundled default stylesheet.
- `html` is removed — HTML output was only useful for local debugging with filesystem access.

### Output changes (server to client)

Return the rendered PDF as an MCP `EmbeddedResource` in the `CallToolResult`:

```json
{
  "content": [
    {
      "type": "resource",
      "resource": {
        "uri": "render://20260410_Energetech_Resume.pdf",
        "mimeType": "application/pdf",
        "blob": "<base64-encoded PDF bytes>"
      }
    }
  ]
}
```

The client (skill) is responsible for decoding and writing the PDF to the user's directory.

### Backwards compatibility

The server should accept both modes during a transition period:

1. If `input` looks like an absolute path (starts with `/`), fall back to filesystem reads (local mode).
2. Otherwise, treat `input` as inline Markdown content (remote mode).

This lets existing local deployments continue working without changes to the skill.

## Consequences

- **No external infrastructure required.** The remote server is self-contained — no object storage, no VPN, no mounted volumes.
- **The skill owns the full pipeline before rendering.** It reads source YAMLs, merges them (using the converter library or its own logic), generates Markdown, and calls the renderer with the result. This is a clean separation: the renderer is a pure typesetting transform.
- **Base64 overhead is acceptable.** A 150 KB PDF becomes ~200 KB in base64, well within typical HTTP and MCP message budgets.
- **Future migration to ResourceLink is straightforward.** If client support for `ResourceLink` + `resources/read` becomes universal, we can add a `lazy: true` option that returns a URI instead of inline content, without changing the input side.
- **CSS must be bundled or inlined.** Without filesystem access, the server cannot walk up directories to find `style.css`. The default stylesheet should be bundled into the server, with an optional `css` parameter for overrides.
