# Language & Library Stack

- **Language**: TypeScript v5, ESM (`"type": "module"`)
- **Runtime**: Node.js ≥ 18
- **CLI framework**: `commander` v12
- **AI client**: `@anthropic-ai/sdk` v0.27
- **MCP server**: `@modelcontextprotocol/sdk` v1.29
- **TypeScript analysis**: `ts-morph` v27
- **Validation**: `zod` v4 — confined to `src/validators/` only
  - Use `ZodError.issues` (not `.errors` — removed in v4)
- **TUI**: `ink` v7 — React-based terminal UI renderer
- **Colors**: `ansis` v4
- **Tables**: `cli-table3` v0.6
- **Date**: `dayjs` v1.11 — wrapped via `src/utils/date.ts`
- **Build**: `tsup` v8
- **Test**: `vitest` v4
- **Lint / Format**: `eslint` v10 + `prettier` v3
