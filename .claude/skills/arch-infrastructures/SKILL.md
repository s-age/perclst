---
name: arch-infrastructures
description: "Load when working in src/infrastructures/. The lowest layer: raw I/O adapters only — no business logic, no data shaping. Covers which adapters exist, stateless function vs. class form, the no-shaping rule, and import constraints."
paths:
  - 'src/infrastructures/**/*.ts'
---

The lowest layer — the only place that may import Node.js I/O built-ins (`fs`, `fs/promises`, `child_process`, `os`, `path`). Adapters here are raw and generic; repositories compose them into atomic operations. No business logic, no data shaping.

> **`utils` vs `infrastructures`**: Non-I/O built-ins used as pure functions (e.g. `crypto.randomUUID`) belong in `utils`, not here.

## Adapters

| File | Role |
|------|------|
| `fs.ts` | Filesystem — `readJson`, `writeJson`, `fileExists`, `removeFile`, `listJsonFiles`, `ensureDir`, `homeDir` |
| `claudeCode.ts` | Claude CLI — spawns `claude -p`, yields raw stdout lines as `AsyncGenerator<string>`; no parsing |
| `tsAnalyzer.ts` | ts-morph — manages `Project` singleton; exposes `getSourceFile(filePath): SourceFile`; extraction in `repositories/parsers/` |
| `commandRunner.ts` | Shell exec — `runCommand(cmd, cwd)` via `child_process.exec`, returns `RawCommandOutput` |
| `shell.ts` | Shell exec (Promise) — `execShell(cmd, cwd)` returns `ShellResult` |
| `git.ts` | Git — `execGitSync(args)` wraps `execSync('git …')` |
| `fileMove.ts` | File move — `moveFile(src, dest)` with auto-mkdir |
| `projectRoot.ts` | Root detection — walks up from `import.meta.url` to find `package.json` |
| `testFileDiscovery.ts` | Test file search — `searchDir` walks a directory tree for `*.test.*` / `*.spec.*` |
| `ttyInfrastructure.ts` | TTY I/O — `openTty`, `writeTty`, `readTty` via `/dev/tty` fd |
| `knowledgeReader.ts` | File listing — `listFilesRecursive(dir, ext)` returns `{absolute, relative}[]` |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| `types`, `errors`, `utils`, `constants` | `cli`, `services`, `domains`, `repositories` |

Node.js built-in modules (`fs`, `fs/promises`, `child_process`, `os`, `path`, `url`) are permitted exclusively in this layer.

## Patterns

- **Stateless function adapter** (`fs.ts`, `git.ts`, `fileMove.ts` style): one export per Node.js call, no class, no state. See `examples/patterns.md`.
- **Async generator for streaming** (`claudeCode.ts` style): yield raw stdout lines; never collect-then-parse. Side effects (temp files, process teardown) stay inside the generator's `finally`. See `examples/patterns.md`.
- **Singleton class for stateful handles** (`tsAnalyzer.ts` style): use a class only when a resource handle must persist (e.g. ts-morph `Project`). Expose the raw handle; extraction goes in `repositories/parsers/`. See `examples/patterns.md`.
- **No-shaping rule**: converting raw output into typed domain values belongs in `repositories/parsers/`. An adapter returns bytes, lines, or opaque handles — never a parsed `Session` or `TypeScriptAnalysis`.

## Prohibitions

- Never import from `cli`, `services`, `domains`, or `repositories`
- Never add business logic (validation, domain branching, cross-entity rules)
- Never shape output — all parsing belongs in `repositories/parsers/`
- Never define a port type (`IXxx`) — port types belong in `repositories/ports/` or `src/types/`
- Never call raw Node.js I/O from any layer above — extend adapters here instead
- Never add domain-specific methods to a generic adapter (`readSession()` on `fs.ts`)
- Never create a `parsers/` subdirectory inside `infrastructures/`
