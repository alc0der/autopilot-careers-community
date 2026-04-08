# Autopilot Careers

A system for resume tailoring, job application support, and career planning.

## Installation

### Codex

- Download the latest Codex plugin release from the GitHub Releases page.
- Install or extract it into your Codex environment.
- Start Codex in your career data project and invoke `$write-resume`.

### Claude Desktop

- Download the latest Claude plugin release from the GitHub Releases page, or install it through the marketplace when available.
- Configure the MCP servers for your installation.
- Start Claude in your career data project and invoke `/write-resume`.

## Important: iCloud Drive Compatibility

If your career data directory lives inside `~/Documents` or `~/Desktop` and you have **iCloud Drive "Desktop & Documents Folders"** enabled, you will encounter `EDEADLK` / `Resource deadlock avoided` errors when Claude's VM tries to read your files.

**Why it happens:** iCloud's sync daemon holds advisory locks on managed files. When Claude's Linux VM mounts the directory via its FUSE bridge, the macOS kernel detects a circular lock dependency and returns `EDEADLK` (errno 35) instead of hanging. The error is per-file and intermittent — some files read fine while others fail in the same session.

**How to fix (pick one):**

1. **Move the project outside iCloud-managed folders** — e.g., `~/Projects/Career on Autopilot` instead of `~/Documents/Projects/Career on Autopilot`. This is the recommended fix.
2. **Disable "Desktop & Documents Folders"** in System Settings → Apple Account → iCloud → iCloud Drive (or iCloud Drive Options on older macOS).
3. **Pin the folder as "Always Keep on This Mac"** — right-click the project folder in Finder → Download Now. This reduces but may not fully eliminate the issue.

> **Note:** Restarting Claude, killing processes, or rebooting will **not** resolve this — iCloud re-establishes its locks immediately upon restart.

## Usage

Start a chat thread in Claude or Codex:
```
/write-resume for https://www.linkedin.com/jobs/view/${jobUrl:-1234567890}
```

## Contributing

Use the package manager from the repo root:

```bash
pnpm install
pnpm build        # typecheck + bundle all packages
pnpm test         # run tests across all packages
pnpm typecheck    # type-check only
pnpm mcp:install
pnpm mcp:status
pnpm codex:publish
```

## Packages

| Package | Description |
|---------|-------------|
| `packages/renderer` | Headless Markdown-to-PDF resume renderer (MCP server + CLI) |
| `packages/fetcher` | Job posting fetcher (MCP server + CLI) |
| `packages/bullet-embeddings` | Bullet trust signals via Vectra + Ollama (MCP server) |
| `packages/db` | Career data: resumes, job descriptions, journal |
| `packages/agent-marketplace` | Shared agent packaging for Claude and Codex |

## Debugging with Claude Sessions

The `.claude-sessions` symlink at the repo root points to the Claude Code local agent-mode session directory for this project:

```
.claude-sessions/ -> ~/Library/Application Support/Claude/local-agent-mode-sessions/<project-id>/<session-id>/
```

This directory contains conversation transcripts, tool call logs, and agent trajectory data produced by Claude Code while working on this repo.

### Using the session data for debugging

- **Trajectory audit** — Review `.json` / `.jsonl` files to inspect the full sequence of tool calls, reasoning steps, and decisions the AI made during a session. This lets you identify where it went wrong or took suboptimal paths.
- **Self-optimization** — Point the AI at its own session logs to diagnose patterns like unnecessary retries, missed context, or redundant searches. Ask it to read a specific session file and suggest how it could have handled the task better.
- **Reproducing issues** — Session files capture the exact inputs, tool arguments, and outputs. Use them to replay or reproduce a failing interaction.
- **Comparing approaches** — Diff two session logs to see how different prompts or starting contexts led to different tool-call trajectories for similar tasks.

### Example usage

```bash
# List all sessions
ls .claude-sessions/

# Read a specific session transcript
cat .claude-sessions/local_<session-id>.jsonl | jq .

# Have Claude audit its own trajectory
# (paste a session file path and ask it to analyze the decisions)
```

> **Note:** `.claude-sessions` is gitignored — it's a machine-local symlink and the session data is specific to your Claude Code installation.
