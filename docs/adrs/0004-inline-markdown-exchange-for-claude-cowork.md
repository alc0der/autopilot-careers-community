# 4. Extend inline content transfer to all MCP connectors

Date: 2026-05-04

## Status

Accepted. Supersedes [ADR 0002. Use inline content transfer for the remote renderer MCP server](0002-inline-content-for-remote-renderer.md). The original analysis (MCP primitives, options A–D, payload sizing, the `merge_and_render` scope reduction) remains in 0002 for historical reference and is not repeated here.

## Context

ADR 0002 converted `render_resume` to accept inline Markdown but kept a transitional `startsWith("/")` fallback for local paths, and only addressed the renderer. Three callers still pass filesystem paths to MCP tools:

| Server | Tool | Path argument | Used to |
|--------|------|---------------|---------|
| oh-my-cv-render | `render_resume` | `input` (when starts with `/`), `output`, `css` | 0002 transition fallback |
| bullet-embeddings | `harvest` | `file` | `readFile()` an `*_ai.yaml` |
| bullet-embeddings | `query` | `jd` | `readFile()` an annotated JD |

The trigger to revisit is **Claude CoWork** running in `claude.ai`. CoWork is a sandboxed cloud runtime that mounts the user's project as a virtual workspace — its filesystem is on a different host than `mcp.autopilot.careers`, so any path-shaped argument is meaningless to the server. The same MCP-spec constraint described in 0002 (no client→server file-upload primitive) applies; the only difference from 0002's "hosted renderer" framing is that the client itself is now remote, which makes the transitional path fallback unreachable, not just optional.

`linkedin-fetcher` is unaffected — it already operates on URLs.

## Decision

Path-shaped arguments are removed from every MCP tool contract; the skill reads files locally and passes content.

### Decisions carried forward from 0002

These remain in force and are restated here so this ADR stands alone:

- **`merge_and_render` stays out of the MCP server.** Merge/conversion logic remains a library (`src/converter/`) and CLI command. The renderer is a pure Markdown-to-PDF transform.
- **PDF responses use `EmbeddedResource` (`BlobResourceContents`).** The server returns base64 bytes; the skill decodes and writes to the user's directory.
- **The default stylesheet is bundled into the server.** No filesystem walk-up. The optional `css` argument carries inline CSS overrides.

### New tool-by-tool changes

**`render_resume`** — drop the `startsWith("/")` branch and the local-mode parameters (`output`, `html`, `findStyleCss()` walk-up). `input` is always inline Markdown, `css` is always inline CSS.

**`harvest`** — replace `file: string (path)` with:
- `content: string` — full YAML text.
- `filename: string` — the basename, kept as an explicit argument because `YYYYMMDD_Company_Role_ai.yaml` carries metadata (`resumeStem`, `date`, `company`, `role`, `resume_file`) the server still needs.

**`query`** — replace `jd: string (path)` with `jd_text: string`. The `text` parameter is unchanged.

The skill becomes the sole filesystem owner: it reads source files before each call and writes the decoded PDF after.

## Consequences

- **Single contract per tool, identical across stdio, local container, and hosted modes.** Hosted MCP and Claude CoWork work without special casing.
- **Breaking change to `render_resume`.** The transitional dual-mode from 0002 is gone, along with `output` and `html`. The skill is the only known caller and is updated in lockstep.
- **`harvest` metadata semantics survive.** Promoting the basename to an explicit `filename` is more honest than smuggling it through a path.
- **Reference docs to update.** `docs/documentation/01-renderer-mcp.md` (currently documents both modes) and the skill's `references/harvest.md` need to follow.
- **Payload sizes remain trivial** — worst case ~15 KB for `query`, well within the bounds 0002 already analysed.
- **Future `ResourceLink` migration** noted in 0002 is unaffected.
