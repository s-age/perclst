# MCP Server: Migration from Manual JSON-RPC to @modelcontextprotocol/sdk

**Type:** Discovery

## Context

Applies when authoring or maintaining `src/mcp/server.ts`. The server was originally
hand-rolled with JSON-RPC 2.0 over stdio; it has since been migrated to the official
`@modelcontextprotocol/sdk`. Understanding what the SDK replaces helps avoid re-introducing
boilerplate that the SDK already handles.

## What happened / What is true

`src/mcp/server.ts` was migrated from a hand-rolled JSON-RPC 2.0 / stdio implementation
to `@modelcontextprotocol/sdk` (`McpServer` + `StdioServerTransport`). The file dropped
from 367 to 186 lines. Future MCP protocol spec changes are handled by bumping the SDK
rather than editing protocol plumbing by hand.

**What the SDK eliminates:**
- JSON-RPC type definitions (`JSONRPCRequest`, `JSONRPCResponse`)
- `send()` / `err()` helpers
- `TOOLS` array (schema definitions)
- `handleToolsCall()` switch dispatcher
- `handleRequest()` method dispatcher (`initialize`, `tools/list`, `tools/call`)
- Manual stdin line-buffering loop

**What remains in server.ts:**
- `setupContainer()` call
- `ask_permission` implementation (inline, requires `/dev/tty` access)
- `server.tool()` registrations — one per tool, with Zod schema inline
- `server.connect(new StdioServerTransport())`

**Registration pattern:**
```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({ name: 'perclst', version: '1.0.0' })

server.tool(
  'tool_name',
  'Description',
  { arg: z.string().describe('...') },
  ({ arg }) => executeMyTool({ arg })
)

await server.connect(new StdioServerTransport())
```

**Zod version compatibility:** The SDK supports both Zod v3 and v4 via its `zod-compat`
module. Using `import { z } from 'zod'` (v4) works correctly — no separate `zod/v3`
install needed. The SDK imports from `zod/v4/core` internally and recognizes v4 schemas
via the `_zod` property.

## Do

- Register each tool with `server.tool()` using an inline Zod schema
- Use `StdioServerTransport` for stdio communication
- Let the SDK handle all JSON-RPC framing and request dispatching

## Don't

- Re-introduce manual JSON-RPC type definitions or a `send()`/`err()` layer
- Maintain a separate `TOOLS` registry array — the SDK derives it from `server.tool()` registrations
- Install `zod/v3` separately when using Zod v4 with this SDK

---

**Keywords:** mcp, sdk, modelcontextprotocol, McpServer, StdioServerTransport, migration, JSON-RPC, stdio, zod v4, server.tool, registration
