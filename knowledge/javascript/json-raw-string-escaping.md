# Escaped Quotes in Raw JSON Files Must Be Matched with Backslashes in JS Search Strings

**Type:** Problem

## Context

When a Node.js/TypeScript script reads a JSON file as a raw string and performs a
`string.replace()` or `.includes()` search for a substring that contains double quotes,
the on-disk representation of those quotes is `\"` (backslash-escaped), not `"`.
This matters any time you patch a JSON config file by string manipulation rather than
`JSON.parse` + `JSON.stringify`.

## What happened / What is true

- A JSON file stored on disk contains: `"$CLAUDE_PROJECT_DIR"/hooks/skill-inject.mjs`
  serialized as `\"$CLAUDE_PROJECT_DIR\"/hooks/skill-inject.mjs` inside the JSON string value.
- Searching with `'"$CLAUDE_PROJECT_DIR"/hooks/skill-inject.mjs'` fails — no match.
- Searching with `'\\"$CLAUDE_PROJECT_DIR\\"/hooks/skill-inject.mjs'` succeeds.

## Do

- When matching substrings inside a raw JSON file, escape the double quotes as `\\"` in
  the JS search string.
- Prefer `JSON.parse` → mutate object → `JSON.stringify` for JSON patching to avoid
  escaping issues entirely.

## Don't

- Don't assume the in-memory JS string representation of a JSON value matches what is
  stored on disk character-for-character when the value itself contains quotes.

---

**Keywords:** JSON escaping, raw string replacement, double quotes, backslash, string.replace, JSON patch, settings.json
