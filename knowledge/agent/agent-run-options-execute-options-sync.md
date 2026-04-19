# AgentRunOptions and ExecuteOptions Must Stay in Sync

**Type:** Discovery

## Context

`AgentService` uses two related but separate option types:
- `AgentRunOptions` — declared in `agentService.ts`, consumed by `AgentService.start/resume`
- `ExecuteOptions` — declared in `types/agent.ts`, passed down to `dispatch`

They are structurally overlapping, and `AgentService.start/resume` constructs `ExecuteOptions`
via `{ ...options, sessionFilePath }`. Any new field added to `AgentRunOptions` must also
exist on `ExecuteOptions`, or it will be silently dropped.

## What happened / What is true

- When `onStreamEvent` was added for real-time streaming, it had to be added to **both** types.
- Because `AgentService` spreads `options` (of type `AgentRunOptions`) directly into the
  `ExecuteOptions` constructor, new fields flow automatically at runtime — but TypeScript will
  only accept them if both type declarations include the field.
- There is no shared base type enforcing this; it is a manual convention.

## Do

- When adding a new option field to `AgentRunOptions`, add the identical field to `ExecuteOptions`
  at the same time.
- Verify with `ts_checker` after any option-type change to catch missing fields early.

## Don't

- Don't add a field only to `AgentRunOptions` and assume it reaches `dispatch` — TypeScript
  will compile but the field will be present only by coincidence of the spread.
- Don't rely on structural typing alone; keep both type declarations explicitly in sync.

---

**Keywords:** AgentRunOptions, ExecuteOptions, option types, sync, spread, agentService, dispatch
