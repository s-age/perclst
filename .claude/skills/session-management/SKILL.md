---
name: session-management
description: Use this skill when working with session CRUD operations, session storage, session types, or anything in src/infrastructure/ or src/services/. Covers SessionService, FileSessionRepository, Session types, and session file format.
paths:
  - src/infrastructure/file-session-repository.ts
  - src/infrastructure/claudeSessionReader.ts
  - src/services/sessionService.ts
  - src/repositories/sessionRepository.ts
---

# Session Management

## Files
- `src/services/sessionService.ts` — `SessionService`: create / get / list / delete / updateStatus
- `src/infrastructure/file-session-repository.ts` — `FileSessionRepository`: read/write to JSON files in the sessions/ directory
- `src/infrastructure/claudeSessionReader.ts` — `readClaudeSession`: parse Claude Code `.jsonl` session files
- `src/repositories/sessionRepository.ts` — `ISessionRepository` type contract
- `src/types/session.ts` — `Session`, `CreateSessionParams` types

## Key Structures

```typescript
Session {
  id: string           // randomUUID()
  created_at / updated_at: ISO string
  procedure?: string
  claude_session_id: string
  working_dir: string
  metadata: { parent_session_id?, tags: string[], status: 'active'|'completed'|'failed' }
}
```

## Notes
- Session files are stored at `sessions/<uuid>.json`
- `FileSessionRepository` calls `mkdirSync` in its constructor to auto-create the directory
- `list()` returns sessions sorted by `updated_at` descending
