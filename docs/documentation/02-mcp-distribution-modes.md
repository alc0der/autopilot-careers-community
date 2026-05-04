## MCP Distribution Modes

The three MCP servers — **linkedin-fetcher**, **oh-my-cv-render**, and **bullet-embeddings** — can be distributed in three ways depending on the use case. The active mode is set via the `MCP_MODE` environment variable and controlled by the publish/deploy scripts.

### Mode 1 — Local stdio (dev)

![](embed:DeploymentStdio)

MCP servers run as pnpm child processes on the developer machine, connected to Claude Desktop via stdio transport. No containers required.

**When to use:** active development of the MCP servers themselves.

**Configure:**
```
pnpm mcp:install:claude
```

This writes stdio-based entries to `~/Library/Application Support/Claude/claude_desktop_config.json`.

---

### Mode 2 — Local container (release)

![](embed:DeploymentContainer)

MCP servers run as OCI containers (Docker or Apple Container) on localhost ports 3001–3003. Because Claude Desktop only supports stdio-based MCP servers, an `mcp-remote` bridge process is spawned per server to proxy stdio→HTTP.

**When to use:** running a stable local release without depending on the source tree.

**Manage containers:**
```
pnpm mcp:containers:build   # build images
pnpm mcp:containers:start   # start (detached)
pnpm mcp:containers:stop    # stop
```

**Configure Claude Desktop and CoWork:**
```
pnpm mcp:containers:config
```

This runs `publish_codex_plugin.py` (Codex CLI) and `claude_plugin.py deploy` (Claude Desktop CoWork) in sequence, both with `MCP_MODE=container`.

**Ollama:** stays on the host. Containers reach it via `host.containers.internal:11434`.

---

### Mode 3 — Hosted (cloud)

![](embed:DeploymentHosted)

MCP servers are deployed to `mcp.autopilot.careers` and called directly over HTTPS. No local processes or containers needed.

**When to use:** sharing the skill with users who do not have the monorepo cloned locally.

**Configure:**
```
MCP_MODE=hosted pnpm mcp:containers:config
```

Or set individual URL overrides:
```
FETCHER_MCP_URL=https://... RENDERER_MCP_URL=https://... EMBEDDINGS_MCP_URL=https://...
```

---

### Plugin packaging scripts

#### Claude Desktop

![](embed:DeploymentClaudePlugin)

| Script | File | What it writes |
|---|---|---|
| `claude_plugin.py deploy` | `packages/agent-marketplace/scripts/` | Extracts `write-resume-plugin-{v}.zip` into `local-agent-mode-sessions/*/rpm/plugin_*/` (CoWork) |
| `claude_mcp.py install` | `scripts/` | Writes MCP server entries to `claude_desktop_config.json` (standalone Claude Desktop) |

#### Codex Desktop

![](embed:DeploymentCodexPlugin)

| Script | File | What it writes |
|---|---|---|
| `publish_codex_plugin.py` | `packages/agent-marketplace/scripts/` | Extracts `write-resume-plugin-codex-{v}.zip` into project `.codex/plugins/` and syncs to `~/.codex/plugins/cache/`; registers marketplace in `~/.codex/config.toml` |

The two pipelines are intentionally separate because Claude Desktop CoWork and the Codex CLI store plugin state in completely different locations.
