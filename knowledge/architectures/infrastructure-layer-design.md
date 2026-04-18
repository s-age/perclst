# Infrastructure Layer Design Boundaries

**Type:** Discovery

## Context

Applies when designing or refactoring modules in a layered architecture (infrastructure →
repository → domain). Violations are common when adding error-filtering or output-parsing
logic to files that are nominally "just runners."

## What happened / What is true

During the `commandRunner` refactor, three layer-boundary violations were found and corrected:

- **Tool-specific error patterns belong in the repository layer, not infrastructure.**
  `ERROR_IGNORE_PATTERNS` (e.g. filtering out rollup noise from tsc output) encodes
  knowledge about a specific tool's output format. Infrastructure should do mechanical
  I/O transformation only; semantic interpretation lives in the repository layer.

- **Output parsing is a repository concern.**
  Classifying stdout lines as "error" or "warning" based on substring matching is
  domain-adjacent logic that depends on the tool's output format — put it in the
  repository, not in the runner.

- **Return types should reflect the layer's responsibility.**
  The old `runCommand` returned `CommandResult { errors[], warnings[] }` — an
  *interpreted* shape owned by the infrastructure file. The fixed version returns
  `RawCommandOutput { stdout, stderr, exitCode }`. The type name now signals where
  interpretation happens.

- **Single responsibility per infrastructure file.**
  `commandRunner.ts` originally housed `findProjectRoot` alongside command execution.
  "Run a command" and "locate the project root" are separate responsibilities; the
  latter was extracted to `projectRoot.ts`.

## Do

- Return raw `{ stdout, stderr, exitCode }` from infrastructure runners.
- Place error/warning classification and noise filtering in the repository layer.
- Give each infrastructure file one mechanical job; extract unrelated helpers.
- Use type names to make the layer boundary explicit (`Raw...` vs domain types).

## Don't

- Don't embed tool-specific string patterns (e.g. `'rollup'`, `'throw new error'`) in
  infrastructure files.
- Don't parse or classify output lines inside a runner — that is interpretation, not I/O.
- Don't colocate directory-search utilities with command-execution logic.

---

**Keywords:** infrastructure layer, repository layer, commandRunner, RawCommandOutput, single responsibility, output parsing, error patterns, layer boundary, refactoring
