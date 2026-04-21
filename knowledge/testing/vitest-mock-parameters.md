# Vitest Mocks with Parameter-Based Behavior

**Type:** Discovery

## Context

When writing vitest unit tests for functions that receive parameters and those parameters affect expected behavior (e.g., taskPath in async generators), mocks must be configured to preserve and use those parameters rather than returning fixed values.

## What happened / What is true

- `mockResolvedValue()` returns a fixed value every time, ignoring all input parameters
- `mockImplementation()` allows the mock to inspect parameters and adapt its return value based on them
- Parameter preservation matters when testing nested or recursive calls that transform inputs (like taskPath in async generator chains)

## Do

- Use `mockImplementation()` when the mock needs to adapt behavior based on input parameters
- Configure default mocks in `beforeEach()` using `mockImplementation()` to handle parameter-aware behavior for all tests
- Allow individual tests to override the default mock when they need test-specific behavior

## Don't

- Use `mockResolvedValue()` when parameters are expected to affect the return value
- Manually construct expected return values in every test that needs parameter-based behavior — centralize via `beforeEach` instead

---

**Keywords:** vitest, mockImplementation, mockResolvedValue, async generator, mocking parameters
