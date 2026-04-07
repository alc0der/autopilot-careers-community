#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = PACKAGE_ROOT.parent.parent
ZIP_NAME = "write-resume-plugin-codex"
DEFAULT_TARGET_PROJECT_ROOT = Path.home() / "Documents/Projects/Career on Autopilot"
DEFAULT_FETCHER_URL = "https://mcp.alc0der.dev/fetcher"
DEFAULT_RENDERER_URL = "https://mcp.alc0der.dev/renderer"
DEFAULT_EMBEDDINGS_URL = "https://mcp.alc0der.dev/bullet-embeddings"


def copy_tree(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def write_zip(source_dir: Path, version: str) -> Path:
    zip_path = PACKAGE_ROOT / f"{ZIP_NAME}-{version}.zip"
    if zip_path.exists():
        zip_path.unlink()

    with ZipFile(zip_path, "w", compression=ZIP_DEFLATED) as archive:
        for file_path in sorted(source_dir.rglob("*")):
            if file_path.is_dir():
                continue
            archive.write(file_path, file_path.relative_to(source_dir))

    return zip_path


def write_marketplace_json(path: Path) -> None:
    payload = {
        "name": "autopilot-careers",
        "interface": {
            "displayName": "Autopilot Careers"
        },
        "plugins": [
            {
                "name": "write-resume-plugin",
                "source": {
                    "source": "local",
                    "path": "./.codex/plugins/write-resume-plugin"
                },
                "policy": {
                    "installation": "AVAILABLE",
                    "authentication": "ON_INSTALL"
                },
                "category": "Productivity"
            }
        ]
    }
    path.write_text(json.dumps(payload, indent=2) + "\n")


def detect_mcp_mode(root: Path) -> str:
    local_packages = (
        root / "packages/fetcher/package.json",
        root / "packages/renderer/package.json",
        root / "packages/bullet-embeddings/package.json",
    )
    return "local" if all(path.is_file() for path in local_packages) else "hosted"


def build_mcp_config(mode: str, root: Path) -> dict[str, object]:
    if mode == "hosted":
        return {
            "mcpServers": {
                "linkedin-fetcher": {
                    "url": os.environ.get("FETCHER_MCP_URL", DEFAULT_FETCHER_URL),
                    "enabled": True,
                },
                "oh-my-cv-render": {
                    "url": os.environ.get("RENDERER_MCP_URL", DEFAULT_RENDERER_URL),
                    "enabled": True,
                },
                "bullet-embeddings": {
                    "url": os.environ.get("EMBEDDINGS_MCP_URL", DEFAULT_EMBEDDINGS_URL),
                    "enabled": True,
                },
            }
        }

    return {
        "mcpServers": {
            "linkedin-fetcher": {
                "command": "pnpm",
                "args": ["--prefix", str(root / "packages/fetcher"), "--silent", "run", "mcp"],
                "enabled": True,
            },
            "oh-my-cv-render": {
                "command": "pnpm",
                "args": ["--prefix", str(root / "packages/renderer"), "--silent", "run", "mcp"],
                "enabled": True,
            },
            "bullet-embeddings": {
                "command": "pnpm",
                "args": ["--prefix", str(root / "packages/bullet-embeddings"), "--silent", "run", "mcp"],
                "enabled": True,
            },
        }
    }


def clear_legacy_codex_mcp(config_path: Path) -> bool:
    if not config_path.exists():
        return False

    managed = {"linkedin-fetcher", "oh-my-cv-render", "bullet-embeddings"}
    lines = config_path.read_text().splitlines()
    kept: list[str] = []
    current_section: str | None = None
    skip_section = False

    for line in lines:
        if line.startswith("[") and line.endswith("]"):
            current_section = None
            skip_section = False
            prefix = "[mcp_servers."
            if line.startswith(prefix):
                current_section = line[len(prefix) : -1]
                skip_section = current_section in managed
            if not skip_section:
                kept.append(line)
            continue

        if not skip_section:
            kept.append(line)

    updated_lines = list(kept)
    while updated_lines and not updated_lines[0].strip():
        updated_lines.pop(0)
    while updated_lines and not updated_lines[-1].strip():
        updated_lines.pop()

    normalized: list[str] = []
    previous_blank = False
    for line in updated_lines:
        is_blank = not line.strip()
        if is_blank and previous_blank:
            continue
        normalized.append(line)
        previous_blank = is_blank

    updated = "\n".join(normalized)
    original = "\n".join(lines)
    config_path.write_text((updated + "\n") if updated else "")
    return original != updated


def reset_path(path: Path) -> None:
    if path.is_symlink() or path.is_file():
        path.unlink()
    elif path.exists():
        shutil.rmtree(path)


def main() -> None:
    manifest_path = PACKAGE_ROOT / ".codex-plugin" / "plugin.json"
    manifest = json.loads(manifest_path.read_text())
    version = manifest["version"]
    target_project_root = Path(
        os.environ.get("TARGET_PROJECT_ROOT") or os.environ.get("CAREER_PROJECT_ROOT") or DEFAULT_TARGET_PROJECT_ROOT
    ).expanduser()
    mcp_mode = os.environ.get("MCP_MODE") or detect_mcp_mode(REPO_ROOT)
    output_dir = target_project_root / ".codex" / "plugins" / "write-resume-plugin"
    marketplace_path = target_project_root / ".agents" / "plugins" / "marketplace.json"
    codex_config_path = target_project_root / ".codex" / "config.toml"
    legacy_plugin_dir = target_project_root / "plugins" / "write-resume-plugin"
    legacy_skills_dir = target_project_root / ".agents" / "skills"
    mcp_config_path = output_dir / ".mcp.json"

    output_dir.parent.mkdir(parents=True, exist_ok=True)
    marketplace_path.parent.mkdir(parents=True, exist_ok=True)

    copy_tree(PACKAGE_ROOT / ".codex-plugin", output_dir / ".codex-plugin")
    copy_tree(PACKAGE_ROOT / "skills", output_dir / "skills")
    shutil.copy2(PACKAGE_ROOT / "setup.sh", output_dir / "setup.sh")
    mcp_config_path.write_text(json.dumps(build_mcp_config(mcp_mode, REPO_ROOT), indent=2) + "\n")

    write_marketplace_json(marketplace_path)

    reset_path(legacy_plugin_dir)
    reset_path(legacy_skills_dir)
    removed_legacy_mcp = clear_legacy_codex_mcp(codex_config_path)

    zip_path = write_zip(output_dir, version)

    print(f"Published Codex plugin to {output_dir}")
    print(f"Wrote {mcp_config_path} (mode: {mcp_mode})")
    print(f"Updated {marketplace_path}")
    print(f"Removed legacy path {legacy_plugin_dir}")
    print(f"Removed legacy path {legacy_skills_dir}")
    if removed_legacy_mcp:
        print(f"Removed legacy MCP server entries from {codex_config_path}")
    print(f"Created {zip_path}")


if __name__ == "__main__":
    main()
