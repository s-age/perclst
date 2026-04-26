# Rename: max_turns → max_messages (and related identifiers)

**Type:** Problem

## Context

The entire `turns`-based naming was replaced with `messages`-based naming across the
codebase. Anyone upgrading from an older perclst version, or reading old config/pipeline
files, will encounter the old names and must migrate them.

## What happened / What is true

All of the following were renamed:

| Old name | New name |
|---|---|
| `turns_total` | `messages_total` |
| `max_turns` | `max_messages` |
| `--max-turns` (CLI flag) | `--max-messages` |
| `limits.max_turns` (config key) | `limits.max_messages` |
| pipeline YAML `max_turns` on agent tasks | `max_messages` |

The rename reflects that the metric counts API messages, not conversational turns
(see `agent/messages-total-semantics.md` for the exact counting rules).

## Do

- Use `max_messages` / `--max-messages` / `messages_total` in all new code and config
- Update existing `.perclst/config.json` files: change `limits.max_turns` → `limits.max_messages`
- Update pipeline YAML: change `max_turns` → `max_messages` on every agent task entry

## Don't

- Don't use `max_turns`, `turns_total`, or `--max-turns` anywhere — they no longer exist
- Don't leave old config files unmodified; the field will be silently ignored or cause errors

---

**Keywords:** max_turns, max_messages, turns_total, messages_total, rename, migration, config, pipeline, CLI flag, --max-turns, --max-messages
