#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
ZIP_NAME = "write-resume-plugin-codex"
DEFAULT_TARGET_PROJECT_ROOT = Path.home() / "Documents/Projects/Career on Autopilot"


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
    output_dir = target_project_root / ".codex" / "plugins" / "write-resume-plugin"
    marketplace_path = target_project_root / ".agents" / "plugins" / "marketplace.json"
    legacy_plugin_dir = target_project_root / "plugins" / "write-resume-plugin"
    legacy_skills_dir = target_project_root / ".agents" / "skills"

    output_dir.parent.mkdir(parents=True, exist_ok=True)
    marketplace_path.parent.mkdir(parents=True, exist_ok=True)

    copy_tree(PACKAGE_ROOT / ".codex-plugin", output_dir / ".codex-plugin")
    copy_tree(PACKAGE_ROOT / "skills", output_dir / "skills")
    shutil.copy2(PACKAGE_ROOT / "setup.sh", output_dir / "setup.sh")

    write_marketplace_json(marketplace_path)

    reset_path(legacy_plugin_dir)
    reset_path(legacy_skills_dir)

    zip_path = write_zip(output_dir, version)

    print(f"Published Codex plugin to {output_dir}")
    print(f"Updated {marketplace_path}")
    print(f"Removed legacy path {legacy_plugin_dir}")
    print(f"Removed legacy path {legacy_skills_dir}")
    print(f"Created {zip_path}")


if __name__ == "__main__":
    main()
