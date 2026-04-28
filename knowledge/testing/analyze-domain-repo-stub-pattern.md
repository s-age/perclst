# AnalyzeDomain Commands: Stub claudeSessionRepo, Not claudeCodeInfra

**Type:** Discovery

## Context

Commands that use `AnalyzeService` / `AnalyzeDomain` (e.g. `rewind`, `show`) do not
call `agentService.start/resume` and never invoke `claude -p`. Stubbing `claudeCodeInfra`
for these commands has no effect.

## What is true

These commands follow a "pure session-management" flow:
1. `sessionService.resolveId()` — session CRUD only.
2. `analyzeService.getRewindTurns()` → `claudeSessionRepo.getAssistantTurns()`.

The correct stub target is `claudeSessionRepo` (passed via `repos:` to `setupContainer`).

```ts
function buildClaudeSessionRepoStub(turns: AssistantTurnEntry[]): IClaudeSessionRepository {
  return {
    findEncodedDirBySessionId: vi.fn(() => ''),
    decodeWorkingDir: vi.fn(() => ({ path: null, ambiguous: false })),
    validateSessionAtDir: vi.fn(),
    readSession: vi.fn(() => ({ turns: [], tokens: emptyTokens })),
    scanSessionStats: vi.fn(() => ({ apiCalls: 0, toolCalls: 0, tokens: emptyTokens })),
    getAssistantTurns: vi.fn(() => turns)  // ← vary per test case
  }
}

setupContainer({ config: buildTestConfig(dir), repos: { claudeSessionRepo } })
```

## Gotcha

`AnalyzeDomain.getRewindTurns` **reverses** the input array before mapping:
```ts
turns.reverse().map((t, i) => ({ index: i, uuid: t.uuid, text: t.text }))
```
If the stub returns `[{uuid: 'u0'}, {uuid: 'u1'}]`, the output is
`[{index: 0, uuid: 'u1'}, {index: 1, uuid: 'u0'}]`. Account for this when asserting
on turn index or content.

## Do

- Classify commands that use `AnalyzeDomain` as Type A (pure — no `claudeCodeInfra` needed).
- Stub `claudeSessionRepo` via `repos:` and vary `getAssistantTurns` return value.

## Don't

- Stub `claudeCodeInfra` for analyze-type commands — it is never called.

---

**Keywords:** AnalyzeDomain, AnalyzeService, rewind, show, claudeSessionRepo, getAssistantTurns, stub, repos
