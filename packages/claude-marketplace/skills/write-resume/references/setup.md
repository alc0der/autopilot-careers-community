## /Setup

First-time setup for the write-resume plugin.

### Install Tools

Run the setup script from the plugin root:

```bash
./setup.sh
```

This installs jq and mustache into the plugin's `vendor/` directory and verifies python3 + PyYAML are available. LinkedIn job fetching and resume rendering are handled by MCP tools (no local install needed).

### Plugin Config

User-configurable settings are declared in `plugin.json` under `userConfig`. Pass resolved values as environment variables when invoking scripts.

| Variable | Default | Description |
|----------|---------|-------------|
| `$TMP_DIR` | `.` | Directory for temporary files during rendering |
