# Infrastructure Catalog

Pure I/O adapters. Spawn processes, read files, load ASTs — yield raw output without shaping.
Consumed by `repositories/` only. Do NOT import from `cli/`, `services/`, or `domains/`.

> **Freshness**: Generated from `src/infrastructures/`. If a function is missing, run `ts_analyze` on the relevant file.

---

## `src/infrastructures/claudeCode.ts` — ClaudeCodeInfra class

The core adapter that spawns `claude -p` subprocesses.

| Method | Signature | Returns |
|---|---|---|
| `resolveJsonlPath` | `(sessionId: string, workingDir: string)` | `string` — path to Claude's JSONL session file |
| `countJsonlLines` | `(path: string)` | `number` — line count (used to detect resume offset) |
| `buildArgs` | `(action: ClaudeAction)` | `string[]` — CLI args array |
| `runClaude` | `(args: string[], prompt: string, workingDir: string, sessionFilePath: string)` | `AsyncGenerator<string>` — streams JSONL output lines |
| `writeStderr` | `(data: string)` | `void` — writes to stderr |

MCP server path is resolved relative to this file at `MCP_SERVER_PATH`.

---

## `src/infrastructures/commandRunner.ts`

| Function | Signature | Returns |
|---|---|---|
| `runCommand` | `(command: string, cwd?: string)` | `Promise<RawCommandOutput>` — stdout, stderr, exit code |

Used by checker pipeline (lint, build, test).

---

## `src/infrastructures/fileMove.ts`

| Function | Signature | Returns |
|---|---|---|
| `moveFile` | `(src: string, dest: string)` | `void` — moves file, creates parent dirs |

Used by `PipelineFileDomain` to move completed pipeline files to `done/`.

---

## `src/infrastructures/fs.ts` — filesystem primitives

| Function | Signature | Returns |
|---|---|---|
| `readJson<T>` | `(path: string)` | `T` |
| `writeJson` | `(path: string, data: unknown)` | `void` |
| `fileExists` | `(path: string)` | `boolean` |
| `removeFile` | `(path: string)` | `Promise<void>` |
| `listFiles` | `(dir: string)` | `string[]` — filenames only (not paths) |
| `ensureDir` | `(path: string)` | `void` — mkdir -p |
| `readText` | `(path: string)` | `string` |
| `writeText` | `(path: string, content: string)` | `void` |
| `removeFileSync` | `(path: string)` | `void` |
| `cleanDir` | `(dir: string)` | `void` — removes all files in dir |
| `homeDir` | `()` | `string` — os.homedir() |
| `currentWorkingDir` | `()` | `string` — process.cwd() |
| `listDirEntries` | `(dir: string)` | `Dirent[]` — includes type info |
| `isDirectory` | `(path: string)` | `boolean` |

---

## `src/infrastructures/git.ts`

| Function | Signature | Returns |
|---|---|---|
| `execGitSync` | `(args: string, cwd?: string)` | `string` — stdout of git command |

Synchronous. Throws on non-zero exit. Used by `PipelineFileDomain`.

---

## `src/infrastructures/knowledgeReader.ts`

| Function | Signature | Returns |
|---|---|---|
| `listFilesRecursive` | `(dir: string)` | `{ absolute: string; relative: string }[]` |
| `readTextFile` | `(path: string)` | `string` |

Used by `KnowledgeSearchDomain` to read `knowledge/` files.

---

## `src/infrastructures/projectRoot.ts`

| Function | Signature | Returns |
|---|---|---|
| `findProjectRoot` | `()` | `string` — traverses upward from `__dirname` until `package.json` found |

---

## `src/infrastructures/shell.ts`

| Function | Signature | Returns |
|---|---|---|
| `execShell` | `(command: string, cwd?: string)` | `Promise<ShellResult>` — stdout, stderr, exitCode |

Async version of command execution. Used by `ScriptDomain`.

---

## `src/infrastructures/testFileDiscovery.ts`

| Function | Signature | Returns |
|---|---|---|
| `searchDir` | `(dir: string, targetFile: string)` | `string \| null` — absolute path to matching test file |

Searches `__tests__/` subdirectories for a test file matching the target.

---

## `src/infrastructures/tsAnalyzer.ts` — TsAnalyzer class

ts-morph `Project` wrapper.

| Method | Signature | Returns |
|---|---|---|
| `getSourceFile` | `(filePath: string)` | `SourceFile` — throws if not found |
| `getSourceFileIfExists` | `(filePath: string)` | `SourceFile \| undefined` |

Constructor accepts `TsAnalyzerOptions` (tsconfig path, etc.).

---

## `src/infrastructures/ttyInfrastructure.ts` — TTY access

Low-level TTY I/O for the TUI permission prompt. Used exclusively by `PermissionPipeDomain`.

| Function | Signature | Returns |
|---|---|---|
| `openTty` | `()` | `number \| null` — file descriptor |
| `writeTty` | `(fd: number, data: string)` | `void` |
| `readTty` | `(fd: number)` | `string` |
| `closeTty` | `(fd: number)` | `void` |
