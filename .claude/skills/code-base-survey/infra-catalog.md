# Infrastructure Catalog

Pure I/O adapters. Spawn processes, read files, load ASTs — yield raw output without shaping.
Consumed by `repositories/` only. Do NOT import from `cli/`, `services/`, or `domains/`.

> **Freshness**: Generated from `src/infrastructures/`. If a function is missing, run `ts_analyze` on the relevant file.

---

## `src/infrastructures/claudeCode.ts` — ClaudeCodeInfra class

The core adapter that spawns `claude -p` subprocesses.

| Method | Signature | Returns |
|---|---|---|
| `resolveJsonlPath` | `(sessionId, workingDir)` | `string` — path to Claude's JSONL session file |
| `countJsonlLines` | `(path)` | `number` — line count (used to detect resume offset) |
| `buildArgs` | `(action: ClaudeAction)` | `string[]` — CLI args array |
| `runClaude` | `(args, prompt, workingDir, sessionFilePath)` | `AsyncGenerator<string>` — streams JSONL output lines |
| `writeStderr` | `(data)` | `void` — writes to stderr |

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
| `readJson<T>` | `(path)` | `T` |
| `writeJson` | `(path, data)` | `void` |
| `fileExists` | `(path)` | `boolean` |
| `removeFile` | `(path)` | `Promise<void>` |
| `listFiles` | `(dir)` | `string[]` — filenames only (not paths) |
| `ensureDir` | `(path)` | `void` — mkdir -p |
| `readText` | `(path)` | `string` |
| `writeText` | `(path, content)` | `void` |
| `removeFileSync` | `(path)` | `void` |
| `cleanDir` | `(dir)` | `void` — removes all files in dir |
| `homeDir` | `()` | `string` — os.homedir() |
| `currentWorkingDir` | `()` | `string` — process.cwd() |
| `listDirEntries` | `(dir)` | `Dirent[]` — includes type info |
| `isDirectory` | `(path)` | `boolean` |

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
| `getSourceFile` | `(filePath)` | `SourceFile` — throws if not found |
| `getSourceFileIfExists` | `(filePath)` | `SourceFile \| undefined` |

Constructor accepts `TsAnalyzerOptions` (tsconfig path, etc.).

---

## `src/infrastructures/ttyInfrastructure.ts` — TTY access

Low-level TTY I/O for the TUI permission prompt. Used exclusively by `PermissionPipeDomain`.

| Function | Signature | Returns |
|---|---|---|
| `openTty` | `()` | `number \| null` — file descriptor |
| `writeTty` | `(fd, data)` | `void` |
| `readTty` | `(fd)` | `string` |
| `closeTty` | `(fd)` | `void` |
