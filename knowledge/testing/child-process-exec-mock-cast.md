# Double Cast Required When Mocking child_process.exec

**Type:** Problem

## Context

When writing Vitest unit tests that need to mock `child_process.exec`, passing an
implementation function directly to `mockImplementation` causes a TypeScript compile
error. This affects any test that exercises code which shells out via `exec`.

## What happened / What is true

`exec` has multiple overloaded signatures, so its TypeScript type is a union of
several function types rather than a single callable. `mockImplementation` expects a
single concrete function type and cannot reconcile the overload union, producing an
error similar to:

```
Argument of type '(_cmd: ..., _opts: ..., cb: ...) => void' is not assignable to
parameter of type 'typeof exec'.
```

The fix is a two-step cast through an intermediate type:

```ts
type ExecCallback = (
  error: (Error & { code?: number }) | null,
  stdout: string,
  stderr: string
) => void
type ExecImpl = (command: string, opts: object, cb: ExecCallback) => void

mockExec.mockImplementation(((_cmd, _opts, cb: ExecCallback) => {
  cb(null, 'stdout', 'stderr')
}) as ExecImpl as typeof exec)
```

`as ExecImpl` pins the implementation to a concrete type; `as typeof exec` satisfies
what `mockImplementation` demands.

## Do

- Define a local `ExecImpl` type and cast in two steps: `as ExecImpl as typeof exec`
- Extract a `stubExec(error, stdout, stderr)` helper when the same pattern is needed
  across multiple tests

```ts
function stubExec(
  error: (Error & { code?: number }) | null,
  stdout: string,
  stderr: string
): void {
  mockExec.mockImplementation(((_cmd, _opts, cb: ExecCallback) => {
    cb(error, stdout, stderr)
  }) as ExecImpl as typeof exec)
}
```

## Don't

- Don't cast directly with `as typeof exec` without the intermediate type — TypeScript
  will reject it because the implementation signature is still unresolved
- Don't use `vi.fn()` typed as `any` to dodge the error; it defeats type-checking on
  the mock itself

---

**Keywords:** vitest, child_process, exec, mock, mockImplementation, TypeScript, overload, cast, double cast
