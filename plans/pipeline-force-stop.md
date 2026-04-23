# Plan: Pipeline force-stop (Ctrl+C / abort)

## Goal

Allow `perclst run` to stop gracefully when the user presses Ctrl+C: kill the in-flight `claude -p`
child process and exit cleanly. Introduce `PipelineAbortedError` to distinguish user-initiated
abort from pipeline failures, printing `"Aborted."` and exiting with code 130.

**Scope**: batch mode (`executePipeline`) only. TUI mode (`executeTUIPipeline`) already exits the
process on Ctrl+C via Ink's default handler, which cascades to kill child processes — acceptable
for MVP. TUI wiring is deferred to the pause/resume phase.

## Call chain (all layers that need changes)

```
run.ts
  └─ pipelineService.run(pipeline, { signal, ... })     [PipelineRunOptions]
       └─ pipelineDomain.runAgentTask(task, ..., opts)
            └─ agentDomain.run(session, inst, resume, execOpts)  [ExecuteOptions]
                 └─ ClaudeCodeRepository.dispatch(action, onStreamEvent?, signal?)
                      └─ ClaudeCodeInfra.runClaude(args, prompt, cwd, file, signal?)
                           └─ spawn('claude', ...)  ← child.kill() on abort
```

## Key Design Decisions

- **`AbortService` as a DI singleton** — both `run.ts` and future TUI components can share the same
  instance. Lives in `services/` to stay within architecture rules.
- **`signal` added to `PipelineRunOptions` and `ExecuteOptions`** — optional fields; all existing
  callers remain untouched.
- **`IClaudeCodeRepository.dispatch()` gains an optional `signal?`** — third parameter, optional,
  no breaking change.
- **Termination at the infrastructure boundary** — `ClaudeCodeInfra.runClaude()` registers
  `signal.addEventListener('abort', () => child.kill('SIGTERM'))`. Closing stdout ends the
  generator naturally, unwinding all `for await` loops above it.
- **Between-task abort check** — `pipelineService.run()` checks `signal?.aborted` at the top of
  each while-loop iteration and throws `PipelineAbortedError`. This stops execution immediately
  after a task completes and before the next one starts.
- **`PipelineAbortedError`** — new error class in `src/errors/`. Caught separately in
  `runCommand`'s catch block: print `"Aborted."`, exit 130 (SIGINT convention), skip
  `moveToDone` and other post-run cleanup.
- **`process.once('SIGINT')`** — prevents double-registration; a single Ctrl+C is enough.

## Files

### 1. `src/errors/pipelineAbortedError.ts` (new)

```ts
export class PipelineAbortedError extends Error {
  constructor() {
    super('Pipeline aborted by user')
    this.name = 'PipelineAbortedError'
  }
}
```

### 2. `src/services/abortService.ts` (new)

```ts
export class AbortService {
  private controller = new AbortController()

  get signal(): AbortSignal {
    return this.controller.signal
  }

  abort(): void {
    this.controller.abort()
  }
}
```

### 3. `src/core/di/identifiers.ts` (modify)

Add to `TOKENS`:

```ts
AbortService: Symbol.for('AbortService'),
```

### 4. `src/core/di/setup.ts` (modify)

```ts
container.register(TOKENS.AbortService, new AbortService())
```

### 5. `src/types/pipeline.ts` (modify)

Add to `PipelineRunOptions`:

```ts
signal?: AbortSignal
```

### 6. `src/types/agent.ts` (modify)

Add to `ExecuteOptions`:

```ts
signal?: AbortSignal
```

### 7. `src/services/pipelineService.ts` (modify)

Add abort check at the top of the while loop in `run()`:

```ts
while (i < pipeline.tasks.length) {
  if (options.signal?.aborted) throw new PipelineAbortedError()
  // ... existing logic
}
```

Import `PipelineAbortedError`.

### 8. `src/domains/pipeline.ts` (modify)

Forward `signal` in `buildExecuteOptions()`:

```ts
buildExecuteOptions(task: AgentPipelineTask, options: PipelineRunOptions): ExecuteOptions {
  return {
    allowedTools: task.allowed_tools ?? options.allowedTools,
    disallowedTools: task.disallowed_tools ?? options.disallowedTools,
    model: task.model ?? options.model,
    onStreamEvent: options.onStreamEvent,
    signal: options.signal,   // added
  }
}
```

### 9. `src/repositories/ports/agent.ts` (modify)

Add `signal?` to `IClaudeCodeRepository.dispatch()`:

```ts
dispatch(
  action: ClaudeAction,
  onStreamEvent?: (event: AgentStreamEvent) => void,
  signal?: AbortSignal
): Promise<RawOutput>
```

### 10. `src/repositories/agentRepository.ts` (modify)

Forward `signal` from `dispatch()` to `runClaude()`:

```ts
async dispatch(action, onStreamEvent, signal?) {
  // ...
  for await (const line of this.infra.runClaude(
    args, action.prompt, action.workingDir, action.sessionFilePath, signal
  )) {
  // ...
}
```

### 11. `src/domains/agent.ts` (modify)

Forward `options.signal` when calling `dispatch()`. Because `signal` is now part of
`ExecuteOptions`, the domain passes it through as the third argument to `dispatch()`.

### 12. `src/infrastructures/claudeCode.ts` (modify)

Add `signal?` to `runClaude()` and kill the child on abort:

```ts
async *runClaude(
  args: string[],
  prompt: string,
  workingDir: string,
  sessionFilePath?: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  // ...
  const child = spawn('claude', fullArgs, { ... })

  const onAbort = (): void => { if (!child.killed) child.kill('SIGTERM') }
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    yield* this.streamStdout(child.stdout)
  } finally {
    signal?.removeEventListener('abort', onAbort)
    if (child.exitCode === null && !child.killed) child.kill()
    // ... existing cleanup (unlink mcpConfigPath, etc.)
  }

  // Skip non-zero exit check when the signal triggered the kill
  if (signal?.aborted) return
  const exitCode = await closePromise
  if (exitCode !== 0) throw new RawExitError(exitCode, stderr)
}
```

### 13. `src/cli/commands/run.ts` (modify)

Resolve `AbortService` **before** the `try` block so it is accessible in `catch`. Register SIGINT
**after** `checkUncommittedChanges` returns so the once-shot is reserved for pipeline execution.
Check `signal.aborted` **first** in the catch block to handle every error variant that can surface
during an in-flight abort (e.g. `APIError('Empty response')`):

```ts
// Resolved before try so catch can reference it
const abortService = container.resolve<AbortService>(TOKENS.AbortService)

export async function runCommand(...): Promise<void> {
  try {
    // ...
    await checkUncommittedChanges(pipelineFileService)

    // Register SIGINT only after the confirmation prompt, so the once-shot
    // is reserved for the actual pipeline run
    process.once('SIGINT', () => abortService.abort())

    // ...
    await executePipeline(input, pipelineFileService, onChildPipelineDone, abortService.signal)
    // ...
  } catch (error) {
    // Check signal first — any error thrown during an aborted run (including
    // APIError('Empty response') from a mid-stream kill) should surface as Aborted
    if (abortService.signal.aborted) {
      stdout.print('Aborted.')
      process.exit(130)
    }
    if (error instanceof ValidationError) { ... }
    // ... rest of existing handlers
  }
}
```

`executePipeline()` receives `signal: AbortSignal` and includes it in the options passed to
`pipelineService.run()`.

## TUI mode note

`executeTUIPipeline` relies on Ink's default Ctrl+C → `process.exit()` behavior. The node process
termination cascades to the `claude -p` child, so no additional wiring is needed for MVP.

Future pause/resume work will pass the `AbortService` signal into `usePipelineRun` and use
Ink's `useInput` hook to intercept Ctrl+C.

## Verification

After each file change:

```
ts_checker()
```

Manual integration check:

```bash
npm run build && perclst run pipelines/<any>.json
# Press Ctrl+C → expect "Aborted." printed, process exits 130
```

## Pipeline

See `pipelines/implement__pipeline-force-stop.json`.

---

## Codebase survey — gotchas & reuse

### Gotchas

#### G1. `APIError("Empty response")` beats `PipelineAbortedError` to the catch block

`AgentDomain.run()` (line 44 in `src/domains/agent.ts`) throws `APIError('Empty response from Claude CLI')` when `raw.content` is falsy:

```ts
if (!raw.content) {
  throw new APIError('Empty response from Claude CLI')
}
```

If the child is killed before any assistant message is streamed, `runClaude` returns early (`signal?.aborted` guard) → `finalizeParseState` runs on an empty state → `raw.content === ""` (falsy) → `APIError` is thrown. This escapes the while-loop before the `signal?.aborted` check at the top of the next iteration ever fires, so the user sees:

```
Pipeline failed: Empty response from Claude CLI
exit 1
```

instead of `Aborted. / exit 130`.

**Fix**: Check `abortService.signal.aborted` first in `runCommand`'s catch block, **before** all `instanceof` guards. `abortService` is already in scope there:

```ts
} catch (error) {
  if (abortService.signal.aborted) {
    stdout.print('Aborted.')
    process.exit(130)
  }
  if (error instanceof ValidationError) { ... }
  // ...
}
```

This is the simplest and most robust fix — it catches every error variant (APIError, RateLimitError, partial parse) that might surface during an in-flight task abort.

#### G2. `container.register()` takes instances, NOT `{ useClass }` descriptors

`src/core/di/container.ts` is a trivial Map-based container:

```ts
register(id: Identifier, instance: unknown): void {
  this.bindings.set(id, instance)
}
```

It stores the value as-is. The plan's snippet `container.register(TOKENS.AbortService, { useClass: AbortService })` would store the object literal `{ useClass: AbortService }`, not a class instance. Every existing registration in `setup.ts` passes a `new XxxClass()`:

```ts
container.register(TOKENS.PipelineService, new PipelineService(pipelineDomain, scriptDomain))
```

**Fix**: Use `container.register(TOKENS.AbortService, new AbortService())` in `setup.ts` → `registerServices()`.

#### G3. SIGINT handler registered before the confirmation dialog

The plan wires `process.once('SIGINT', () => abortService.abort())` at the top of `runCommand`, but `checkUncommittedChanges()` is called immediately after and creates a `readline.Interface` for the "Uncommitted changes?" prompt. If the user presses Ctrl+C during that prompt:

1. The once-handler fires → `abortService.abort()` — signal is now permanently aborted.
2. readline closes; `confirm()` resolves `false` → `process.exit(0)` is called.

The pipeline never runs, so no harm done in this specific path. However, the SIGINT handler is consumed and will not fire again during the pipeline run (the `once` is spent).

**Fix**: Register `process.once('SIGINT', ...)` **after** `await checkUncommittedChanges(pipelineFileService)` returns, so the once-shot is reserved for the actual pipeline execution.

#### G4. The in-flight task is marked `done` before the abort surfaces

The while-loop abort check fires at the **top** of each iteration, before the next task starts. After Ctrl+C:

1. Signal is aborted → child is killed.
2. `runClaude` returns with whatever partial output was collected.
3. If `raw.content` is non-empty, `runAgentStep` yields the partial result and calls `options.onTaskDone?.(taskPath, i)` → the pipeline file is saved with that task marked `done`.
4. The while loop advances → abort check fires → `PipelineAbortedError` thrown.

Result: the partially-completed task is permanently marked `done` in the saved pipeline JSON. A subsequent `perclst run` on the same file will skip it. This is MVP-acceptable, but the pipeline file is left in an ambiguous state. Acknowledge this in the task if you want to guard against it.

#### G5. `AgentDomain.fork()` does not forward `signal`

The plan covers `AgentDomain.run()`, but `AgentDomain.fork()` (called by `resume()` for rewind operations, lines 109–145 in `src/domains/agent.ts`) also calls `this.claudeCodeRepo.dispatch()` with only two arguments. If a rewind-resume task is in flight when the user aborts, the signal is not forwarded and the child process will not be killed via the signal path.

**Fix**: Add `signal?: AbortSignal` to `ExecuteOptions`, forward it in `fork()` the same way as in `run()`, and pass it as the third argument to `dispatch()`. Alternatively, document this as a known gap for the initial implementation.

---

### Reuse candidates

#### R1. Error class pattern — follow `pipelineMaxRetriesError.ts`

`PipelineMaxRetriesError` (`src/errors/pipelineMaxRetriesError.ts`) is the closest existing example to `PipelineAbortedError`: same directory, no constructor params beyond the message. The exact pattern to replicate:

```ts
// src/errors/pipelineMaxRetriesError.ts — reference
export class PipelineMaxRetriesError extends Error {
  constructor(taskIndex: number, maxRetries: number) {
    super(`Pipeline failed: max retries (${maxRetries}) exceeded at task ${taskIndex + 1}`)
    this.name = 'PipelineMaxRetriesError'
  }
}
```

`PipelineAbortedError` has no params — simpler than the reference, but must still set `this.name`.

#### R2. `finally` block in `runClaude` already guards against double-kill

`src/infrastructures/claudeCode.ts` lines 95–104:

```ts
try {
  yield* this.streamStdout(child.stdout)
} finally {
  if (child.exitCode === null && !child.killed) child.kill()
  // unlink mcpConfigPath ...
}
```

After `child.kill('SIGTERM')` is called by the abort listener, `child.killed` becomes `true`. The `finally` block then skips the redundant kill. **Do not add a separate kill call in `finally`** — the existing guard handles it. The abort listener is the trigger; `finally` is the safety net.

#### R3. `closePromise` does not need to be awaited on abort

`closePromise` is a plain `Promise<number | null>` attached to the child's `'close'` event (line 84). If `runClaude` returns early via `if (signal?.aborted) return`, the Promise is never awaited. Node.js does not emit an unhandled-rejection because the Promise **resolves** (not rejects) when the child closes. No special cleanup needed.

#### R4. `classifyExitError` is bypassed on abort — no double-error risk

In `agentRepository.ts`, the `catch` block only runs if `runClaude` **throws** (`RawExitError`). When `runClaude` returns early (the abort path), no exception propagates through `dispatch`, so `classifyExitError` is never called and `RateLimitError` is never thrown spuriously.

#### R5. DI `TOKENS` + `setup.ts` registration pattern

Add to `identifiers.ts` under the `// Services` section (alphabetically or at the end of the block):

```ts
AbortService: Symbol.for('AbortService'),
```

Register in `setup.ts` → `registerServices()` using the instance pattern consistent with all other entries:

```ts
container.register(TOKENS.AbortService, new AbortService())
```

`AbortService` has no constructor parameters, so no injection is needed.
