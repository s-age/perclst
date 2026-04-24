# Hardcoded Directory Lists in SKILL.md Go Stale

**Type:** Discovery

## Context

Applies when writing or reviewing a SKILL.md that references filesystem directories by
name (e.g. "Current directories: agent/, config/, services/…"). The list is accurate at
the moment of writing but becomes wrong as soon as directories are added or removed.

## What happened / What is true

A meta-librarian SKILL.md contained a static list of `knowledge/` subdirectories:
`agent/`, `config/`, `services/`, etc. The list was already incorrect when read — `config/`
and `services/` did not exist, while `claude-cli/`, `git/`, `javascript/`, `security/`,
`testing/`, `validation/`, and others were missing entirely.

The same drift risk applies to any SKILL.md that embeds a snapshot of directory structure,
file names, or enum values that are maintained outside the skill file itself.

## Do

- Replace static directory lists with a shell command that reads current state at runtime:
  `Run \`ls knowledge/\` to see current subdirectories.`
- Apply the same pattern to any enumeration of filesystem paths in a skill file.

## Don't

- Don't embed a list of existing directories directly in a SKILL.md.
- Don't rely on stale snapshots to guide file placement decisions.

---

**Keywords:** SKILL.md, hardcoded, directory list, stale, meta-librarian, file placement, dynamic discovery
