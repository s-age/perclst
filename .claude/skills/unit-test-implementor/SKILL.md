---
name: unit-test-implementor
description: Patterns and conventions for writing *.test.ts files in this project. Load when creating or editing unit test files. Covers file placement, mock style, vitest imports, and case structure. Does NOT run ts_test_strategist — use procedures/test-unit.md for full agent-driven workflow.
paths:
  - src/**/*.test.ts
---

## File placement and size

Test files live at `{dir}/__tests__/{stem}.test.ts` relative to the source file.

When a single test file would exceed **500 lines**, split it into a subdirectory instead of deleting or trimming tests. Do **not** reduce coverage to fit a line limit.

```
# single file (under 500 lines)
src/infrastructures/__tests__/claudeCode.test.ts

# split into subdirectory (500+ lines)
src/infrastructures/__tests__/claudeCode/
  utils.test.ts          ← small methods (resolveJsonlPath, countJsonlLines, …)
  buildArgs.test.ts      ← one logical group per file
  runClaude.test.ts
  writeMcpConfig.test.ts
  streamStdout.test.ts
```

**Splitting rules:**
- One `describe` group (or a cluster of small related ones) per file
- Each file declares only the mocks it needs — no shared mock module
- `vi.hoisted` + `vi.mock` are repeated per file; vitest isolates them automatically
- The subdirectory name matches the source file stem (`claudeCode/` for `claudeCode.ts`)

**Split strategies** — pick the axis that matches the module's shape:

- **By cyclomatic complexity** (multi-function modules): give each function with complexity ≥ 9 and ≥ 6 test cases its own file; group lower-complexity functions in a shared `{source}.test.ts`. Name per-function files `{source}.{functionName}.test.ts`.
- **By functional area** (domain classes with 10+ methods): group methods by what they do — rejection, execution, limits — not alphabetically or one-method-per-file. Each area gets one file.
- **By role** (domains with helpers + class): `helpers.test.ts` for pure functions, `domain.test.ts` for the class and its methods.

Within any file, order test cases: happy path → variations → complex branches → error paths.

## Imports

Always import from vitest explicitly — no globals:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
```

Add `it.each` only when you use it:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
// it.each is on the it namespace — no extra import needed
```

## Mock style

**Interface mocks** (injected via constructor): declare at module scope as a typed object literal with `vi.fn()` values. Reset in `beforeEach` with `vi.clearAllMocks()`.

```ts
const mockRepo: ISessionRepository = {
  save: vi.fn(),
  load: vi.fn(),
  exists: vi.fn(),
}
```

**Module mocks** (external imports): use `vi.mock()` at the top level.

```ts
vi.mock('@src/lib/something', () => ({ doThing: vi.fn() }))
```

**No mocks needed**: pure functions with no injected deps — test directly.

## Class under test

Instantiate in `beforeEach`, never at module scope:

```ts
describe('SessionDomain', () => {
  let domain: SessionDomain

  beforeEach(() => {
    vi.clearAllMocks()
    domain = new SessionDomain(mockRepo)
  })
})
```

## Case structure

- Order: happy path first, then branches, then error paths
- Describe block per class or function; nested `describe` for methods with multiple branches
- `it` descriptions: `'should <verb> <outcome>'` for behavior, or just `'<verb>s <outcome>'`
- Use `vi.mocked(mock.method).mockResolvedValue(...)` — not `(mock.method as vi.Mock)`

## Assertions

```ts
// async throws
await expect(fn()).rejects.toThrow(MyError)

// mock called with
expect(mock.save).toHaveBeenCalledWith(expected)

// exact call count
expect(mock.save).toHaveBeenCalledTimes(1)
```

## What NOT to do

- Never use `console.log` in tests
- Never import from `node_modules` internals
- Never test implementation details — test observable behavior
- Never duplicate tests already present in the file (read first if file exists)

## One assertion per `it`

Each `it` block must test exactly one input variant. Never bundle multiple `expect` calls for different inputs in a single `it` — a failure hides the remaining cases.

```ts
// BAD — three cases in one it
it('should throw for non-object inputs', () => {
  expect(() => parse(null)).toThrow(ValidationError)
  expect(() => parse('string')).toThrow(ValidationError)
  expect(() => parse(42)).toThrow(ValidationError)
})

// GOOD — one case each
it('should throw ValidationError when raw input is null', () => {
  expect(() => parse(null)).toThrow(ValidationError)
})
it('should throw ValidationError when raw input is a string', () => {
  expect(() => parse('string')).toThrow(ValidationError)
})
it('should throw ValidationError when raw input is a number', () => {
  expect(() => parse(42)).toThrow(ValidationError)
})
```

### Use `it.each` when only inputs differ

When ≥ 3 cases share the **same assertion shape** and differ only in the input value, replace the repeated `it` blocks with `it.each`. This keeps every case as a separate test run (satisfies the one-assertion rule) while reducing boilerplate.

**Conditions that must all hold:**
1. Same assertion (`toThrow(X)`, `toBe(y)`, etc.) across all rows
2. Same failure reason / same code path
3. ≥ 3 variants — two or fewer are clearer as explicit `it` blocks

```ts
// BEST — it.each for same-behavior error paths
it.each([
  ['null',     null],
  ['string',   'hello'],
  ['number',   42],
  ['boolean',  true],
] as const)('should throw ValidationError when raw input is %s', (_label, input) => {
  expect(() => parse(input)).toThrow(ValidationError)
})
```

**Do NOT use `it.each` for:**
- Happy-path cases where the expected output differs per row
- Cases that require different setup or mock behavior
- Cross-field logic (`superRefine`) where each combination has distinct semantics

Keep the label column (`_label`) as the first element so the generated test name is human-readable without encoding the raw value.

## Pipeline rejection protocol

Review agents signal failure via a temp file, not exit codes or stdout.

- The task field includes `ng_output_path: .claude/tmp/<task-name>` — the procedure writes plain-text feedback there **only on failure**.
- `PipelineService` checks `existsSync` after each agent run: file present → rejection (content becomes feedback, file deleted, engine jumps to rejection target); absent → pass.
- Always delete the file immediately after reading to prevent stale false rejections on retries.

## Call-count assertions

Only assert call counts when the **number itself is meaningful behavior** — e.g. early-exit (stops after first match) or a retry/loop limit. Do not assert call counts just to confirm the loop ran N times as a side effect of the happy path; that duplicates setup for no coverage gain.

```ts
// GOOD — count asserts early-exit behavior
it('stops after first match and does not recurse into subsequent entries', () => {
  ...
  expect(fs.readdirSync).toHaveBeenCalledTimes(1)
})

// BAD — count just mirrors loop depth, adds no new information
it('calls existsSync twice when package.json is one level up', () => {
  // identical setup to the return-value test above — delete this
})
```

## Test names must express behavior, not implementation

Name tests after the observable contract, not the internal mechanism.

```ts
// BAD — names the iteration order (implementation detail)
it('returns first match when .test file precedes .spec in iteration order', ...)

// GOOD — names the specified preference
it('prefers .test file over .spec file when both exist', ...)
```

## No redundant happy-path tests

A default-value assertion already present in an earlier `it` must not be repeated in a later one. Before adding a new happy-path test, scan the file for assertions that cover the same field and input.

## Cover all optional field types in error paths

For each optional field that has a type constraint (boolean, integer, enum…), add at least one negative test that passes the wrong type. 100 % line coverage does not guarantee this — a `stringRule` path inside `booleanRule` may be reachable only through a direct wrong-type call.

When a single field must reject multiple wrong types, use `it.each`:

```ts
it.each([
  ['string', 'yes'],
  ['number', 1],
  ['array',  []],
] as const)('should throw ValidationError when silentThoughts receives a %s', (_label, value) => {
  expect(() => parse({ ...minimal, silentThoughts: value })).toThrow(ValidationError)
})
```

For a single wrong-type case, a plain `it` is still fine:

```ts
it('should throw ValidationError when a boolean field receives a string', () => {
  expect(() => parse({ ...minimal, silentThoughts: 'yes' })).toThrow(ValidationError)
})
```

## Cover all schema-valid combinations in happy paths

When a schema has cross-field logic (e.g. `superRefine`), derive all valid filter combinations from the implementation and write a happy-path `it` for each. Missing a valid combination leaves a gap even at 100 % coverage.
