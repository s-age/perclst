# Pipeline File Naming Convention and Done Directory

**Type:** Discovery

## Context

Applies whenever adding, running, or organising pipeline JSON files in the
`pipelines/` directory. The naming scheme drives both human readability and the
automated file-move behaviour that triggers after a successful `perclst run`.

## What is true

**Naming convention**

Pipeline filenames use `__` (double underscore) as the namespace separator and
`-` (hyphen) as the word separator within each segment:

```
<ns1>__<ns2>__<name>.json
unit-test__infrastructures__commandrunner-projectroot.json
```

The double-underscore is unambiguous — a single hyphen cannot distinguish a
namespace boundary from a word boundary within a segment.

**Done directory**

After `perclst run` completes successfully, the pipeline file is moved to
`pipelines/done/` with namespace segments converted to subdirectories:

```
unit-test__infrastructures__commandrunner-projectroot.json
  => done/unit-test/infrastructures/commandrunner-projectroot.json
```

Files with no namespace segments move flat: `no-namespace.json` → `done/no-namespace.json`.

**Layer responsibilities**

- Namespace→directory conversion lives in `FileMoveRepository` (repository layer):
  it is a format translation, not a raw filesystem operation.
- The infrastructure layer (`fileMove.ts`) only performs `mkdirSync` + `renameSync`.
- `runCommand` (CLI layer) calls `moveToDone` via `PipelineFileService` from DI —
  no `fs` imports in the CLI layer.

## Do

- Name new pipeline files with `__` between namespace segments and `-` within segments.
- Add namespace prefixes to group related pipelines (e.g. `unit-test__`, `e2e__`).

## Don't

- Use a single `-` as a namespace separator — it is ambiguous and breaks the
  mechanical directory conversion.
- Perform `mkdirSync` / `renameSync` directly in the CLI or service layer.

---

**Keywords:** pipeline, naming convention, done directory, namespace separator, FileMoveRepository, moveToDone, double underscore
