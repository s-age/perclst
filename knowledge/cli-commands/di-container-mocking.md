# DI Container Mocking in Command Tests

**Type:** Problem

## Context

When test files import and call functions that depend on DI container resolution (like `runCommand` from `src/cli/commands/run.ts`), the mocked container must provide bindings for all tokens used in that function's execution path, including those resolved in catch blocks or late in the execution flow. Missing bindings cause null dereference errors that only surface when that code path runs.

## What happened

During pipeline-force-stop feature implementation, test files calling `runCommand()` failed with "Cannot read properties of null (reading 'signal')" because `AbortService` was resolved from the container but never mocked. The error occurred in the catch block when code tried to access `abortService.signal.aborted`, but the binding was missing from the test's container mock.

## Do

- Declare all mock service variables at the `describe` block level so they're in scope for the container mock function
- Initialize mocks in `beforeEach()` before setting up the container resolve mock
- Add a case for every token that the function under test calls `container.resolve()` for
- Include `process.once` in the process mock if the code registers signal handlers
- Use `new AbortController().signal` to create a real AbortSignal for testing

## Don't

- Assume the container mock only needs to provide bindings for "obviously used" services
- Leave mocks uninitialized when they're referenced by the container mock function
- Forget to mock process methods like `once()` that are called alongside container resolution
- Create stub signals manually—use the standard AbortController API

---

**Keywords:** testing, DI container, mocking, null dereference, AbortService, process mock
