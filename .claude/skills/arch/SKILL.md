---
name: arch
description: Use this skill when creating or editing TypeScript files in src/. Covers language stack, layer architecture, unidirectional import rules, directory conventions, and required verification steps after changes.
paths:
  - 'src/**/*.ts'
---

# Architecture

## Language & Libraries

- **Language**: TypeScript **v5**, ESM (`"type": "module"`)
- **Runtime**: Node.js ≥ 18
- **CLI framework**: `commander` **v12**
- **AI client**: `@anthropic-ai/sdk` **v0.27**
- **TypeScript analysis**: `ts-morph` **v27**
- **Validation**: `zod` **v4** — confined to `src/validators/` only
  - Use `ZodError.issues` (not `.errors` — removed in v4)
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
| `src/repositories/`    | Data access layer — uses `infrastructures/` as raw I/O adapters; port types for domain-side injection |
| `src/infrastructures/` | Raw I/O adapters (file, process, API) — used by `repositories/`                                       |
| `src/types/`           | Shared data types; types referenced across 2+ layers                                                  |
| `src/errors/`          | Error classes — one class per file                                                                    |
| `src/utils/`           | General utilities (logger, etc.)                                                                      |
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
| `validators`       | `errors`, `types`, `constants`                                          | `cli`, `services`, `domains`, `repositories`, `infrastructures` |
| `validators/rules` | `zod` only                                                              | all `src/` layers                                   |
| `validators/schema.ts` | `zod`, `errors`                                                     | all other `src/` layers                             |
| `services`         | `domains`, `types`, `errors`, `utils`, `constants`                      | `repositories`, `infrastructures`                   |
| `domains`          | `repositories`, `types`, `errors`, `utils`, `constants`                 | `cli`, `services`, `infrastructures`                |
| `repositories`     | `infrastructures`, `types`, `errors`, `utils`, `constants`              | `cli`, `services`, `domains`                        |
| `infrastructures`  | `repositories`, `types`, `errors`, `utils`, `constants`                 | `cli`, `services`, `domains`                        |
| `types`            | nothing                                                                 | all other layers                                    |
| `core/di/setup.ts` | all layers                                                              | — (sole exception: DI wiring is its responsibility) |

**Violation examples:**

- `cli` imports `infrastructures` directly → **NG** (route through a service)
- `cli` imports `repositories` directly → **NG** (use DI container or promote shared types to `types/`)
- `services` imports `infrastructures` directly → **NG** (always go through `domains` → `repositories`)
- `domains` imports `infrastructures` directly → **NG** (define a port type in `repositories/` and inject via constructor)
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
- Port types (`type IXxx`) follow the same rule:
  - Defined and implemented **within the same layer** (e.g. `ISessionDomain` alongside `SessionDomain` in `domains/`) → same file as the class
  - Bridging **two different layers** (e.g. domain depends on it, infrastructure implements it) → `src/types/` alongside the related data types

### File & Directory Naming

- All new `.ts` files under `src/` use **camelCase** (e.g., `sessionRepository.ts`, `agentService.ts`)
- No kebab-case for new files

### Error Classes

- One class per file under `src/errors/` (e.g., `src/errors/sessionNotFoundError.ts`)

### No Barrel Files

- Do not create `index.ts` files that re-export from multiple modules
- Always import directly from the defining file
- Rationale: barrel indirection forces two-step navigation (barrel → source) and bloats context; direct imports reach the definition in one hop
