#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# setup.sh — bootstrap script for write-resume-plugin
# Idempotent: safe to run multiple times; skips steps already completed.
# ---------------------------------------------------------------------------

# ── Resolve PLUGIN_ROOT relative to this script's location ────────────────
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Color helpers ─────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

ok()   { printf "${GREEN}✔${RESET}  %s\n" "$*"; }
err()  { printf "${RED}✘  %s${RESET}\n" "$*" >&2; }
info() { printf "${CYAN}→${RESET}  %s\n" "$*"; }

# ── 1. Detect OS / arch ──────────────────────────────────────────────────
KERNEL="$(uname -s)"
MACHINE="$(uname -m)"

case "$KERNEL" in
  Darwin) OS="darwin" ;;
  Linux)  OS="linux"  ;;
  *)      err "Unsupported OS: $KERNEL"; exit 1 ;;
esac

case "$MACHINE" in
  x86_64)  ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *)       err "Unsupported architecture: $MACHINE"; exit 1 ;;
esac

ok "Detected platform: ${OS}/${ARCH}"

# ── 2. Check Vale (optional) ──────────────────────────────────────────────
# Vale is only needed for prose linting. Core resume rendering works without it.
if ! command -v vale &>/dev/null; then
  printf "${CYAN}→${RESET}  Vale is not installed (optional for prose linting)\n"
  printf "${CYAN}→${RESET}  To enable linting, install Vale via: brew install vale\n"
else
  ok "Vale $(vale --version) detected"
fi

# ── 3. Check Python + PyYAML ──────────────────────────────────────────────
# render.sh uses python3 + PyYAML to convert YAML→JSON (replaces yq).
if ! python3 -c "import yaml" &>/dev/null; then
  err "python3 with PyYAML is required but not found."
  err "Install PyYAML: pip install pyyaml  (or: brew install python3)"
  exit 1
fi
ok "python3 + PyYAML detected"

# ── 4. Vendor binaries ───────────────────────────────────────────────────
# Try to use plugin root; fall back to ~/.local/share if not writable
VENDOR_BIN="${PLUGIN_ROOT}/vendor/bin"
if ! mkdir -p "$VENDOR_BIN" 2>/dev/null; then
  info "PLUGIN_ROOT is not writable, using fallback location"
  VENDOR_BIN="${HOME}/.local/share/write-resume-plugin/vendor/bin"
  mkdir -p "$VENDOR_BIN"
  ok "Using fallback vendor directory: $VENDOR_BIN"
fi

# Helper: resolve the "latest" tag URL for a GitHub repo via the API redirect.
gh_latest_tag() {
  local repo="$1"
  curl -fsSL -o /dev/null -w '%{url_effective}' \
    "https://github.com/${repo}/releases/latest" | awk -F/ '{print $NF}'
}

# ── 5. Download static binaries into vendor/bin/ ──────────────────────────

# ── jq ────────────────────────────────────────────────────────────────────
if [[ -x "${VENDOR_BIN}/jq" ]]; then
  ok "jq already present"
else
  JQ_TAG="$(gh_latest_tag jqlang/jq)"
  # jq uses "macos" instead of "darwin" in its release asset names
  case "$OS" in
    darwin) JQ_OS="macos" ;;
    *)      JQ_OS="$OS"   ;;
  esac
  JQ_URL="https://github.com/jqlang/jq/releases/download/${JQ_TAG}/jq-${JQ_OS}-${ARCH}"
  info "Downloading jq ${JQ_TAG}…"
  curl -fsSL -o "${VENDOR_BIN}/jq" "$JQ_URL"
  ok "Downloaded jq ${JQ_TAG}"
fi

# ── mustache ──────────────────────────────────────────────────────────────
MUSTACHE_VERSION="1.4.0"
if [[ -x "${VENDOR_BIN}/mustache" ]]; then
  ok "mustache already present"
else
  MUSTACHE_TARBALL="mustache_${MUSTACHE_VERSION}_${OS}_${ARCH}.tar.gz"
  MUSTACHE_URL="https://github.com/cbroglie/mustache/releases/download/v${MUSTACHE_VERSION}/${MUSTACHE_TARBALL}"
  info "Downloading mustache v${MUSTACHE_VERSION}…"
  # TMP_DIR is provided by the plugin config (via environment variable)
  DL_DIR="${TMP_DIR:-${VENDOR_BIN}}"
  mkdir -p "$DL_DIR"
  curl -fsSL -o "${DL_DIR}/${MUSTACHE_TARBALL}" "$MUSTACHE_URL"
  tar -xzf "${DL_DIR}/${MUSTACHE_TARBALL}" -C "${VENDOR_BIN}" mustache
  rm -f "${DL_DIR}/${MUSTACHE_TARBALL}"
  ok "Downloaded mustache v${MUSTACHE_VERSION}"
fi

# ── 6. Make all binaries executable ────────────────────────────────────────
chmod +x "${VENDOR_BIN}/jq" "${VENDOR_BIN}/mustache"
ok "All vendor binaries are executable"

# ── 7. Print summary ──────────────────────────────────────────────────────
echo ""
info "Setup complete — tool versions:"
echo "  python3   : $(python3 --version 2>&1)"
echo "  jq        : $("${VENDOR_BIN}/jq" --version 2>&1 | head -1)"
echo "  mustache  : $("${VENDOR_BIN}/mustache" --version 2>&1 | head -1)"
echo ""
ok "write-resume-plugin is ready!"
