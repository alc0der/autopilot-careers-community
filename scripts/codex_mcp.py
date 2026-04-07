#!/usr/bin/env python3

from __future__ import annotations

import argparse
import os
import re
import textwrap
from pathlib import Path


SERVER_NAMES = ("linkedin-fetcher", "oh-my-cv-render", "bullet-embeddings")
DEFAULT_RUNTIME_PROJECT_ROOT = Path.home() / "Documents/Projects/Career on Autopilot"
DEFAULT_FETCHER_URL = "https://mcp.alc0der.dev/fetcher"
DEFAULT_RENDERER_URL = "https://mcp.alc0der.dev/renderer"
DEFAULT_EMBEDDINGS_URL = "https://mcp.alc0der.dev/bullet-embeddings"


def detect_mode(root: Path) -> str:
    local_packages = (
        root / "packages/fetcher/package.json",
        root / "packages/renderer/package.json",
        root / "packages/bullet-embeddings/package.json",
    )
    return "local" if all(path.is_file() for path in local_packages) else "hosted"


def default_runtime_project_root() -> Path:
    return Path(os.environ.get("CAREER_PROJECT_ROOT", DEFAULT_RUNTIME_PROJECT_ROOT)).expanduser()


def build_block(mode: str, root: Path, fetcher_url: str, renderer_url: str, embeddings_url: str) -> str:
    if mode == "hosted":
        return textwrap.dedent(
            f"""
            [mcp_servers.linkedin-fetcher]
            url = "{fetcher_url}"

            [mcp_servers.oh-my-cv-render]
            url = "{renderer_url}"

            [mcp_servers.bullet-embeddings]
            url = "{embeddings_url}"
            """
        ).strip() + "\n"

    return textwrap.dedent(
        f"""
        [mcp_servers.linkedin-fetcher]
        command = "pnpm"
        args = ["--silent", "run", "mcp"]
        cwd = "{root / 'packages/fetcher'}"

        [mcp_servers.oh-my-cv-render]
        command = "pnpm"
        args = ["--silent", "run", "mcp"]
        cwd = "{root / 'packages/renderer'}"

        [mcp_servers.bullet-embeddings]
        command = "pnpm"
        args = ["--silent", "run", "mcp"]
        cwd = "{root / 'packages/bullet-embeddings'}"
        """
    ).strip() + "\n"


def install(args: argparse.Namespace) -> None:
    root = Path(args.root).resolve()
    config_path = Path(args.config).expanduser()
    config_path.parent.mkdir(parents=True, exist_ok=True)
    mode = args.mode or detect_mode(root)
    block = build_block(mode, root, args.fetcher_url, args.renderer_url, args.embeddings_url)

    content = config_path.read_text() if config_path.exists() else ""
    content = re.sub(
        r"\n?\[mcp_servers\.(linkedin-fetcher|oh-my-cv-render|bullet-embeddings)\][\s\S]*?(?=\n\[|$)",
        "",
        content,
        flags=re.MULTILINE,
    ).strip()
    config_path.write_text((content + "\n\n" + block if content else block).rstrip() + "\n")

    print(f"Updated {config_path}")
    print(f"Mode: {mode}")


def status(args: argparse.Namespace) -> None:
    config_path = Path(args.config).expanduser()
    if not config_path.exists():
        raise SystemExit(f"No Codex MCP config found at {config_path}")

    text = config_path.read_text()
    for name in SERVER_NAMES:
        command_match = re.search(
            rf"\[mcp_servers\.{re.escape(name)}\]\ncommand = \"([^\"]+)\"\nargs = \[(.*?)\]\ncwd = \"([^\"]+)\"",
            text,
            flags=re.DOTALL,
        )
        if command_match:
            command, args_text, cwd = command_match.groups()
            print(f"{name}: {command} [{args_text}] (cwd={cwd})")
            continue

        url_match = re.search(
            rf"\[mcp_servers\.{re.escape(name)}\]\nurl = \"([^\"]+)\"",
            text,
            flags=re.DOTALL,
        )
        if url_match:
            print(f"{name}: {url_match.group(1)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    install_parser = subparsers.add_parser("install")
    install_parser.add_argument("--root", default=str(Path.cwd()))
    install_parser.add_argument("--config", default=str(default_runtime_project_root() / ".codex/config.toml"))
    install_parser.add_argument("--mode", choices=("local", "hosted"))
    install_parser.add_argument("--fetcher-url", default=os.environ.get("FETCHER_MCP_URL", DEFAULT_FETCHER_URL))
    install_parser.add_argument("--renderer-url", default=os.environ.get("RENDERER_MCP_URL", DEFAULT_RENDERER_URL))
    install_parser.add_argument("--embeddings-url", default=os.environ.get("EMBEDDINGS_MCP_URL", DEFAULT_EMBEDDINGS_URL))
    install_parser.set_defaults(func=install)

    status_parser = subparsers.add_parser("status")
    status_parser.add_argument("--config", default=str(default_runtime_project_root() / ".codex/config.toml"))
    status_parser.set_defaults(func=status)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
