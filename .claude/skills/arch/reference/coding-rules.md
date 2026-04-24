# General Coding Rules

## Types

- Use `type` instead of `interface` everywhere
- Types referenced by 2+ layers belong in `src/types/`
- Files within `src/types/` may import from sibling `src/types/` files (intra-layer is safe; no circular-dependency risk)
- Port types (`type IXxx`) live in the `ports/` subdirectory of the **consuming** layer:
  - Repository ports (consumed by `domains/`, implemented by `repositories/`): `src/repositories/ports/`
    - `ISessionRepository` → `src/repositories/ports/session.ts`
    - `IProcedureRepository` → `src/repositories/ports/agent.ts`
    - `IClaudeSessionRepository` → `src/repositories/ports/analysis.ts`
  - Domain ports (consumed by `services/`, implemented by `domains/`): `src/domains/ports/`
    - `ISessionDomain`, `IImportDomain` → `src/domains/ports/session.ts`
    - `IAgentDomain` → `src/domains/ports/agent.ts`
    - `IAnalyzeDomain` → `src/domains/ports/analysis.ts`

> **`IClaudeCodeRepository` placement**: belongs in `src/repositories/ports/agent.ts` — it bridges `domains → repositories`, not infrastructure.

## File & Directory Naming

- All new `.ts` files under `src/` use **camelCase** (e.g., `sessionRepository.ts`, `agentService.ts`)
- No kebab-case for new files

## Error Classes

- One class per file under `src/errors/` (e.g., `src/errors/sessionNotFoundError.ts`)

## No Barrel Files

- Do not create `index.ts` files that re-export from multiple modules
- Always import directly from the defining file
- Rationale: direct imports reach the definition in one hop; barrel indirection adds a two-step navigation and bloats context
