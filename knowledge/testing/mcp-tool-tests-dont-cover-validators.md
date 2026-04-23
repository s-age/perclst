# MCP Tool Tests Do Not Cover the Validator Layer

**Type:** Problem

## Context

When adding tests for an MCP tool in `src/mcp/tools/__tests__/`, it is easy to assume those
tests also cover the corresponding Zod validator in `src/validators/mcp/`. They do not — the
validator files remain at 0% coverage unless explicitly imported and tested.

## What happened / What is true

- `src/validators/mcp/tsAnalyze.ts`, `tsGetTypes.ts`, and `tsTestStrategist.ts` all showed 0%
  line coverage despite having test files in `src/mcp/tools/__tests__/`.
- Those test files import from `../tsAnalyze` (the MCP tool layer), not from
  `src/validators/mcp/`. Istanbul/v8 never executes the validator files during the run.
- The MCP tool layer and the validator layer are independently importable; tests of one do not
  transitively exercise the other.

## Do

- Create **two** test files for every MCP tool:
  - `src/mcp/tools/__tests__/<toolName>.test.ts` — tests the execution logic
  - `src/validators/mcp/__tests__/<toolName>.test.ts` — tests the Zod parameter schema
- Check coverage for `src/validators/mcp/` separately after adding MCP tool tests.

## Don't

- Don't assume MCP tool tests provide coverage for the validator layer.
- Don't skip validator tests thinking the tool-layer tests are sufficient.

---

**Keywords:** mcp-tools, validators, test coverage, Istanbul, v8, Zod, zero coverage, validator layer, test file organization
