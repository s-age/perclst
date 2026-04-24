# Procedure Names Are Hardcoded in CLI Commands

**Type:** Gotcha

## What happened

When reorganizing `procedures/` into subdirectories, the CLI commands that hardcode
procedure names (`inspect.ts`, `retrieve.ts`, `survey.ts`, `curate.ts`) were not
updated in the initial pass. The grep searched for `procedures/` path references and
`--procedure` flag usage in docs, but missed bare string literals like
`procedure: 'code-inspect/inspect'` inside TypeScript source.

## Rule

When renaming or moving a procedure, also search for its bare name as a string literal
in `src/`:

```bash
grep -rn "procedure: '" src/cli/commands/
```

The CLI commands that wrap built-in procedures each hardcode one procedure name —
these are the definitive list:

| Command file | Procedure |
|:---|:---|
| `curate.ts` | `meta-librarian/curate` |
| `inspect.ts` | `code-inspect/inspect` |
| `retrieve.ts` | `meta-knowledge-concierge/retrieve` |
| `survey.ts` | `code-base-survey/survey`, `code-base-survey/refresh` |

---

**Keywords:** procedure, rename, hardcoded, cli, inspect, curate, retrieve, survey, string literal
