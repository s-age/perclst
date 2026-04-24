# stdout/stderr Console Output Is an Intentional utils/ Carve-out

**Type:** Discovery

## Context

`src/utils/` is defined as the layer for pure, stateless helper functions. Console output (`process.stdout`, `process.stderr`) is technically I/O, which normally belongs in `infrastructures/`. The placement of `src/utils/output.ts` (which exports `stdout.print()`, `stderr.print()`, `debug.print()`) is an intentional exception to that rule.

Note: the related case of `process.cwd()` in `src/utils/path.ts` is covered separately in `cwdpath-utils-vs-infra.md`.

## What happened / What is true

`stdout.print()`, `stderr.print()`, and `debug.print()` write to process output streams. Despite this being I/O, they live in `src/utils/output.ts` for two reasons:

1. **Cross-cutting concern**: all layers need console output for logging and user-facing messages. Wrapping it in an infrastructure port would require every layer to inject a logger, adding indirection with no benefit.
2. **No mock needed**: callers do not need to mock console output to test their own logic deterministically. Tests that verify printed output can capture streams directly if needed.

The logger is configured once at startup via `setLogLevel()` and reused — it is not re-instantiated per request and has no external resource lifecycle.

## Do

- Keep `stdout.print()`, `stderr.print()`, and `debug.print()` in `src/utils/output.ts`.
- Apply the **mock-necessity test** when classifying borderline utilities: if callers do not need to mock the operation for deterministic unit tests, it can stay in `utils/`.
- Treat console output as a cross-cutting utility, not an external resource.

## Don't

- Don't move `output.ts` to `infrastructures/` — it would force every layer to inject a logger for basic print statements.
- Don't create an infrastructure port just for console output; the carve-out is intentional and documented.
- Don't confuse this with file I/O, network calls, or process spawning — those are real external resources and belong in `infrastructures/`.

---

**Keywords:** stdout, stderr, output.ts, utils, infrastructures, console output, cross-cutting concern, mock-necessity test, I/O boundary, carve-out, layer rules
