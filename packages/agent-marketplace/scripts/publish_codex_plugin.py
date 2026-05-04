#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = PACKAGE_ROOT.parent.parent
ZIP_NAME = "write-resume-plugin-codex"
DEFAULT_TARGET_PROJECT_ROOT = Path.home() / "Documents/Projects/Career on Autopilot"
DEFAULT_FETCHER_URL = "https://mcp.autopilot.careers/fetcher"
DEFAULT_RENDERER_URL = "https://mcp.autopilot.careers/renderer"
DEFAULT_EMBEDDINGS_URL = "https://mcp.autopilot.careers/bullet-embeddings"
MARKETPLACE_NAME = "autopilot-careers"
PLUGIN_NAME = "write-resume-plugin"
CODEX_CACHE_ROOT = Path.home() / ".codex" / "plugins" / "cache"


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
        "name": MARKETPLACE_NAME,
        "interface": {
            "displayName": "Autopilot Careers"
        },
        "plugins": [
            {
                "name": PLUGIN_NAME,
                "source": {
                    "source": "local",
                    "path": f"./.codex/plugins/{PLUGIN_NAME}"
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

    if mode == "container":
        return {
            "mcpServers": {
                "linkedin-fetcher": {
                    "url": "http://localhost:3001/mcp",
                    "enabled": True,
                },
                "oh-my-cv-render": {
                    "url": "http://localhost:3002/mcp",
                    "enabled": True,
                },
                "bullet-embeddings": {
                    "url": "http://localhost:3003/mcp",
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


def _toml_string(value: str) -> str:
    # TOML basic string: escape backslashes and double quotes.
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _toml_string_array(values: list[str]) -> str:
    return "[" + ", ".join(_toml_string(v) for v in values) + "]"


def render_codex_mcp_toml(mcp_config: dict) -> str:
    """Render `mcpServers` as Codex-compatible `[mcp_servers.<name>]` tables.

    If a server's args begin with `--prefix <path>`, those are lifted into a
    `cwd` field so the resulting TOML matches the clean shape Codex expects
    (command/args/cwd), instead of passing a pnpm-specific --prefix flag.
    """
    servers = mcp_config.get("mcpServers", {}) or {}
    sections: list[str] = []
    for name, spec in servers.items():
        lines = [f"[mcp_servers.{name}]"]
        if "url" in spec:
            lines.append(f'type = "http"')
            lines.append(f"url = {_toml_string(spec['url'])}")
        else:
            command = spec["command"]
            args = list(spec.get("args") or [])
            cwd = spec.get("cwd")
            if not cwd and len(args) >= 2 and args[0] == "--prefix":
                cwd = args[1]
                args = args[2:]
            lines.append(f"command = {_toml_string(command)}")
            lines.append(f"args = {_toml_string_array(args)}")
            if cwd:
                lines.append(f"cwd = {_toml_string(cwd)}")
        sections.append("\n".join(lines))
    return "\n\n".join(sections)


def write_codex_mcp_servers(config_path: Path, mcp_config: dict) -> bool:
    """Install managed `[mcp_servers.<name>]` tables into `.codex/config.toml`.

    Replaces any existing managed entries so the file always reflects the
    current workspace MCP servers. Unrelated sections in config.toml are
    preserved. Returns True if the file content changed.
    """
    managed = set((mcp_config.get("mcpServers") or {}).keys())
    original = config_path.read_text() if config_path.exists() else ""
    lines = original.splitlines()
    kept: list[str] = []
    skip_section = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("[") and stripped.endswith("]"):
            skip_section = False
            prefix = "[mcp_servers."
            if stripped.startswith(prefix):
                name = stripped[len(prefix) : -1]
                skip_section = name in managed
            if not skip_section:
                kept.append(line)
            continue
        if not skip_section:
            kept.append(line)

    while kept and not kept[-1].strip():
        kept.pop()

    rendered = render_codex_mcp_toml(mcp_config)
    parts: list[str] = []
    body = "\n".join(kept).strip("\n")
    if body:
        parts.append(body)
    if rendered:
        parts.append(rendered)
    updated = ("\n\n".join(parts) + "\n") if parts else ""

    if updated != original:
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text(updated)
        return True
    return False


CODEX_CLI = Path("/Applications/Codex.app/Contents/Resources/codex")


def ensure_marketplace_registered(project_root: Path) -> bool:
    """Register the local marketplace with the Codex CLI if not already present.

    The CLI writes a [marketplaces.autopilot-careers] entry to ~/.codex/config.toml
    and populates the plugin cache, so CoWork picks up the latest version on
    next launch. Returns True if the registration ran (idempotent — safe to re-run).
    """
    if not CODEX_CLI.exists():
        return False
    result = subprocess.run(
        [str(CODEX_CLI), "plugin", "marketplace", "add", str(project_root)],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def sync_codex_plugin_cache(plugin_dir: Path) -> Path:
    """Mirror the workspace plugin into Codex's runtime cache.

    Codex Desktop loads the plugin from `~/.codex/plugins/cache/<marketplace>/
    <plugin>/local/` at runtime. When the cached copy drifts from the
    workspace source, the runtime serves stale plugin metadata/MCP config even
    after bumping the workspace version. Refreshing the cache on every publish
    keeps the runtime in lockstep with the workspace without manual rsync.
    """
    cache_dir = CODEX_CACHE_ROOT / MARKETPLACE_NAME / PLUGIN_NAME / "local"
    if cache_dir.exists():
        shutil.rmtree(cache_dir)
    cache_dir.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(plugin_dir, cache_dir)
    return cache_dir


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
    output_dir = target_project_root / ".codex" / "plugins" / PLUGIN_NAME
    marketplace_path = target_project_root / ".agents" / "plugins" / "marketplace.json"
    codex_config_path = target_project_root / ".codex" / "config.toml"
    legacy_plugin_dir = target_project_root / "plugins" / PLUGIN_NAME
    legacy_skills_dir = target_project_root / ".agents" / "skills"
    mcp_config_path = output_dir / ".mcp.json"

    output_dir.parent.mkdir(parents=True, exist_ok=True)
    marketplace_path.parent.mkdir(parents=True, exist_ok=True)

    copy_tree(PACKAGE_ROOT / ".codex-plugin", output_dir / ".codex-plugin")
    copy_tree(PACKAGE_ROOT / "skills", output_dir / "skills")
    shutil.copy2(PACKAGE_ROOT / "setup.sh", output_dir / "setup.sh")
    mcp_config = build_mcp_config(mcp_mode, REPO_ROOT)
    mcp_config_path.write_text(json.dumps(mcp_config, indent=2) + "\n")

    write_marketplace_json(marketplace_path)

    reset_path(legacy_plugin_dir)
    reset_path(legacy_skills_dir)
    mcp_toml_updated = write_codex_mcp_servers(codex_config_path, mcp_config)
    cache_dir = sync_codex_plugin_cache(output_dir)
    marketplace_registered = ensure_marketplace_registered(target_project_root)

    zip_path = write_zip(output_dir, version)

    print(f"Published Codex plugin to {output_dir}")
    print(f"Wrote {mcp_config_path} (mode: {mcp_mode})")
    print(f"Updated {marketplace_path}")
    print(f"Removed legacy path {legacy_plugin_dir}")
    print(f"Removed legacy path {legacy_skills_dir}")
    if mcp_toml_updated:
        print(f"Updated MCP server tables in {codex_config_path}")
    print(f"Synced Codex runtime cache at {cache_dir}")
    if marketplace_registered:
        print(f"Registered marketplace autopilot-careers in ~/.codex/config.toml")
    print(f"Created {zip_path}")


if __name__ == "__main__":
    main()
