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
PLUGIN_NAME = "write-resume-plugin"
DEFAULT_SESSION_DIR = Path.home() / "Library/Application Support/Claude/local-agent-mode-sessions"

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


def _write_zip(version: str) -> Path:
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
    zip_path = _write_zip(version)
    print(f"Created {zip_path.name}")
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
