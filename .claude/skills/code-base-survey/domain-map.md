# Domain Map

Business logic layer. Each domain enforces a single responsibility and communicates with
repositories via port interfaces (constructor-injected). Domains must NOT import from
`infrastructures/`, `repositories/`, `cli/`, or `services/`.

Entry file for each domain: `src/domains/<name>.ts`
Port consumed by services: `src/domains/ports/<name>.ts`
Port consumed by domains (repo side): `src/repositories/ports/<name>.ts`

---

## SessionDomain — `session.ts`

**Responsibility**: Session lifecycle — creation, persistence, lookup, deletion, status transitions.

Key methods: `create`, `get`, `list`, `delete`, `save`, `rename`, `findByName`, `resolveId`, `updateStatus`, `getPath`, `createRewind`, `sweep`

`resolveId` accepts either a session ID or a name — this is the standard way to accept user input in CLI commands.
`createRewind` forks a session at a past turn (always creates a new session; original is never mutated).

---

## AgentDomain — `agent.ts`

**Responsibility**: Runs `claude -p` for start, resume, and fork operations. Enforces turn/token limits.

Key methods: `run`, `resume`, `fork`, `isLimitExceeded`

Depends on `IClaudeCodeRepository` (spawns process) and `IProcedureRepository` (loads procedure prompts).

---

## AnalyzeDomain — `analyze.ts`

**Responsibility**: Reads Claude Code JSONL session files and produces analysis stats.

Key methods: `analyze` → `AnalyzeResult` (turn breakdown, tool usage, token stats), `getRewindTurns`

`buildSummaryStats` is an exported pure function used internally.

---

## CheckerDomain — `checker.ts`

**Responsibility**: Runs the lint → build → test pipeline and aggregates results.

Key methods: `check(options: CheckerOptions)` → `CheckerResult`

Thin orchestrator; actual command execution is in `commandRunner.ts` via `ICheckerRepository`.

---

## ImportDomain — `import.ts`

**Responsibility**: Validates a Claude Code session ID for import and resolves its working directory.

Key methods: `validateSession`, `resolveWorkingDir`

---

## KnowledgeSearchDomain — `knowledgeSearch.ts`

**Responsibility**: AND/OR keyword search across `knowledge/` markdown files.

Key methods: `search(options)` → `KnowledgeSearchResult`, `hasDraftEntries()`

Query syntax: space = AND, `|` = OR. Pure functions `parseQuery`, `extractKeywords`, `matchFile`, `extractTitle`, `extractExcerpt` are the core matching logic.

---

## PipelineDomain — `pipeline.ts`

**Responsibility**: Pipeline execution engine — runs agent/script tasks in sequence, handles retry/rejection loops.

Key methods: `runAgentTask`, `runWithLimit`, `resolveRejection`, `resolveScriptRejection`, `buildExecuteOptions`, `buildRejectedInstruction`, `getRejectionFeedback`, `getWorkingDirectory`, `findOuterRejectionTarget`

`GRACEFUL_TERMINATION_PROMPT` is the prompt sent when turn/token limits are hit.
Rejection feedback from review agents is stored via `IRejectionFeedbackRepository` (file-based temp storage).

---

## PipelineFileDomain — `pipelineFile.ts`

**Responsibility**: Pipeline JSON file management and git integration for `run` command.

Key methods: `loadRawPipeline`, `savePipeline`, `moveToDone`, `commitMove`, `cleanTmpDir`, `getDiff`, `getDiffStat`, `getDiffSummary`, `getHead`

Manages the `.claude/tmp/` directory for rejection feedback files.

---

## PermissionPipeDomain — `permissionPipe.ts`

**Responsibility**: Inter-process permission request/response channel between the MCP `ask_permission` tool and the TUI.

Key methods: `askPermission`, `pollRequest`, `respond`

The MCP tool writes a permission request; the TUI polls via `pollRequest` and calls `respond`.

---

## ScriptDomain — `script.ts`

**Responsibility**: Executes shell commands within pipelines. Returns `ScriptResult` (stdout, stderr, exitCode).

Key methods: `run(command, cwd)`

---

## TestStrategyDomain — `testStrategy.ts`

**Responsibility**: Analyzes a TypeScript file for test coverage gaps and calculates cyclomatic complexity.

Key methods: `analyze(options)` → `TestStrategyResult`

Pure helpers: `calcComplexity`, `calcSuggestedTestCaseCount`, `isCustomHook`, `isComponent`, `findMatchingTest`, `buildStrategy`, `buildRecommendation`

---

## TsAnalysisDomain — `tsAnalysis.ts`

**Responsibility**: TypeScript AST analysis — symbols, references, type definitions.

Key methods: `analyze(filePath)` → `TypeScriptAnalysis`, `getReferences`, `getReferencesRecursive`, `getTypeDefinitions`

Backs the `ts_analyze`, `ts_get_references`, `ts_get_types` MCP tools.
