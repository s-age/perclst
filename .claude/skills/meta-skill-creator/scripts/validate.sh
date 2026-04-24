#!/usr/bin/env bash
# Validates a SKILL.md against meta-skill-creator conventions

set -euo pipefail

SKILL_PATH="${1:-}"
if [[ -z "$SKILL_PATH" ]]; then
  echo "Usage: validate.sh <path/to/SKILL.md>" >&2
  exit 1
fi

ERRORS=0
WARNS=0

if [[ ! -f "$SKILL_PATH" ]]; then
  echo "ERROR: File not found: $SKILL_PATH" >&2
  exit 1
fi

# Required frontmatter fields
for field in name description; do
  if ! grep -q "^${field}:" "$SKILL_PATH"; then
    echo "ERROR: Missing frontmatter field: $field"
    ERRORS=$((ERRORS + 1))
  fi
done

# Description length
DESC=$(grep "^description:" "$SKILL_PATH" | head -1 | sed 's/^description: *//')
DESC_LEN=${#DESC}
if [[ $DESC_LEN -gt 250 ]]; then
  echo "ERROR: description is ${DESC_LEN} chars — hard-truncated at 250 in listings"
  ERRORS=$((ERRORS + 1))
elif [[ $DESC_LEN -gt 150 ]]; then
  echo "WARN:  description is ${DESC_LEN} chars — trigger signal should fit in first 150"
  WARNS=$((WARNS + 1))
fi

# Line count
LINE_COUNT=$(wc -l < "$SKILL_PATH")
if [[ $LINE_COUNT -gt 100 ]]; then
  echo "WARN:  SKILL.md is ${LINE_COUNT} lines (target ≤ 100) — move content to supporting files"
  WARNS=$((WARNS + 1))
fi

# No Goal/Purpose/Overview header
if grep -qE "^## (Goal|Purpose|Overview)" "$SKILL_PATH"; then
  echo "ERROR: SKILL.md opens with a Goal/Purpose/Overview section — start with instructions directly"
  ERRORS=$((ERRORS + 1))
fi

# Summary
if [[ $ERRORS -eq 0 && $WARNS -eq 0 ]]; then
  echo "OK: $SKILL_PATH passes all checks"
elif [[ $ERRORS -eq 0 ]]; then
  echo "OK (${WARNS} warning(s)): $SKILL_PATH"
else
  echo "${ERRORS} error(s), ${WARNS} warning(s) in $SKILL_PATH"
  exit 1
fi
