---
name: session-management
description: Use this skill when working with session CRUD operations, session storage, session types, or anything in src/lib/session/. Covers SessionManager, SessionStorage, Turn/Session types, and session file format.
paths:
  - src/lib/session/**
---

# Session Management

## Files
- `src/lib/session/manager.ts` — `SessionManager`: create / get / list / delete / addTurn / updateStatus / updateSummary
- `src/lib/session/storage.ts` — `SessionStorage`: read/write to JSON files in the sessions/ directory
- `src/lib/session/types.ts` — `Session`, `Turn`, `CreateSessionParams`, `ResumeSessionParams`

## Key Structures

```typescript
Session {
  id: string           // randomUUID()
  created_at / updated_at: ISO string
  procedure?: string
  metadata: { parent_session_id?, tags: string[], status: 'active'|'completed'|'failed' }
  turns: Turn[]
  summary?: string
}

Turn {
  role: 'user' | 'assistant'
  content: string
  timestamp: ISO string
  model?: string
  usage?: { input_tokens, output_tokens, cache_read_input_tokens?, cache_creation_input_tokens? }
  thoughts?: ThinkingBlock[]
  tool_history?: ToolUseRecord[]
}
```

## Notes
- Session files are stored at `sessions/<uuid>.json`
- `SessionStorage` calls `mkdirSync` in its constructor to auto-create the directory
- `list()` returns sessions sorted by `updated_at` descending
