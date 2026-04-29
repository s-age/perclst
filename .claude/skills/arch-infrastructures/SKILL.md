---
name: arch-infrastructures
description: "Load when working in src/infrastructures/. The lowest layer: raw I/O adapters only — no business logic, no data shaping. Covers which adapters exist, DI class form, the no-shaping rule, and import constraints."
paths:
  - 'src/infrastructures/**/*.ts'
---

The lowest layer — the only place that may import Node.js I/O built-ins (`fs`, `fs/promises`, `child_process`, `os`, `path`). Adapters here are raw and generic; repositories compose them into atomic operations. No business logic, no data shaping.

> **`utils` vs `infrastructures`**: Non-I/O built-ins used as pure functions (e.g. `crypto.randomUUID`) belong in `utils`, not here. Pure-function re-export wrappers (`src/utils/path`, `src/utils/url`) also live in `utils` — they import the Node.js built-in so that upper layers don't have to.

## Adapters

| File | Class | Role |
|------|-------|------|
| `fs.ts` | `FsInfra` | Filesystem — `readJson`, `writeJson`, `fileExists`, `removeFile`, `listFiles`, `ensureDir`, `homeDir` |
| `claudeCode.ts` | `ClaudeCodeInfra` | Claude CLI — spawns `claude -p`, yields raw stdout lines as `AsyncGenerator<string>`; no parsing |
| `tsAnalyzer.ts` | `TsAnalyzer` | ts-morph — manages `Project` singleton; exposes `getSourceFile(filePath): SourceFile`; extraction in `repositories/parsers/` |
| `commandRunner.ts` | `CommandRunnerInfra` | Shell exec — `runCommand(cmd, cwd)` via `child_process.exec`, returns `RawCommandOutput` |
| `shell.ts` | `ShellInfra` | Shell exec (Promise) — `execShell(cmd, cwd)` returns `ShellResult` |
| `git.ts` | `GitInfra` | Git — `execGitSync(args[])` / `spawnGitSync(args[])` via `spawnSync`; no shell interpretation |
| `fileMove.ts` | `FileMoveInfra` | File move — `moveFile(src, dest)` with auto-mkdir |
| `projectRoot.ts` | `ProjectRootInfra` | Root detection — walks up from `import.meta.url` to find `package.json` |
| `testFileDiscovery.ts` | `TestFileDiscoveryInfra` | Test file search — `searchDir` walks a directory tree for `*.test.*` / `*.spec.*` |
| `ttyInfrastructure.ts` | `TtyInfra` | TTY I/O — `openTty`, `writeTty`, `readTty` via `/dev/tty` fd |
| `knowledgeReader.ts` | `KnowledgeReaderInfra` | File listing — `listFilesRecursive(dir, ext)` returns `{absolute, relative}[]` |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| `types`, `errors`, `utils`, `constants` | `cli`, `services`, `domains`, `repositories` |

Node.js built-in modules (`fs`, `fs/promises`, `child_process`, `os`, `path`, `url`) are permitted exclusively in this layer.

## Patterns

- **DI class adapter** (standard form): each adapter is a class (`export class XxxInfra`) with methods wrapping Node.js calls. The class is registered in `setupInfrastructures.ts` and injected via the DI container. No bare function exports — all public API goes through class methods. See `examples/patterns.md`.
- **Async generator for streaming** (`claudeCode.ts` style): yield raw stdout lines; never collect-then-parse. Side effects (temp files, process teardown) stay inside the generator's `finally`. See `examples/patterns.md`.
- **Stateful handle** (`tsAnalyzer.ts` style): when a resource handle must persist (e.g. ts-morph `Project`), hold it as a private field. Expose the raw handle; extraction goes in `repositories/parsers/`. See `examples/patterns.md`.
- **No-shaping rule**: converting raw output into typed domain values belongs in `repositories/parsers/`. An adapter returns bytes, lines, or opaque handles — never a parsed `Session` or `TypeScriptAnalysis`.

## Prohibitions

- Never export bare functions — all public API must be class methods for DI
- Never import from `cli`, `services`, `domains`, or `repositories`
- Never add business logic (validation, domain branching, cross-entity rules)
- Never shape output — all parsing belongs in `repositories/parsers/`
- Never define a port type (`IXxx`) — port types belong in `repositories/ports/` or `src/types/`
- Never call raw Node.js I/O from any layer above — extend adapters here instead
- Never add domain-specific methods to a generic adapter (`readSession()` on `fs.ts`)
- Never create a `parsers/` subdirectory inside `infrastructures/`
