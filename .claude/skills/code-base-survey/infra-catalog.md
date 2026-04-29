# Infrastructure Catalog

Pure I/O adapters implemented as injectable classes. Spawn processes, read files, load ASTs — yield raw output without shaping.
Consumed by `repositories/` only. Do NOT import from `cli/`, `services/`, or `domains/`.

> **Freshness**: Generated from `src/infrastructures/`. If a method is missing, run `ts_analyze` on the relevant file.

---

## `src/infrastructures/claudeCode.ts` — `ClaudeCodeInfra` class

The core adapter that spawns `claude -p` subprocesses.

| Method | Signature | Returns |
|---|---|---|
| `readJsonlContent` | `(path: string)` | `string` — raw JSONL file content |
| `runClaude` | `(args: string[], prompt: string, workingDir: string, sessionFilePath: string, signal: AbortSignal)` | `AsyncGenerator<string>` — streams JSONL output lines |
| `spawnInteractive` | `(args: string[])` | `void` — hands off terminal to `claude` interactively |
| `writeStderr` | `(data: string)` | `void` — writes to stderr |

MCP server path is resolved relative to this file at `MCP_SERVER_PATH`. `runClaude` accepts an `AbortSignal` for cancellation.

---

## `src/infrastructures/commandRunner.ts` — `CommandRunnerInfra` class

| Method | Signature | Returns |
|---|---|---|
| `runCommand` | `(command: string, cwd: string)` | `Promise<RawCommandOutput>` — stdout, stderr, exit code |

Used by checker pipeline (lint, build, test).

---

## `src/infrastructures/fileMove.ts` — `FileMoveInfra` class

| Method | Signature | Returns |
|---|---|---|
| `moveFile` | `(src: string, dest: string)` | `void` — moves file, creates parent dirs |

Used by `PipelineFileDomain` to move completed pipeline files to `done/`.

---

## `src/infrastructures/fs.ts` — `FsInfra` class

| Method | Signature | Returns |
|---|---|---|
| `fileExists` | `(path: string)` | `boolean` |
| `removeFile` | `(path: string)` | `Promise<void>` |
| `listFiles` | `(dir: string, ext: string)` | `string[]` — filenames matching extension |
| `ensureDir` | `(dir: string)` | `void` — mkdir -p |
| `readText` | `(path: string)` | `string` |
| `writeText` | `(path: string, content: string)` | `void` |
| `removeFileSync` | `(path: string)` | `void` |
| `readLines` | `(path: string)` | `AsyncGenerator<string>` — line-by-line streaming |
| `homeDir` | `()` | `string` — os.homedir() |
| `tmpDir` | `()` | `string` — os.tmpdir() |
| `currentWorkingDir` | `()` | `string` — process.cwd() |
| `listDirEntries` | `(dir: string)` | `Dirent[]` — includes type info |
| `isDirectory` | `(path: string)` | `boolean` |

`readLines` streams large files without loading all content into memory — prefer it over `readText` for JSONL logs.

---

## `src/infrastructures/git.ts` — `GitInfra` class

| Method | Signature | Returns |
|---|---|---|
| `spawnGitSync` | `(args: string[], cwd: string)` | `string` — stdout; returns empty string on non-zero exit |
| `execGitSync` | `(args: string[], cwd: string)` | `string` — stdout; throws on non-zero exit |

Use `execGitSync` when failure is unexpected; use `spawnGitSync` when a non-zero exit is a valid outcome (e.g. checking for pending changes).

---

## `src/infrastructures/knowledgeReader.ts` — `KnowledgeReaderInfra` class

| Method | Signature | Returns |
|---|---|---|
| `listFilesRecursive` | `(dir: string, ext: string, maxDepth: number)` | `{ absolute: string; relative: string }[]` |
| `readTextFile` | `(path: string)` | `string` |

`DEFAULT_MAX_DEPTH = 10`. Used by `KnowledgeSearchDomain` to scan `knowledge/` files.

---

## `src/infrastructures/projectRoot.ts` — `ProjectRootInfra` class

| Method | Signature | Returns |
|---|---|---|
| `findProjectRoot` | `()` | `string` — traverses upward from `__dirname` until `package.json` found |

---

## `src/infrastructures/shell.ts` — `ShellInfra` class

| Method | Signature | Returns |
|---|---|---|
| `execShell` | `(command: string, cwd: string)` | `Promise<ShellResult>` — stdout, stderr, exitCode |

Async shell execution. Used by `ScriptDomain`.

---

## `src/infrastructures/testFileDiscovery.ts` — `TestFileDiscoveryInfra` class

| Method | Signature | Returns |
|---|---|---|
| `searchDir` | `(dir: string, stem: string, ext: string)` | `string \| null` — absolute path to matching test file |

Searches `__tests__/` subdirectories for a test file matching the given stem and extension.

---

## `src/infrastructures/tsAnalyzer.ts` — `TsAnalyzer` class

ts-morph `Project` wrapper.

| Method | Signature | Returns |
|---|---|---|
| `getSourceFile` | `(filePath: string)` | `SourceFile` — throws if not found |
| `getSourceFileIfExists` | `(filePath: string)` | `SourceFile \| undefined` |

Constructor accepts `TsAnalyzerOptions` (tsconfig path, etc.).

---

## `src/infrastructures/ttyInfrastructure.ts` — `TtyInfra` class

Low-level TTY I/O for the TUI permission prompt. Used exclusively by `PermissionPipeDomain`.

| Method | Signature | Returns |
|---|---|---|
| `openTty` | `()` | `number \| null` — file descriptor |
| `writeTty` | `(fd: number, text: string)` | `void` |
| `readTty` | `(fd: number, maxBytes: number)` | `string` |
| `closeTty` | `(fd: number)` | `void` |
