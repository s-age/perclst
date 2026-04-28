# importCommand: Use services Override, Not infras Override

**Type:** Discovery

## Context

`importCommand` depends on `ImportService`, which reads from Claude's external JSONL
filesystem (`~/.claude/projects/`) to resolve the working directory and validate
sessions. This external filesystem is unavailable in tests, making infra-level stubbing
ineffective.

## What is true

Stub `ImportService` via `services:` in `setupContainer`, not via `infras:`:

```ts
setupContainer({
  config: buildTestConfig(dir),
  services: {
    importService: { import: vi.fn().mockResolvedValue(session) }
  }
})
```

When `services: { importService: stub }` is passed:
- The stub is registered in the container.
- Other services (`SessionService`, etc.) are still resolved normally.
- Real infras are initialized but not called by import paths.

## Classification rule

- **`infras:` override** — use when the command calls `claudeCodeInfra` (spawns `claude -p`
  via `agentService.start/resume`).
- **`services:` override** — use when a service has external dependencies unavailable
  in tests (external filesystems, third-party APIs, etc.).

## Do

- Identify whether the command is agent-wrapping or pure before choosing the stub level.
- Use `services:` for Phase 3 / complex commands that touch external filesystems.

## Don't

- Stub `claudeCodeInfra` for commands that never call it — the stub has no effect.

---

**Keywords:** importCommand, ImportService, services override, setupContainer, DI, infras, external filesystem
