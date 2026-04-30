# Pipeline Pattern
implement-integration-test

# Goal

Add E2E tests for `startCommand` / `resumeCommand` with only `ClaudeCodeInfra` stubbed.
Tests verify the service → domain → repository → real FsInfra path without spawning a claude process.

# Key Design Decisions

- **Stub boundary: `ClaudeCodeInfra` only** — FsInfra and other infra use real implementations to preserve integration depth.
- **`setupContainer({ config, infras: { claudeCodeInfra: stub } })`** — `sessions_dir` pointed at `mkdtempSync` tmpdir via config override.
- **Mock output/display/prompt + `process.exit`** — I/O layers are not E2E verification targets.
- **`outputOnly: true`** — bypasses interactive branches (`confirmIfDuplicateName`, `handleWorkingDirMismatch`); no TTY setup needed.
- **File naming: `*.e2e.test.ts`** under `src/cli/commands/__tests__/e2e/` — picked up by default vitest glob, no config change required.
- **1 file = 1 Vitest worker** — `setupContainer` mutates a container singleton; `isolate: true` (default) prevents cross-file state pollution.
