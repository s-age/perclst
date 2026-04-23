# MCP Tool Return Type Pattern

**Type:** Discovery

## Context

All async execute functions in `src/mcp/tools/` follow a consistent return type convention. Understanding this pattern is essential when creating new MCP tools or fixing explicit return type linting violations.

## What happened / What is true

- All MCP tool execute functions return `Promise<{ content: { type: 'text'; text: string }[] }>`
- This is the standard MCP tool result format for text-based responses
- Tool definition variables (e.g., `ts_analyze`, `ts_checker`) also require explicit type annotations to satisfy `@typescript-eslint/explicit-function-return-type`
- Tool definition type should include `name`, `description`, and `inputSchema` properties
- Long type annotations on variables may exceed prettier's line length and require `eslint --fix` to format properly

## Do

- Use `Promise<{ content: { type: 'text'; text: string }[] }>` as the return type for all async tool execute functions
- Annotate tool definition variables with explicit type signatures
- Run `eslint --fix` to auto-format long type annotations that exceed line limits
- Include `inputSchema` with `properties` (as `Record<string, ...>`) and `required` fields in tool definitions

## Don't

- Rely on type inference for tool definition variables — explicit annotation is required
- Use `as const` assertions as a substitute for explicit type annotations on tool definitions
- Assume prettier formatting will automatically align with long inline type annotations

---

**Keywords:** MCP, tools, return-type, TypeScript, eslint, explicit-function-return-type
