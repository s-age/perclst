# Schema Shape Testing for MCP Tools

**Type:** Discovery

## Context

`validators/mcp/*.ts` files export Zod shape objects (collections of field schemas) consumed directly by `server.ts` for MCP tool registration. These shape objects define the type contract for tool parameters and should be tested to prevent regressions in the API surface.

## What happened / What is true

- Zod shape files like `tsChecker.ts` export objects: `{ field_name: z.string().optional(), ... }`
- No wrapper functions or validation logic exist in the shape file itself
- `ts_test_strategist` returns empty strategies for pure schema files because there are no executable functions
- The shape object **is** the observable contract — it can be tested by composing it into `z.object()` and validating behavior

To test a shape:
- Wrap it in `z.object(shapeObject)` to create a full schema
- Call `safeParse()` with valid/invalid inputs and assert on `.success`
- Verify field types, optionality, and descriptions match documentation
- Access Zod internals (e.g., `.description`) via `as any` with an eslint-disable comment

## Do

- Test shape objects by composing them into full schemas with `z.object()`
- Assert on `success` boolean to verify validation behavior
- Write separate tests for each field's type, optionality, and constraints
- Include tests that reject invalid types to catch schema regressions

## Don't

- Skip testing schema shapes because `ts_test_strategist` returns no strategies
- Attempt to call functions on the shape object itself (there are none)
- Try to access Zod internal properties without type casting

---

**Keywords:** Zod, mcp, schema, validation, shape object, tool registration
