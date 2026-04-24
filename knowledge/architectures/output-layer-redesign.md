# CLI Output Layer: logger → stdout / stderr / debug

**Type:** Discovery

## Context

Applies whenever the output utilities in `src/utils/` are touched, or when deciding
how to route new CLI messages. The refactor replaced `src/utils/logger.ts` with
`src/utils/output.ts`.

## What happened / What is true

The original `logger` singleton mimicked a structured logger (Winston / Pino style)
with `info`, `debug`, `warn` levels, but its real job was terminal output — not log
recording. This mismatch caused confusion about where output should go.

Key observations that drove the change:

- `logger.print` was used in ~171 call sites; `debug` / `info` / `warn` were almost
  never called.
- `setLevel()` was never called in production code — only in tests.
- Mixing stdout and stderr via a single object made pipe-safe scripts harder to write.

The replacement exposes three explicit objects:

```ts
stdout.print(msg)   // user-facing normal output  → process.stdout
stderr.print(msg)   // errors and diagnostics     → process.stderr
debug.print(msg)    // internal trace (DEBUG level only) → console.debug (stderr)
```

The header separator style was also updated from plain text to a styled line using
`ansis` dim + accent colour, implemented in `display.ts:makeDisplay()` → `header()`.

## Do

- Use `stdout.print` for all output a user is meant to read.
- Use `stderr.print` for errors, warnings, and diagnostic messages.
- Use `debug.print` for internal trace output that should be suppressed by default.
- Keep display/formatting logic in `display.ts`; keep stream routing in `output.ts`.

## Don't

- Don't name CLI output helpers `logger` — the name implies persistence/log levels,
  not terminal output.
- Don't write errors to `stdout`; scripts that pipe perclst output will break.
- Don't call `setLevel()` in production paths — it was test-only and is now removed.

---

**Keywords:** logger, output, stdout, stderr, debug, cli, display, refactor, output.ts, logger.ts
