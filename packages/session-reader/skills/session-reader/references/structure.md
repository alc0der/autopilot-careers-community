## Session File Structure

Claude sessions (from Cowork/Desktop/CLI) are stored in a `.claude-sessions/` directory, typically at the project root.

### Layout

```
.claude-sessions/
├── local_<uuid>.json          # Metadata (small, fast to read)
├── local_<uuid>/              # Session data directory
│   ├── audit.jsonl            # Conversation log (the important file)
│   ├── outputs/               # Files produced during the session
│   ├── uploads/               # Files uploaded by the user
│   └── shim-lib/, shim-perm/  # Internal
├── spaces.json                # Workspace/space config (ignore)
└── cowork_settings.json       # Cowork config (ignore)
```

### Metadata file (`local_<uuid>.json`)

Small JSON with session-level info. Key fields:

| Field | Type | Example |
|-------|------|---------|
| `sessionId` | string | `"local_064790ae-..."` |
| `title` | string | `"Write tailored resume for job posting"` |
| `model` | string | `"claude-sonnet-4-6"` |
| `createdAt` | epoch ms | `1775654367402` |
| `lastActivityAt` | epoch ms | `1775655091440` |
| `initialMessage` | string | The user's first message |
| `cwd` | string | Working directory for the session |

Also contains `enabledMcpTools`, `remoteMcpServersConfig` (MCP tool definitions — very large, ignore when looking for conversation content), and `mcqAnswers` (multiple-choice question responses from the user).

### Audit log (`audit.jsonl`)

One JSON object per line. This is where the actual conversation lives, but it also contains a lot of noise.

**Line types (by `type` field):**

| type | subtype | What it is | Read it? |
|------|---------|-----------|----------|
| `system` | `init` | Tool list, session config | Skip — enormous, just tool names |
| `user` | — | User messages and tool results | **Yes** |
| `assistant` | — | Assistant text and tool calls | **Yes** |
| `system` | `permission_request` | Tool permission prompts | Skip |
| `system` | `permission_response` | User's permission decisions | Skip |

**Content block types (inside `content` arrays):**

| Block type | Contains | Notes |
|-----------|---------|-------|
| `text` | `.text` — actual conversation | Primary content |
| `tool_use` | `.name`, `.input` | What tool was called and with what args |
| `tool_result` | `.content` | Output of tool call; can be string or array of text blocks |

### Gotchas

1. **The `.json` file does NOT contain conversation messages.** It's metadata only. The conversation is in `<session-dir>/audit.jsonl`.

2. **`audit.jsonl` lines can be enormous.** The `system/init` line alone can be 100KB+ because it lists every MCP tool definition. Always filter by `type` before processing.

3. **`tool_result` content can be wrapped in `<persisted-output>` tags** when output exceeds a size limit. The tag contains a file path and a preview. Extract the preview or read the referenced file.

4. **Grep is unreliable on these files.** Lines are too long for ripgrep (which truncates with `[Omitted long matching line]`), and keywords like "error" or "fetch" appear in tool descriptions, not just conversation. Use the extraction script or parse the JSONL directly.

5. **The `message` wrapper.** Assistant lines sometimes nest content under `.message.content` rather than `.content` directly. Always check both: `data.get("message", data).get("content", [])`.
