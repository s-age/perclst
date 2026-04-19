# Vitest toHaveBeenCalledWith Fails When a New Optional Arg Is Undefined

**Type:** Problem

## Context

When a function signature gains a new optional parameter (e.g. `fn(a, b?)` becomes
`fn(a, b?, c?)`), existing Vitest tests using `toHaveBeenCalledWith(expect.objectContaining({...}))`
will break if the function was called with the extra argument present but `undefined`.

## What happened / What is true

- `dispatch(action)` was changed to `dispatch(action, onStreamEvent?)`.
- Existing tests called `dispatch` with a single argument; the mock recorded the call as
  `dispatch(action, undefined)` — two arguments.
- `toHaveBeenCalledWith(expect.objectContaining({...}))` (one matcher) failed because
  Vitest checks **all** arguments strictly: one matcher cannot match two arguments.

## Do

- When a new optional argument is added, update affected tests to explicitly match the
  extra argument:
  ```ts
  expect(mock).toHaveBeenCalledWith(expect.objectContaining({...}), undefined);
  ```
- Run `ts_checker` after signature changes to surface these failures immediately.

## Don't

- Don't assume a single `objectContaining` matcher covers all arguments — Vitest is strict
  about argument count.
- Don't leave tests that pass a single matcher after a signature expansion; they are silently
  incorrect until the optional arg is actually used.

---

**Keywords:** vitest, toHaveBeenCalledWith, optional parameter, undefined, argument count, mock, dispatch
