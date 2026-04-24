# src/cli — Command file map

| File | Command | Description |
|------|---------|-------------|
| `index.ts` | (root) | Calls `setupContainer()`, registers all commands, calls `program.parse()` |
| `display.ts` | (shared) | `printResponse()`, `printStreamEvent()` — all terminal output formatting |
| `commands/start.ts` | `start <task>` | Creates and runs a new agent session |
| `commands/resume.ts` | `resume <session-id> <instruction>` | Resumes an existing session |
| `commands/fork.ts` | `fork <session-id> <prompt>` | Forks a session into a new independent session |
| `commands/list.ts` | `list` | Lists all sessions with optional label/name filters |
| `commands/show.ts` | `show <session-id>` | Prints session metadata or full JSON |
| `commands/delete.ts` | `delete <session-id>` | Removes a session |
| `commands/rename.ts` | `rename <session-id> <name>` | Sets a display name (and optionally labels) |
| `commands/tag.ts` | `tag <session-id> <labels...>` | Sets labels on a session (replaces existing) |
| `commands/analyze.ts` | `analyze <session-id>` | Analyzes a Claude Code jsonl session |
| `commands/import.ts` | `import <claude-session-id>` | Imports a raw Claude Code session |
| `commands/rewind.ts` | `rewind [session-id] [index]` | Lists or creates a rewind point for a session |
| `commands/sweep.ts` | `sweep` | Bulk-deletes sessions within a date range |
| `commands/curate.ts` | `curate` | Promotes `knowledge/draft/` entries into structured knowledge files |
| `commands/retrieve.ts` | `retrieve <keywords...>` | Searches the knowledge base by keyword |
| `commands/survey.ts` | `survey [query]` | Surveys the codebase for investigation or pre-implementation research |
| `commands/inspect.ts` | `inspect <old> <new>` | Runs a pre-push code inspection between two git refs |
| `commands/run.ts` | `run <pipeline-path>` | Executes a pipeline of agent tasks from a JSON file |
| `commands/summarize.ts` | `summarize` | Aggregates statistics across sessions |
| `commands/chat.ts` | `chat <session>` | Resumes a session interactively in Claude Code |
| `components/parts/PipelineRunner/` | (internal) | TUI and pipeline-execution components used by `run` |
