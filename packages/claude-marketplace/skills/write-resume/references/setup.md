## /Setup

First-time setup for the write-resume skill package.

### Install Tools

Run the setup script from the agent package root:

```bash
packages/claude-marketplace/setup.sh
```

This installs jq and mustache into the plugin's `vendor/` directory and verifies python3 + PyYAML are available. LinkedIn job fetching and resume rendering are handled by MCP tools (no local install needed).

### Agent Package Config

When the skill is packaged for an agent runtime, runtime-specific config may pass environment variables into scripts.

| Variable | Default | Description |
|----------|---------|-------------|
| `$TMP_DIR` | `.` | Directory for temporary files during rendering |
