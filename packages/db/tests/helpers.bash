#!/usr/bin/env bash

VALE_CONFIG="/Users/alc0der/code/alc0der/ai-skills/write-resume-plugin/skills/write-resume/.vale.ini"
FIXTURES_DIR="$BATS_TEST_DIRNAME/fixtures"
JD_DIR="$BATS_TEST_DIRNAME/../job-descriptions"

# Count Vale warnings for a specific check name in a file
# Usage: count_warnings "Resume.BoldAsHeading" "path/to/file.md"
count_warnings() {
  local check="$1"
  local file="$2"
  vale --config "$VALE_CONFIG" --output JSON "$file" 2>/dev/null \
    | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(sum(1 for f in data.values() for i in f if i['Check'] == '$check'))
"
}

# Count all Resume.* warnings in a file
# Usage: count_resume_warnings "path/to/file.md"
count_resume_warnings() {
  local file="$1"
  vale --config "$VALE_CONFIG" --output JSON "$file" 2>/dev/null \
    | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(sum(1 for f in data.values() for i in f if i['Check'].startswith('Resume.')))
"
}
