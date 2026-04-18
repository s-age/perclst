# MCP SDK: Tool Execute Functions Must Return `type: 'text' as const`

**Type:** External

## Context

Applies when implementing MCP tool execute functions that return `CallToolResult` content
using `@modelcontextprotocol/sdk`. Affects any `server.tool()` callback that builds a
content array with a `type: 'text'` entry.

## What happened / What is true

After migrating `server.ts` to `@modelcontextprotocol/sdk`, all `server.tool()` calls
failed with `TS2769: No overload matches this call`. The root cause was that tool execute
functions returned `{ type: 'text', text: '...' }` where TypeScript inferred `type` as
`string`, but the SDK's `CallToolResult` type requires the literal `"text"`.

- `@modelcontextprotocol/sdk`'s `CallToolResult` uses `z.ZodLiteral<"text">` for the
  `type` field — it requires the string literal `"text"`, not `string`.
- In object literals, TypeScript widens `'text'` to `string` unless you force the literal
  with `as const`.
- The `TS2769` error message ("No overload matches") obscures the real cause because
  TypeScript tries multiple overloads and reports all of them; the actual mismatch is deep
  in the type chain.

## Do

```ts
// Good — forces literal type "text"
return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
```

## Don't

```ts
// Bad — TypeScript infers type as string, not "text"; causes TS2769
return { content: [{ type: 'text', text: JSON.stringify(result) }] }
```

---

**Keywords:** mcp, sdk, modelcontextprotocol, CallToolResult, type text, as const, TS2769, literal type, server.tool
