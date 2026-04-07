#!/usr/bin/env python3

from __future__ import annotations

import hashlib
import json
import pathlib
import re


PACKAGE_ROOT = pathlib.Path(__file__).resolve().parent.parent
CHECKSUM_PATH = PACKAGE_ROOT / ".plugin-checksum"


def iter_content_files() -> list[pathlib.Path]:
    files = [PACKAGE_ROOT / relative for relative in ("CLAUDE.md", "setup.sh")]
    files.extend((PACKAGE_ROOT / ".claude-plugin").glob("**/*"))
    files.extend((PACKAGE_ROOT / ".codex-plugin").glob("**/*"))
    for pattern in ("commands/**/*", "skills/**/*"):
        files.extend(PACKAGE_ROOT.glob(pattern))
    return sorted(set(files))


def content_checksum() -> str:
    digest = hashlib.sha256()
    for file_path in iter_content_files():
        if not file_path.is_file() or file_path.name == ".DS_Store":
            continue
        content = file_path.read_bytes()
        if file_path.name in ("plugin.json", "SKILL.md"):
            content = re.sub(rb'version[\":\s]+[\d.]+', b"", content)
        digest.update(str(file_path.relative_to(PACKAGE_ROOT)).encode())
        digest.update(content)
    return digest.hexdigest()[:16]


def bump_version() -> None:
    checksum = content_checksum()
    if CHECKSUM_PATH.exists() and CHECKSUM_PATH.read_text().strip() == checksum:
        print("No content changes detected")
        return

    claude_manifest_path = PACKAGE_ROOT / ".claude-plugin/plugin.json"
    claude_manifest = json.loads(claude_manifest_path.read_text())
    old_version = claude_manifest["version"]
    parts = [int(part) for part in old_version.split(".")]
    parts[2] += 1
    new_version = ".".join(map(str, parts))
    claude_manifest["version"] = new_version
    claude_manifest_path.write_text(json.dumps(claude_manifest, indent=2) + "\n")

    codex_manifest_path = PACKAGE_ROOT / ".codex-plugin/plugin.json"
    codex_manifest = json.loads(codex_manifest_path.read_text())
    codex_manifest["version"] = new_version
    codex_manifest_path.write_text(json.dumps(codex_manifest, indent=2) + "\n")

    package_json_path = PACKAGE_ROOT / "package.json"
    package_json = json.loads(package_json_path.read_text())
    package_json["version"] = new_version
    package_json_path.write_text(json.dumps(package_json, indent=2) + "\n")

    skill_path = PACKAGE_ROOT / "skills/write-resume/SKILL.md"
    skill_text = skill_path.read_text()
    skill_text = re.sub(r"(version:\s*)[\d.]+", rf"\g<1>{new_version}", skill_text, count=1)
    skill_path.write_text(skill_text)

    CHECKSUM_PATH.write_text(checksum + "\n")
    print(f"Bumped {old_version} -> {new_version}")


if __name__ == "__main__":
    bump_version()
