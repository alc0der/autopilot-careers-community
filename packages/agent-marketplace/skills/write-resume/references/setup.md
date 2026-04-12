## /Setup

First-time setup for the write-resume skill package.

### Prerequisites

The write-resume skill requires two MCP servers:

1. **oh-my-cv-render** — Renders oh-my-cv markdown resumes to PDF
2. **linkedin-fetcher** — Fetches LinkedIn job descriptions
3. **bullet-embeddings** (optional) — Indexes achievement bullets for reuse intelligence (requires Ollama)

Resume PDF rendering is handled by the `oh-my-cv-render` MCP server — no external binaries (jq, mustache, python3) are needed.

### Working Directory

The working directory must contain:
- `base.yaml` — Work history, education, and skills following JSON Resume schema with `x-id` extensions
- `contact.yaml` — Personal info following JSON Resume `basics` shape

See [/ground](ground.md) to generate `base.yaml` from a LinkedIn data export.
