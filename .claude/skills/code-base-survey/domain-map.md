# Domain Map

Business logic layer. Each domain enforces a single responsibility and communicates with
repositories via port interfaces (constructor-injected). Domains must NOT import from
`infrastructures/`, `repositories/`, `cli/`, or `services/`.

Entry file for each domain: `src/domains/<name>.ts`
Port consumed by services: `src/domains/ports/<name>.ts`
Port consumed by domains (repo side): `src/repositories/ports/<name>.ts`

---

## SessionDomain — `session.ts`

**Responsibility**: Session lifecycle — creation, persistence, lookup, deletion, status transitions, and label management.

Key methods: `create`, `get`, `list`, `delete`, `save`, `rename`, `setLabels`, `addLabels`, `findByName`, `resolveId`, `updateStatus`, `getPath`, `createRewind`, `sweep`

`resolveId` accepts either a session ID or a name — this is the standard way to accept user input in CLI commands.
`createRewind` forks a session at a past turn (always creates a new session; original is never mutated).
`setLabels` replaces all labels on a session; `addLabels` appends without replacing existing labels.

---

## AgentDomain — `agent.ts`

**Responsibility**: Runs `claude -p` for start, resume, fork, and interactive chat operations. Enforces turn/token limits.

Key methods: `run`, `resume`, `fork`, `isLimitExceeded`, `chat`, `buildChatArgs`

`run(session, instruction, isResume, options)` is the unified entry point; `resume` and `fork` are convenience wrappers.
`chat(session)` hands off to `claude --resume` for interactive use; `buildChatArgs(session)` builds the args array.
`HEADLESS_SKILL_NOTE` is an exported string constant — appended to prompts when running in headless mode.
Depends on `IClaudeCodeRepository` (spawns process) and `IProcedureRepository` (loads procedure prompts).

---

## AnalyzeDomain — `analyze.ts`

**Responsibility**: Reads Claude Code JSONL session files and produces analysis stats and per-session summaries.

Key methods: `analyze(sessionId)` → `AnalyzeResult` (turn breakdown, tool usage, token stats), `formatTurns(turns, filter)` → `TurnRow[]`, `getRewindTurns(sessionId)` → `RewindTurn[]`, `summarize(filter)` → `Promise<SessionSummaryRow[]>`

`summarize` aggregates stats across all matching sessions — backs the `summarize` CLI command.
`buildSummaryStats` is an exported pure function used internally.

---

## CheckerDomain — `checker.ts`

**Responsibility**: Runs the lint → build → test pipeline and aggregates results.

Key methods: `check(options: CheckerOptions)` → `CheckerResult`

Thin orchestrator; actual command execution is in `commandRunner.ts` via `ICheckerRepository`.

---

## GitPendingChangesDomain — `gitPendingChanges.ts`

**Responsibility**: Retrieves the pending (uncommitted) diff for a git repository, filtered by file extension.

Key methods: `getPendingDiff(repoPath: string, extensions: string[])` → `string | null`

Returns `null` when the repo is clean or on error (error swallowing — non-git dirs appear as clean). Backs the `git_pending_changes` MCP tool.

---

## ImportDomain — `sessionImport.ts`

**Responsibility**: Validates a Claude Code session ID for import, resolves its working directory, and builds a perclst session record.

Key methods: `resolveWorkingDir(claudeSessionId)`, `validateSession(claudeSessionId, workingDir)`, `buildSession(claudeSessionId, workingDir, options)` → `Session`

`buildSession` constructs a full `Session` object ready to be persisted — added after initial import support.

---

## KnowledgeSearchDomain — `knowledgeSearch.ts`

**Responsibility**: AND/OR keyword search across `knowledge/` markdown files.

Key methods: `search(options)` → `KnowledgeSearchResult`, `hasDraftEntries()`

Exported pure functions: `parseQuery(query)` → `string[][]`, `extractKeywords(query)` → `string[]`.
Internal helpers (not exported): `matchFile`, `extractTitle`, `extractExcerpt`.

Query syntax: space = AND, `|` = OR.

---

## PermissionPipeDomain — `permissionPipe.ts`

**Responsibility**: Inter-process permission request/response channel between the MCP `ask_permission` tool and the TUI.

Key methods: `askPermission`, `pollRequest`, `respond`

The MCP tool writes a permission request; the TUI polls via `pollRequest` and calls `respond`.

---

## PipelineDomain — `pipeline.ts`

**Responsibility**: Pipeline execution engine — runs agent/script tasks in sequence, handles retry/rejection loops.

Key methods: `runAgentTask`, `resolveRejection`, `resolveScriptRejection`, `buildExecuteOptions`, `buildRejectedInstruction`, `getRejectionFeedback`, `getWorkingDirectory`, `findOuterRejectionTarget`

`GRACEFUL_TERMINATION_PROMPT` is an exported constant — the prompt sent when turn/token limits are hit.
Rejection feedback from review agents is stored via `IRejectionFeedbackRepository` (file-based temp storage).

---

## PipelineFileDomain — `pipelineFile.ts`

**Responsibility**: Pipeline JSON/YAML file management and git integration for `run` command.

Key methods: `loadRawPipeline`, `savePipeline`, `moveToDone`, `commitMove`, `cleanTmpDir`, `getDiff`, `getDiffStat`, `getDiffSummary`, `getHead`

`loadRawPipeline` returns `unknown` — callers are responsible for validation/parsing.
Manages the `.claude/tmp/` directory for rejection feedback files.

---

## PipelineLoaderDomain — `pipelineLoader.ts`

**Responsibility**: Loads and validates a pipeline definition file (JSON or YAML) into a typed `Pipeline` object.

Key methods: `load(absolutePath: string)` → `Pipeline`

Separated from `PipelineFileDomain` to isolate parsing/validation logic. Depends on `IPipelineFileRepository`.

---

## PipelineTaskDomain — `pipelineTask.ts`

**Responsibility**: Mutates pipeline task state — marks tasks as done during pipeline execution.

Key methods: `markTaskDone(pipeline: Pipeline, taskPath: number[], taskIndex: number)` → `void`

`taskPath` is a breadcrumb of nested-pipeline indices; `taskIndex` is the current task's position.

---

## PlanFileDomain — `planFile.ts`

**Responsibility**: Checks for the existence of a plan file at a given path.

Key methods: `exists(absolutePath: string)` → `boolean`

Thin domain wrapping `IPlanFileRepository`. Used to gate plan-based workflows.

---

## ScriptDomain — `script.ts`

**Responsibility**: Executes shell commands within pipelines. Returns `ScriptResult` (stdout, stderr, exitCode).

Key methods: `run(command: string, cwd: string)` → `Promise<ScriptResult>`

---

## TestStrategyDomain — `testStrategy.ts`

**Responsibility**: Analyzes a TypeScript file for test coverage gaps and calculates cyclomatic complexity.

Key methods: `analyze(options: TestStrategyOptions)` → `TestStrategyResult`

Pure helpers (`calcComplexity`, `calcSuggestedTestCaseCount`, `isCustomHook`, `isComponent`, `findMatchingTest`, `buildStrategy`, `buildRecommendation`) live in `src/utils/testStrategyHelpers.ts`.

---

## TsAnalysisDomain — `tsAnalysis.ts`

**Responsibility**: TypeScript AST analysis — symbols, references, type definitions.

Key methods: `analyze(filePath)` → `TypeScriptAnalysis`, `getReferences(filePath, symbolName, options)` → `ReferenceInfo[]`, `getReferencesRecursive(filePath, symbolName, options)` → `RecursiveReferenceInfo[]`, `getTypeDefinitions(filePath, symbolName)` → `TypeDefinition | null`

Backs the `ts_analyze`, `ts_get_references`, `ts_get_types` MCP tools.

---

## TurnsDomain — `turns.ts`

**Responsibility**: Turn display helpers — flatten and filter Claude Code turn arrays for CLI output.

Key functions: `flattenTurns(turns: ClaudeCodeTurn[])` → `TurnRow[]`, `applyRowFilter(rows: TurnRow[], filter: RowFilter)` → `TurnRow[]`

Used by `AnalyzeDomain.formatTurns` and the `show` CLI command.
