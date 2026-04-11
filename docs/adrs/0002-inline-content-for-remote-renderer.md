# 2. Use inline content transfer for the remote renderer MCP server

Date: 2026-04-11

## Status

Proposed

## Context

The **oh-my-cv-render** MCP server currently runs locally and operates on absolute filesystem paths: the client passes paths to YAML source files and an output location, and the server reads/writes directly from disk (see `docs/documentation/01-renderer-mcp.md`).

We plan to host this server on the internet so it can be shared across machines and agents without requiring a local Docker container. A remote server cannot access the client's filesystem, so the tool interface must change to transfer file *content* rather than file *paths*.

### MCP content primitives

The MCP specification (2025-06-18) provides:

| Direction | Primitive | Mechanism |
|-----------|-----------|-----------|
| Server to client | `EmbeddedResource` (`BlobResourceContents`) | Base64 `blob` field -- first-class spec primitive |
| Server to client | `EmbeddedResource` (`TextResourceContents`) | Inline `text` field -- first-class spec primitive |
| Server to client | `ResourceLink` | URI-only lazy reference; client fetches via `resources/read` |
| Client to server | *(none)* | No dedicated primitive; tool `inputSchema` must define string properties carrying content |

The key asymmetry: **outputs** have rich protocol-level support, but **inputs** must be modelled as plain JSON Schema properties in the tool's `inputSchema`.

### Options considered

**A. Inline content in tool arguments + EmbeddedResource in responses**
Pass YAML text directly as string arguments. Return PDF bytes as base64 in `BlobResourceContents` and markdown/JSON as `TextResourceContents`. No external infrastructure required.

**B. Object storage (S3/GCS) with pre-signed URLs**
Client uploads source files to a bucket, passes pre-signed URLs. Server uploads rendered output, returns download URLs. Handles arbitrarily large files but requires cloud storage infrastructure, IAM configuration, and pre-signed URL lifecycle management.

**C. ResourceLink for lazy output retrieval**
Same as option A for inputs. For outputs, return a `ResourceLink` and let the client fetch the PDF via `resources/read` on demand. More elegant flow control, but `ResourceLink` was added in the 2025-06-18 spec revision and client support is not yet universal.

**D. Network filesystem (NFS/VPN mount)**
Mount the user's data directory on the remote server. No API changes, but creates a security and networking burden that defeats the purpose of hosting remotely.

### File size analysis

The files involved are small enough for inline transfer:

| File | Typical size | Encoding |
|------|-------------|----------|
| base.yaml | 3-5 KB | Plain text |
| contact.yaml | < 1 KB | Plain text |
| ai.yaml (overlay) | 2-4 KB | Plain text |
| Rendered PDF | 50-150 KB | Base64 (~70-200 KB) |
| Rendered Markdown | 3-8 KB | Plain text |
| Rendered JSON Resume | 5-10 KB | Plain text |

Total round-trip payload stays well under 500 KB, comfortably within MCP message limits.

## Decision

Adopt **option A: inline content transfer**.

### Input changes (client to server)

Replace filesystem paths with content strings in the tool's `inputSchema`:

| Current parameter | Type | New parameter | Type |
|-------------------|------|---------------|------|
| `base` (path) | string | `base` (YAML text) | string |
| `contact` (path) | string | `contact` (YAML text) | string |
| `ai` (path) | string | `ai` (YAML text) | string |
| `output` (path) | string | `filename` (stem only, no path) | string |

Since YAML is text, no base64 encoding is needed for inputs -- the content is passed as plain strings. The `output` path is replaced by a `filename` stem (e.g. `"20260410_Energetech_Resume"`) since the server no longer writes to the client's filesystem.

### Output changes (server to client)

Return rendered artifacts as MCP `EmbeddedResource` content blocks in the `CallToolResult`:

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
    },
    {
      "type": "resource",
      "resource": {
        "uri": "render://20260410_Energetech_Resume.md",
        "mimeType": "text/markdown",
        "text": "---\nname: Ahmad Akilan\n..."
      }
    },
    {
      "type": "resource",
      "resource": {
        "uri": "render://20260410_Energetech_Resume.json",
        "mimeType": "application/json",
        "text": "{\"basics\":{...}}"
      }
    }
  ]
}
```

The client (skill) is responsible for writing received content to the user's `db/` directory.

### `render_resume` tool

The same pattern applies: `input` becomes an inline markdown string, and the PDF is returned as `BlobResourceContents`.

### Backwards compatibility

The server should accept both modes during a transition period:

1. If `base` looks like an absolute path (starts with `/`), fall back to filesystem reads (local mode).
2. Otherwise, treat `base` as inline YAML content (remote mode).

This lets existing local deployments continue working without changes to the skill.

## Consequences

- **No external infrastructure required.** The remote server is self-contained -- no object storage, no VPN, no mounted volumes.
- **The skill becomes responsible for file I/O.** It reads source YAMLs before calling the tool and writes rendered output after. This is a clean separation: the renderer is a pure transform, the skill manages the user's filesystem.
- **Base64 overhead is acceptable.** A 150 KB PDF becomes ~200 KB in base64, well within typical HTTP and MCP message budgets.
- **Future migration to ResourceLink is straightforward.** If client support for `ResourceLink` + `resources/read` becomes universal, we can add a `lazy: true` option that returns URIs instead of inline content, without changing the input side.
- **HTML output cannot be returned inline.** The current `html: true` flag writes an HTML file alongside the PDF. For the remote case, this can be added as an additional `TextResourceContents` block, or deferred since HTML output is used only for debugging.
