# MCP Tool Testing Pattern

**Type:** Discovery

## Context

When writing unit tests for MCP tool executor functions (functions that implement MCP tool logic and are invoked by the MCP server), you need to mock the DI container to prevent actual service resolution. Understanding the correct pattern ensures tests are isolated, fast, and catch parameter mapping bugs early.

## What happened / What is true

MCP tool executor functions follow a consistent pattern: they resolve a service from the DI container using `container.resolve<Service>(TOKENS.ServiceName)`, invoke a method on that service, and return a formatted MCP response.

To test this pattern:

- Mock `@src/core/di/container` at module level with `vi.mock()` before the test suite runs
- Mock `@src/core/di/identifiers` similarly
- Create a typed service mock with all methods as `vi.fn()` (even unused ones)
- Control per-test behavior using `vi.mocked(specificMethod).mockReturnValue(...)`
- Verify parameter mapping: args use snake_case (`file_path`, `include_test`) but are converted to camelCase (`filePath`, `includeTest`) when passed to the service
- Verify response format: all MCP executors return `{ content: [{ type: 'text' as const, text: string }] }`

## Do

- Mock both the container and TOKENS identifiers at the top of your test file
- Create a complete typed service mock with all methods (helps catch future regressions)
- Test parameter mapping explicitly — verify snake→camel conversion happens
- Validate the MCP response structure: content array with exactly 1 text item
- Test that the text field contains valid JSON by parsing it in assertions

## Don't

- Rely on actual DI resolution in tests
- Mock only the methods you think you'll use; mock all methods on the service interface
- Forget to clear mocks in `beforeEach` — use `vi.clearAllMocks()`
- Test the service implementation instead of the executor's orchestration logic

---

**Keywords:** mcp tool, testing, di container, vitest, mock, parameter mapping
