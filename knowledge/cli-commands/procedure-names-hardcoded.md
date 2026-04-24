# Procedure Names Are Hardcoded in CLI Command Files

**Type:** Problem

## Context

Several CLI commands wrap built-in procedures and hardcode their procedure name as a
string literal in TypeScript source. When procedures are renamed or moved into
subdirectories, these string literals must be updated manually — they are not caught
by file-path searches or `--procedure` flag grep patterns.

## What happened / What is true

- Searching for `procedures/` path references or `--procedure` flag usage in docs
  does not find bare string literals like `procedure: 'code-inspect/inspect'` in TypeScript.
- Each command file that wraps a built-in procedure hardcodes exactly one procedure name:

  | Command file | Hardcoded procedure |
  |:---|:---|
  | `curate.ts` | `meta-librarian/curate` |
  | `inspect.ts` | `code-inspect/inspect` |
  | `retrieve.ts` | `meta-knowledge-concierge/retrieve` |
  | `survey.ts` | `code-base-survey/survey`, `code-base-survey/refresh` |

## Do

- After renaming or moving any procedure, search for its old name as a string literal:
  ```bash
  grep -rn "procedure: '" src/cli/commands/
  ```
- Update all matching command files before merging the rename.

## Don't

- Don't assume a procedure rename is complete after updating docs and `procedures/` paths alone.
- Don't search only for `--procedure` flag references — CLI wrapper commands embed the name
  in source code, not in flag arguments.

---

**Keywords:** procedure, rename, hardcoded, cli, string literal, curate, inspect, retrieve, survey, grep
