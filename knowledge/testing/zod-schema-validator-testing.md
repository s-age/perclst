# Zod Schema Validator Testing

**Type:** Problem

## Context

The `ts_test_strategist` tool returns empty strategies and "test coverage is good" for files that export Zod schema objects (e.g., `tsGetReferencesParams`), suggesting nothing needs testing. This is misleading—validator schemas in `src/validators/` require comprehensive tests, and the codebase has an established pattern for testing them.

## What happened / What is true

- `ts_test_strategist` analyzes files exporting Zod schemas and returns `strategies: []` (empty)
- The tool's recommendation "test coverage is good" is inaccurate for validator schemas
- All MCP validators in `src/validators/mcp/` have test files following a consistent pattern
- Existing tests cover: field types, optionality, valid/invalid values, descriptions, edge cases, schema modifiers

## Do

- When writing validator schema tests, ignore the `ts_test_strategist` result—it doesn't understand schema validation patterns
- Look at existing test files in the same directory (e.g., `tsChecker.test.ts`, `askPermission.test.ts`) for the established pattern
- Test each field: type check, optionality, valid values, description extraction, type rejection
- Test schema composition: all fields, partial fields, required field absence, type mismatches
- Test schema modifiers: `.strict()` (rejects unknown), `.passthrough()` (preserves unknown), default (strips unknown)
- Use the `getDescription()` helper to safely extract Zod field descriptions

## Don't

- Don't skip tests because the strategist says there's nothing to test
- Don't mix field tests into composition tests—organize them by field with nested describe blocks

---

**Keywords:** zod, schema, validator, testing, mcp, ts_test_strategist
