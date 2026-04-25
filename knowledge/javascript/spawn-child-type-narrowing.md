# TypeScript Narrows `spawn()` Return Type — Lost When Assigned to `ChildProcess`

**Type:** Problem

## Context

Applies when using Node.js `spawn()` with an explicit `stdio` tuple and passing the result to another method or storing it in a typed variable. Affects TypeScript projects in strict mode.

## What happened / What is true

Calling `spawn('claude', args, { stdio: ['pipe', 'pipe', 'pipe'] })` causes TypeScript to narrow the return type to `ChildProcessByStdio<Writable, Readable, Readable>`, where `stdin`, `stdout`, and `stderr` are typed as non-null.

When the return value is stored in or passed as `ChildProcess`, the narrowing is lost. `child.stderr` becomes `Readable | null` and strict mode raises a compile error on any direct `.on(...)` call.

This was encountered in `ClaudeCodeInfra.attachChildHandlers` (`src/infrastructures/claudeCode.ts`).

## Do

- Use the non-null assertion `child.stderr!.on(...)` at the call site when the `stdio` configuration guarantees non-null streams; add a comment explaining why the assertion is safe
- Alternatively, explicitly annotate the variable/parameter as `ChildProcessByStdio<Writable, Readable, Readable>` to preserve the narrow type (requires importing `Writable` and `Readable` from `"stream"`)

## Don't

- Don't annotate as `ChildProcess` when you need direct access to `stdin`/`stdout`/`stderr` without null checks — it erases the narrowed type
- Don't add unnecessary null guards (`if (child.stderr)`) when the `stdio` option already guarantees the stream exists; that obscures intent

---

**Keywords:** TypeScript, spawn, ChildProcess, ChildProcessByStdio, type narrowing, stdio, non-null, strict mode, Readable, Writable
