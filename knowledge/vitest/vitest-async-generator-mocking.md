# Vitest Async Generator Mocking

**Type:** Problem

## Context

When testing code that iterates through async generators using `for await ... of`, standard vitest mocking patterns like `mockReturnValue` or `mockResolvedValue` fail to provide the generator behavior expected by the code under test. This surfaces as unexpectedly empty iterations or failed assertions.

## What happened / What is true

- `mockReturnValue` returns a value directly; it doesn't create an iterable.
- `mockResolvedValue` returns a resolved Promise; it doesn't support `for await ... of`.
- Proper async generator mocking requires `mockImplementation(async function* () { yield results })`.
- Global `beforeEach` setup of async generator mocks doesn't always persist reliably across test variations; per-test overrides are more reliable.
- Assertions on async generator tests become fragile when dependent on execution completing successfully (e.g., `toHaveBeenCalledTimes(2)` fails if the generator completes differently than expected).

## Do

- Use `mockImplementation(async function* () { ... })` to mock async generators.
- Override the mock `mockImplementation` in individual tests rather than relying solely on global `beforeEach` setup.
- Simplify assertions to check that functions were called, rather than checking specific call counts or parameter sequences when those depend on generator completion.
- Focus on happy-path assertions where the generator behavior is fully controlled.
- Split test files across subdirectories to organize logical groups (utilities in one file, complex entry points in another) when exceeding 500-line limits.

## Don't

- Don't use `mockReturnValue` or `mockResolvedValue` to mock code that uses `for await ... of`.
- Don't rely entirely on global `beforeEach` setup for async generator mocks; override per-test when needed.
- Don't assert on call counts or parameter sequences that depend on async iteration completion; those assertions are fragile.

---

**Keywords:** vitest, async generator, for-await-of, mockImplementation, mocking, test-setup
