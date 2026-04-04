#!/usr/bin/env bats

setup() {
  load helpers
}

# ─── Vale Rule: BoldAsHeading ────────────────────────────────────────

@test "BoldAsHeading: detects standalone bold lines" {
  count=$(count_warnings "Resume.BoldAsHeading" "$FIXTURES_DIR/bold_headings.md")
  [ "$count" -ge 4 ]
}

@test "BoldAsHeading: ignores inline bold (metadata, mid-sentence)" {
  count=$(count_warnings "Resume.BoldAsHeading" "$FIXTURES_DIR/inline_bold.md")
  [ "$count" -eq 0 ]
}

# ─── Vale Rule: NonStandardList ──────────────────────────────────────

@test "NonStandardList: detects unicode bullets and dashes" {
  count=$(count_warnings "Resume.NonStandardList" "$FIXTURES_DIR/nonstandard_bullets.md")
  # •, ●, –, ‣ = 4 unicode markers
  [ "$count" -ge 4 ]
}

@test "NonStandardList: detects parenthesized numbers and letters" {
  # 1), 2), a), b) = 4 markers
  count=$(count_warnings "Resume.NonStandardList" "$FIXTURES_DIR/nonstandard_bullets.md")
  # Total: 4 unicode + 4 parenthesized = 8
  [ "$count" -ge 8 ]
}

@test "NonStandardList: ignores standard markdown bullets" {
  count=$(count_warnings "Resume.NonStandardList" "$FIXTURES_DIR/standard_bullets.md")
  [ "$count" -eq 0 ]
}

# ─── Regression: linted files pass Vale clean ────────────────────────

@test "normalized Careem JD: zero Resume.* warnings" {
  file="$JD_DIR/20260324_Careem_Staff Software Engineer I_JD.md"
  [ -f "$file" ] || skip "file not found"
  count=$(count_resume_warnings "$file")
  [ "$count" -eq 0 ]
}

@test "normalized Orbis JD: zero Resume.* warnings" {
  file="$JD_DIR/20260324_Orbis Group_Staff Software Engineer_JD.md"
  [ -f "$file" ] || skip "file not found"
  count=$(count_resume_warnings "$file")
  [ "$count" -eq 0 ]
}

@test "normalized Pay10 JD: zero Resume.* warnings" {
  file="$JD_DIR/20260327_Pay10_Fullstack_Developer_JD.md"
  [ -f "$file" ] || skip "file not found"
  count=$(count_resume_warnings "$file")
  [ "$count" -eq 0 ]
}

@test "normalized Unknown Company JD: zero Resume.* warnings" {
  file="$JD_DIR/20260324_Unknown Company_Software Engineer III_JD.md"
  [ -f "$file" ] || skip "file not found"
  count=$(count_resume_warnings "$file")
  [ "$count" -eq 0 ]
}

# ─── Regression: raw files have issues Vale catches ──────────────────

@test "most raw JDs have at least one Resume.* warning" {
  total=0
  with_warnings=0
  for raw in "$JD_DIR"/*_JD_Raw.md; do
    [ -f "$raw" ] || continue
    total=$((total + 1))
    count=$(count_resume_warnings "$raw")
    if [ "$count" -gt 0 ]; then
      with_warnings=$((with_warnings + 1))
    fi
  done
  # at least 85% of raw files should have Resume.* warnings
  threshold=$(( total * 85 / 100 ))
  [ "$with_warnings" -ge "$threshold" ]
}

# ─── Frontmatter: linted files track their source ────────────────────

@test "normalized files with rel:raw point to an existing raw file" {
  failures=""
  checked=0
  for linted in "$JD_DIR"/*_JD.md; do
    [[ "$linted" == *_Raw* ]] && continue
    [[ "$linted" == *_Cover* ]] && continue
    [ -f "$linted" ] || continue

    raw_ref=$(grep -m1 '^rel:raw:' "$linted" | sed 's/^rel:raw: *//' || true)
    [ -z "$raw_ref" ] && continue  # skip files without rel:raw

    checked=$((checked + 1))
    if [ ! -f "$JD_DIR/$raw_ref" ]; then
      failures="$failures\n  $(basename "$linted"): rel:raw '$raw_ref' not found"
    fi
  done
  # at least one linted file must have rel:raw
  [ "$checked" -gt 0 ]
  [ -z "$failures" ]
}
