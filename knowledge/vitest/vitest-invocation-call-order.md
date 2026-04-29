# Vitest invocationCallOrder assertion correctness

**Type:** Problem

## Context

When testing execution order of mocked functions with `vi.mocked().mock.invocationCallOrder`, it's easy to compare against the wrong mock. This results in assertions that always pass (or always fail) without actually testing the intended constraint.

## What happened / What is true

The `invocationCallOrder` array tracks when each mock was called relative to other mocks in the same test. A test comparing execution order must compare the specific mocks that represent the constraint being tested.

**Incorrect pattern** — compares against an unrelated predecessor:
```ts
// Test name: "should save session before checking limit"
const saveCallIndex = vi.mocked(sessionDomain.save).mock.invocationCallOrder[0]
const resumeCallIndex = vi.mocked(agentDomain.resume).mock.invocationCallOrder[0]
expect(saveCallIndex).toBeGreaterThan(resumeCallIndex)  // Always true; doesn't test the constraint
```

**Correct pattern** — compares against the constraint boundary:
```ts
// Test name: "should save session before checking limit"
const saveCallIndex = vi.mocked(sessionDomain.save).mock.invocationCallOrder[0]
const limitCheckIndex = vi.mocked(agentDomain.isLimitExceeded).mock.invocationCallOrder[0]
expect(saveCallIndex).toBeLessThan(limitCheckIndex)  // Tests the actual constraint
```

## Do

- Map the test name to the specific mocks being compared: "X before Y" → compare X against Y
- Verify the constraint represents the actual behavior being tested, not just a predecessor call
- Use assertion operators that match the constraint (`toBeLessThan` for "before", `toBeGreaterThan` for "after")

## Don't

- Compare against any earlier mock just because it happens to come first
- Assume the constraint is tested if the assertion passes — verify it would fail if the order changed

---

**Keywords:** vitest, invocationCallOrder, call ordering, execution order, mocking, assertion
