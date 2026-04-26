# Shell Scripts Check Session Existence via `perclst show`

**Type:** Discovery

## Context

Pipeline check scripts (`.claude/skills/meta-pipeline-creator/scripts/`) need to verify
whether a named session already exists before running. Session store logic lives in
TypeScript (`SessionRepository.findByName`), not in shell.

## What happened / What is true

Shell scripts delegate session existence checks to `perclst show <name>` and inspect the
exit code:
- Exit 0 → session found
- Exit 1 → session not found

This keeps a single source of truth in `SessionRepository.findByName` and avoids
reimplementing session store logic in bash.

**Overhead tradeoff**: `perclst show` also invokes `analyzeService.analyze()`, which parses
the full conversation turn history. This is heavier than a pure existence check but
acceptable for pre-pipeline validation (infrequent, not in a hot path).

If this becomes a bottleneck, the natural extension is a `--exists` flag on `show` that
skips turn analysis.

## Do

- Use `perclst show <name>` in shell scripts to test session existence via exit code
- See `check-session-name.sh` in `.claude/skills/meta-pipeline-creator/scripts/` for the
  reference implementation

## Don't

- Don't reimplement session store access in bash — creates a second source of truth
- Don't treat `perclst show` as a lightweight probe; it parses the full turn history

---

**Keywords:** perclst show, session existence, shell script, exit code, SessionRepository, pipeline, bash, findByName, check-session-name
