---
name: architectures
description: Use this skill when creating or editing TypeScript files in src/. Covers language stack, layer architecture, unidirectional import rules, directory conventions, and required verification steps after changes.
paths:
  - "src/**/*.ts"
---

# Architecture

## Language & Libraries

- **Language**: TypeScript 5, ESM (`"type": "module"`)
- **Runtime**: Node.js ≥ 18
- **CLI framework**: `commander`
- **AI client**: `@anthropic-ai/sdk`
- **TypeScript analysis**: `ts-morph`
- **Build**: `tsup`
- **Test**: `vitest`
- **Lint / Format**: `eslint` + `prettier`

## Directory Structure

| Directory | Role |
|---|---|
| `src/cli/` | CLI commands and display logic |
| `src/services/` | Use-case orchestration |
| `src/domains/` | Business rules (currently empty) |
| `src/repositories/` | Port type definitions (`type IXxx`) |
| `src/infrastructures/` | External I/O implementations (file, process, API) |
| `src/types/` | Shared data types; types referenced across 2+ layers |
| `src/errors/` | Error classes — one class per file |
| `src/utils/` | General utilities (logger, etc.) |
| `src/constants/` | App constants and default values |
| `src/core/di/` | DI container wiring |
| `src/mcp/` | MCP server and tools |

## Unidirectional Import Rules

```
cli → services → (domains) → repositories ← infrastructures
                                  ↑
                    types  (referenced from any layer, one-way)
```

| Layer | May import | Must NOT import |
|---|---|---|
| `cli` | `services`, `types`, `errors`, `utils`, `constants` | `repositories`, `infrastructures` |
| `services` | `repositories`, `types`, `errors`, `utils`, `constants` | `infrastructures` |
| `repositories` | `types` | everything else |
| `infrastructures` | `repositories`, `types`, `errors`, `utils`, `constants` | `cli`, `services` |
| `types` | nothing | all other layers |
| `core/di/setup.ts` | all layers | — (sole exception: DI wiring is its responsibility) |

**Violation examples:**
- `cli` imports `infrastructures` directly → **NG** (route through a service)
- `cli` imports `repositories` directly → **NG** (promote shared types to `types/`)
- `services` imports `infrastructures` directly → **NG** (always go through a `repositories` port)

## Required Verification After Changes

Run in this order before completing any task:

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

### File & Directory Naming
- All new `.ts` files under `src/` use **camelCase** (e.g., `sessionRepository.ts`, `agentService.ts`)
- No kebab-case for new files

### Error Classes
- One class per file under `src/errors/` (e.g., `src/errors/sessionNotFoundError.ts`)

### No Barrel Files
- Do not create `index.ts` files that re-export from multiple modules
- Always import directly from the defining file
- Rationale: barrel indirection forces two-step navigation (barrel → source) and bloats context; direct imports reach the definition in one hop
