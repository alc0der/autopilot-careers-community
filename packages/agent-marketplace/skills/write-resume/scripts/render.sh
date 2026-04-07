#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="./base.yaml"
CONTACT="./contact.yaml"
[[ -f "$BASE" ]]    || { echo "Error: $BASE not found in $(pwd). Is the project directory assigned?" >&2; exit 1; }
[[ -f "$CONTACT" ]] || { echo "Error: $CONTACT not found in $(pwd). Is the project directory assigned?" >&2; exit 1; }
TEMPLATE="${SCRIPT_DIR}/../references/template.md"
AI_DATA="${1:?Usage: $0 <ai.yaml> [output.md]}"
OUTPUT="${2:-}"

# ── Resolve mustache binary from vendor or fallback location ────────────
# First try vendor/bin within plugin root, then fall back to ~/.local/share
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
if [[ -x "${PLUGIN_ROOT}/vendor/bin/mustache" ]]; then
  MUSTACHE="${PLUGIN_ROOT}/vendor/bin/mustache"
elif [[ -x "${HOME}/.local/share/write-resume-plugin/vendor/bin/mustache" ]]; then
  MUSTACHE="${HOME}/.local/share/write-resume-plugin/vendor/bin/mustache"
elif command -v mustache &>/dev/null; then
  MUSTACHE="mustache"
else
  echo "Error: mustache binary not found. Run setup.sh first." >&2
  exit 1
fi

# Create temp files for mustache processing
# TMP_DIR is provided by the plugin config (via environment variable)
TEMP_DIR="${TMP_DIR:-.}"
mkdir -p "$TEMP_DIR"

TEMP_TEMPLATE="${TEMP_DIR}/.render_template_$$.tmp"
TEMP_DATA="${TEMP_DIR}/.render_data_$$.tmp"
trap "rm -f '$TEMP_TEMPLATE' '$TEMP_DATA'" EXIT

cat "$TEMPLATE" > "$TEMP_TEMPLATE"

# Helper function: convert YAML to JSON using Python + PyYAML.
# PyYAML is always pre-installed in the Claude sandbox VM.
yaml_to_json() {
  python3 -c "import sys, yaml, json; json.dump(yaml.safe_load(open(sys.argv[1])), sys.stdout)" "$1"
}

# Merge YAML files using Python + jq: base + contact + ai
# Derive phone_link by stripping everything except + and digits
# Calculate years_experience from earliest job start_date
{
  yaml_to_json "$BASE"
  yaml_to_json "$CONTACT"
  yaml_to_json "$AI_DATA"
} | jq -s '
  .[0] as $base | .[1] as $contact | .[2] as $ai |
  ($contact.phone // "" | gsub("[^+0-9]"; "")) as $phone_link |
  (now | strftime("%Y") | tonumber) as $current_year |
  ([$base.jobs[].start_date | if test("/") then split("/")[1] else . end | tonumber] | min) as $first_year |
  ($current_year - $first_year) as $years_experience |
  $contact * {
    phone_link: $phone_link,
    years_experience: ($years_experience | tostring),
    jobs: (
      $base.jobs | map(. as $job |
        ($ai.jobs // [] | map(select(.id == $job.id)) | .[0] // {}) as $m |
        . * $m
      )
    ),
    education: ($base.education // []),
    skill_groups: (
      $base.skill_groups | map(. as $group |
        ($ai.skill_groups // [] | map(select(.category == $group.category)) | .[0] // {}) as $m |
        . * $m
      )
    )
  }
' > "$TEMP_DATA"

# Render entire template with mustache (Go mustache CLI: mustache data.json template.mustache)
RESULT=$("$MUSTACHE" "$TEMP_DATA" "$TEMP_TEMPLATE")

if [ -n "$OUTPUT" ]; then
  echo "$RESULT" > "$OUTPUT"
  echo "Resume written to: $OUTPUT" >&2
else
  echo "$RESULT"
fi
