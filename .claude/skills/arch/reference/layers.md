# Layer Directory Roles

| Directory | Role |
| --- | --- |
| `src/cli/` | CLI commands and display logic |
| `src/validators/` | Input validation — Zod schemas confined here; exposes typed parse functions to entry points |
| `src/validators/rules/` | Zod type constructors (`z.*`) — the **only** place `zod` is imported |
| `src/validators/cli/` | CLI-specific validators |
| `src/validators/mcp/` | MCP-specific validators |
| `src/services/` | Use-case orchestration |
| `src/domains/` | Business rules — session lifecycle, agent execution |
| `src/domains/ports/` | Port contracts (e.g. `ISessionDomain`) consumed by `services/`, implemented by `domains/` |
| `src/repositories/` | Translates infrastructure primitives into atomic domain operations |
| `src/repositories/ports/` | Port contracts (e.g. `ISessionRepository`) consumed by `domains/`, implemented by `repositories/` |
| `src/repositories/parsers/` | Pure format/shape converters — stateless, no I/O; covers stream-json, JSONL, ts-morph AST |
| `src/infrastructures/` | Pure I/O adapters — spawns processes, reads files, loads AST; yields raw output without shaping |
| `src/types/` | Shared data types referenced across 2+ layers |
| `src/errors/` | Error classes — one class per file |
| `src/utils/` | Pure functions and library wrappers; no I/O (that belongs in `infrastructures/`) |
| `src/constants/` | App constants and default values |
| `src/core/di/` | DI container wiring |
| `src/mcp/` | MCP server and tools |

# Per-Layer Import Allowlists

| Layer | May import | Must NOT import |
| --- | --- | --- |
| `cli` | `validators`, `services`, `types`, `errors`, `utils`, `constants`, `core/di` | `repositories`, `infrastructures` |
| `mcp` | `validators`, `services`, `types`, `errors`, `utils`, `constants`, `core/di`, intra-mcp (`./`) | `cli`, `domains`, `repositories`, `infrastructures` |
| `validators` | `errors`, `types`, `constants` | `cli`, `services`, `domains`, `repositories`, `infrastructures` |
| `validators/rules` | `zod` only | all `src/` layers |
| `validators/schema.ts` | `zod`, `errors` | all other `src/` layers |
| `services` | `domains/ports`, `types`, `errors`, `utils`, `constants` | `cli`, `domains`, `repositories`, `infrastructures` |
| `domains` | `domains/ports` (intra), `repositories/ports`, `types`, `errors`, `utils`, `constants` | `cli`, `services`, `repositories`, `infrastructures` |
| `repositories` | `repositories/ports` (intra), `infrastructures`, `types`, `errors`, `utils`, `constants` | `cli`, `services`, `domains` |
| `infrastructures` | `types`, `errors`, `utils`, `constants` | `cli`, `services`, `domains`, `repositories` |
| `utils` | external libraries, Node.js non-I/O built-ins (e.g. `crypto`), `types` | `cli`, `validators`, `services`, `domains`, `repositories`, `infrastructures`, `errors`, `constants`, `core/di` |
| `types` | nothing | all other layers |
| `core/di/setup.ts` | all layers | — (sole exception: DI wiring is its responsibility) |
