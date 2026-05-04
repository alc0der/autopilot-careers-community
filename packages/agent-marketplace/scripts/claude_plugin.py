#!/usr/bin/env python3

from __future__ import annotations

import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = PACKAGE_ROOT.parent.parent
PLUGIN_NAME = "write-resume-plugin"
DEFAULT_SESSION_DIR = Path.home() / "Library/Application Support/Claude/local-agent-mode-sessions"
DEFAULT_FETCHER_URL = "https://mcp.alc0der.dev/fetcher"
DEFAULT_RENDERER_URL = "https://mcp.alc0der.dev/renderer"
DEFAULT_EMBEDDINGS_URL = "https://mcp.alc0der.dev/bullet-embeddings"

BUNDLE_INCLUDES = [".claude-plugin", "CLAUDE.md", "commands", "setup.sh", "skills"]


def _read_version() -> str:
    manifest = PACKAGE_ROOT / ".claude-plugin/plugin.json"
    return json.loads(manifest.read_text())["version"]


def _version_bump() -> None:
    subprocess.run(
        [sys.executable, "scripts/version_bump.py"],
        cwd=PACKAGE_ROOT,
        check=True,
    )


def _detect_mcp_mode(root: Path) -> str:
    local_packages = (
        root / "packages/fetcher/package.json",
        root / "packages/renderer/package.json",
        root / "packages/bullet-embeddings/package.json",
    )
    return "local" if all(path.is_file() for path in local_packages) else "hosted"


def _build_mcp_config(mode: str, root: Path) -> dict[str, object]:
    if mode == "hosted":
        return {
            "mcpServers": {
                "linkedin-fetcher": {
                    "type": "http",
                    "url": os.environ.get("FETCHER_MCP_URL", DEFAULT_FETCHER_URL),
                },
                "oh-my-cv-render": {
                    "type": "http",
                    "url": os.environ.get("RENDERER_MCP_URL", DEFAULT_RENDERER_URL),
                },
                "bullet-embeddings": {
                    "type": "http",
                    "url": os.environ.get("EMBEDDINGS_MCP_URL", DEFAULT_EMBEDDINGS_URL),
                },
            }
        }

    if mode == "container":
        return {
            "mcpServers": {
                "linkedin-fetcher": {
                    "command": "npx",
                    "args": ["-y", "mcp-remote", "http://localhost:3001/mcp", "--allow-http"],
                },
                "oh-my-cv-render": {
                    "command": "npx",
                    "args": ["-y", "mcp-remote", "http://localhost:3002/mcp", "--allow-http"],
                },
                "bullet-embeddings": {
                    "command": "npx",
                    "args": ["-y", "mcp-remote", "http://localhost:3003/mcp", "--allow-http"],
                },
            }
        }

    return {
        "mcpServers": {
            "linkedin-fetcher": {
                "command": "pnpm",
                "args": ["--prefix", str(root / "packages/fetcher"), "--silent", "run", "mcp"],
            },
            "oh-my-cv-render": {
                "command": "pnpm",
                "args": ["--prefix", str(root / "packages/renderer"), "--silent", "run", "mcp"],
            },
            "bullet-embeddings": {
                "command": "pnpm",
                "args": ["--prefix", str(root / "packages/bullet-embeddings"), "--silent", "run", "mcp"],
            },
        }
    }


def _write_zip(version: str, mcp_config: dict) -> Path:
    zip_path = PACKAGE_ROOT / f"{PLUGIN_NAME}-{version}.zip"
    if zip_path.exists():
        zip_path.unlink()

    with ZipFile(zip_path, "w", compression=ZIP_DEFLATED) as archive:
        for entry_name in BUNDLE_INCLUDES:
            entry = PACKAGE_ROOT / entry_name
            if entry.is_file():
                archive.write(entry, entry_name)
            elif entry.is_dir():
                for file_path in sorted(entry.rglob("*")):
                    if file_path.is_dir() or file_path.name == ".DS_Store":
                        continue
                    archive.write(file_path, file_path.relative_to(PACKAGE_ROOT))

        archive.writestr(".mcp.json", json.dumps(mcp_config, indent=2) + "\n")

    return zip_path


def _detect_cowork_plugin_path(session_dir: Path) -> Path | None:
    pattern = str(session_dir / "*" / "*" / "rpm" / "manifest.json")
    for manifest_path in glob.glob(pattern):
        try:
            data = json.loads(Path(manifest_path).read_text())
        except (json.JSONDecodeError, OSError):
            continue
        for plugin in data.get("plugins", []):
            if plugin.get("name") == PLUGIN_NAME:
                rpm_dir = Path(manifest_path).parent
                return rpm_dir / plugin["id"]
    return None


def bundle(args: argparse.Namespace) -> Path:
    _version_bump()
    version = _read_version()
    mcp_mode = os.environ.get("MCP_MODE") or _detect_mcp_mode(REPO_ROOT)
    mcp_config = _build_mcp_config(mcp_mode, REPO_ROOT)
    zip_path = _write_zip(version, mcp_config)
    print(f"Created {zip_path.name} (MCP mode: {mcp_mode})")
    return zip_path


def deploy(args: argparse.Namespace) -> None:
    zip_path = bundle(args)

    session_dir = Path(
        os.environ.get("COWORK_SESSION_DIR") or args.session_dir
    ).expanduser()
    plugin_path = _detect_cowork_plugin_path(session_dir)

    if plugin_path is None:
        print(
            f"{PLUGIN_NAME} not found in any CoWork session.\n"
            "Upload the zip via Claude Desktop UI first, then use deploy for updates.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    if plugin_path.exists():
        shutil.rmtree(plugin_path)
    plugin_path.mkdir(parents=True, exist_ok=True)

    with ZipFile(zip_path) as archive:
        archive.extractall(plugin_path)

    version = _read_version()
    print(f"Deployed {version} \u2192 {plugin_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Claude Desktop plugin packaging")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("bundle", help="Create distributable plugin zip")

    deploy_parser = subparsers.add_parser(
        "deploy", help="Hot-reload plugin into CoWork"
    )
    deploy_parser.add_argument(
        "--session-dir",
        default=str(DEFAULT_SESSION_DIR),
        help="CoWork session directory (default: %(default)s)",
    )

    args = parser.parse_args()
    {"bundle": bundle, "deploy": deploy}[args.command](args)


if __name__ == "__main__":
    main()
