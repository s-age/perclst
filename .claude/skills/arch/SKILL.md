---
name: arch
description: Architecture reference auto-loaded for src/**/*.ts. Covers language stack, layer architecture, unidirectional import rules, directory conventions, and required verification steps after changes.
paths:
  - 'src/**/*.ts'
---

# Architecture

## Language & Libraries

- **Language**: TypeScript **v5**, ESM (`"type": "module"`)
- **Runtime**: Node.js ≥ 18
- **CLI framework**: `commander` **v12**
- **AI client**: `@anthropic-ai/sdk` **v0.27**
- **MCP server**: `@modelcontextprotocol/sdk` **v1.29**
- **TypeScript analysis**: `ts-morph` **v27**
- **Validation**: `zod` **v4** — confined to `src/validators/` only
  - Use `ZodError.issues` (not `.errors` — removed in v4)
- **Colors**: `ansis` **v4**
- **Tables**: `cli-table3` **v0.6**
- **Date**: `dayjs` **v1.11** — wrapped via `src/utils/date.ts`
- **Build**: `tsup` **v8**
- **Test**: `vitest` **v4**
- **Lint / Format**: `eslint` **v10** + `prettier` **v3**

## Directory Structure

| Directory              | Role                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/cli/`             | CLI commands and display logic                                                                        |
| `src/validators/`      | Input validation layer — Zod schemas confined here; exposes typed parse functions to all entry points |
| `src/validators/rules/`| Zod type constructors (`z.*`) — the **only** place `zod` is imported                                 |
| `src/validators/cli/`  | CLI-specific validators; future entry points get their own subdirectory (e.g. `validators/mcp/`)      |
| `src/services/`        | Use-case orchestration                                                                                |
| `src/domains/`         | Business rules — session lifecycle, agent execution 等                                                |
| `src/repositories/`    | Translates infrastructure primitives into atomic domain operations (e.g. `startSession`, `getTurns`) |
| `src/repositories/ports/` | Port contracts (e.g. `ISessionRepository`) consumed by `domains/` and implemented by `repositories/` |
| `src/domains/ports/`   | Port contracts (e.g. `ISessionDomain`) consumed by `services/` and implemented by `domains/`         |
| `src/infrastructures/` | Wraps raw external I/O primitives (HTTP verbs, CLI commands, file ops) — no domain knowledge; consumed by `repositories/` |
| `src/types/`           | Shared data types; types referenced across 2+ layers                                                  |
| `src/errors/`          | Error classes — one class per file                                                                    |
| `src/utils/`           | Pure functions and library wrappers (e.g. dayjs → `date.ts`); no I/O — that belongs in `infrastructures/` |
| `src/constants/`       | App constants and default values                                                                      |
| `src/core/di/`         | DI container wiring                                                                                   |
| `src/mcp/`             | MCP server and tools                                                                                  |

## Unidirectional Import Rules

```
cli ──┐
mcp ──┼→ validators → services → domains → repositories → infrastructures
...  ─┘                   ↑
                types  (referenced from any layer, one-way)
```

| Layer              | May import                                                              | Must NOT import                                     |
| ------------------ | ----------------------------------------------------------------------- | --------------------------------------------------- |
| `cli`              | `validators`, `services`, `types`, `errors`, `utils`, `constants`, `core/di` | `repositories`, `infrastructures`              |
| `mcp`              | `validators`, `services`, `types`, `errors`, `utils`, `constants`, `core/di`, intra-mcp (`./`) | `cli`, `domains`, `repositories`, `infrastructures` |
| `validators`       | `errors`, `types`, `constants`                                          | `cli`, `services`, `domains`, `repositories`, `infrastructures` |
| `validators/rules` | `zod` only                                                              | all `src/` layers                                   |
| `validators/schema.ts` | `zod`, `errors`                                                     | all other `src/` layers                             |
| `services`         | `domains/ports`, `types`, `errors`, `utils`, `constants`                | `cli`, `domains`, `repositories`, `infrastructures`                   |
| `domains`          | `domains/ports` (intra), `repositories/ports`, `types`, `errors`, `utils`, `constants` | `cli`, `services`, `repositories`, `infrastructures`   |
| `repositories`     | `repositories/ports` (intra), `infrastructures`, `types`, `errors`, `utils`, `constants` | `cli`, `services`, `domains`        |
| `infrastructures`  | `types`, `errors`, `utils`, `constants`                                 | `cli`, `services`, `domains`, `repositories`        |
| `utils`            | external libraries (e.g. `dayjs`); Node.js non-I/O built-ins (e.g. `crypto`) | all `src/` layers                             |
| `types`            | nothing                                                                 | all other layers                                    |
| `core/di/setup.ts` | all layers                                                              | — (sole exception: DI wiring is its responsibility) |

**Violation examples:**

- `cli` imports `infrastructures` directly → **NG** (route through a service)
- `cli` imports `repositories` directly → **NG** (use DI container or promote shared types to `types/`)
- `services` imports `infrastructures` directly → **NG** (always go through `domains` → `repositories`)
- `domains` imports `infrastructures` directly → **NG** (define a port type in `repositories/ports/` and inject via constructor)
- any file outside `validators/` imports `zod` → **NG** (Zod must not leak out of the validators layer)

## Required Verification After Changes

Use the `ts_checker` MCP tool to run lint, build, and tests in a single call:

```
ts_checker()          # runs lint:fix → build → test:unit; returns { ok, lint, build, test }
```

This saves multiple tool-call round-trips and token overhead versus running each command separately.
If `ok` is `true`, all three steps passed. Otherwise inspect the `errors` / `warnings` arrays for
the failing step(s) and fix them before completing the task.

Alternatively, run each step manually in this order:

```bash
npm run lint:fix   # Prettier + ESLint auto-fix; resolve remaining errors manually
npm run build      # tsup build — catches type errors and module resolution issues
npm run test:unit  # Vitest unit tests
```

- Warnings (e.g., function length) are not blockers but should be noted
- Files auto-fixed by `lint:fix` are intentional changes — do not revert them

## General Coding Rules

### Types

- Use `type` instead of `interface` everywhere
- Types referenced by 2+ layers belong in `src/types/`
- Files within `src/types/` may import from sibling `src/types/` files (intra-layer imports are permitted to avoid duplication; there is no circular-dependency risk within a single leaf layer)
- Port types (`type IXxx`) live in the `ports/` subdirectory of the layer that **consumes** the port — no placement decision required
  - Repository ports (consumed by `domains`, implemented by `repositories`): `src/repositories/ports/`
    - Example: `ISessionRepository` → `src/repositories/ports/session.ts`
    - Example: `IProcedureRepository` → `src/repositories/ports/agent.ts`
    - Example: `IClaudeSessionRepository` → `src/repositories/ports/analysis.ts`
  - Domain ports (consumed by `services`, implemented by `domains`): `src/domains/ports/`
    - Example: `ISessionDomain`, `IImportDomain` → `src/domains/ports/session.ts`
    - Example: `IAgentDomain` → `src/domains/ports/agent.ts`
    - Example: `IAnalyzeDomain` → `src/domains/ports/analysis.ts`

### File & Directory Naming

- All new `.ts` files under `src/` use **camelCase** (e.g., `sessionRepository.ts`, `agentService.ts`)
- No kebab-case for new files

### Error Classes

- One class per file under `src/errors/` (e.g., `src/errors/sessionNotFoundError.ts`)

### No Barrel Files

- Do not create `index.ts` files that re-export from multiple modules
- Always import directly from the defining file
- Rationale: barrel indirection forces two-step navigation (barrel → source) and bloats context; direct imports reach the definition in one hop
