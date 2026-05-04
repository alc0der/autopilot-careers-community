#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path


SERVER_CONFIG = {
    "linkedin-fetcher": {"path": "packages/fetcher",           "port": 3001},
    "oh-my-cv-render":  {"path": "packages/renderer",          "port": 3002},
    "bullet-embeddings":{"path": "packages/bullet-embeddings", "port": 3003},
}
DEFAULT_CONFIG_PATH = Path.home() / "Library/Application Support/Claude/claude_desktop_config.json"


def default_config_path() -> Path:
    return Path(os.environ.get("CLAUDE_CONFIG", DEFAULT_CONFIG_PATH)).expanduser()


def install(args: argparse.Namespace) -> None:
    root = Path(args.root).resolve()
    config_path = Path(args.config).expanduser()
    config_path.parent.mkdir(parents=True, exist_ok=True)

    data: dict[str, object]
    if config_path.exists():
        data = json.loads(config_path.read_text())
    else:
        data = {}

    mcp_servers = data.setdefault("mcpServers", {})
    if not isinstance(mcp_servers, dict):
        raise SystemExit(f"Invalid mcpServers section in {config_path}")

    if args.mode == "container":
        for name, cfg in SERVER_CONFIG.items():
            mcp_servers[name] = {
                "command": "npx",
                "args": ["-y", "mcp-remote", f"http://localhost:{cfg['port']}/mcp", "--allow-http"],
            }
    else:
        for name, cfg in SERVER_CONFIG.items():
            mcp_servers[name] = {
                "command": "pnpm",
                "args": ["--prefix", str(root / cfg["path"]), "--silent", "run", "mcp"],
            }

    config_path.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Updated {config_path} (mode: {args.mode})")


def status(args: argparse.Namespace) -> None:
    config_path = Path(args.config).expanduser()
    if not config_path.exists():
        raise SystemExit(f"No Claude MCP config found at {config_path}")

    data = json.loads(config_path.read_text())
    mcp_servers = data.get("mcpServers", {})
    if not isinstance(mcp_servers, dict):
        raise SystemExit(f"Invalid mcpServers section in {config_path}")

    for name in SERVER_CONFIG:
        config = mcp_servers.get(name)
        if not isinstance(config, dict):
            continue
        if "url" in config:
            print(f"{name}: {config['url']}")
        else:
            args_value = config.get("args", [])
            if isinstance(args_value, list):
                print(f"{name}: {' '.join(map(str, args_value))}")


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    install_parser = subparsers.add_parser("install")
    install_parser.add_argument("--root", default=str(Path.cwd()))
    install_parser.add_argument("--config", default=str(default_config_path()))
    install_parser.add_argument("--mode", choices=["local", "container"], default="local")
    install_parser.set_defaults(func=install)

    status_parser = subparsers.add_parser("status")
    status_parser.add_argument("--config", default=str(default_config_path()))
    status_parser.set_defaults(func=status)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
