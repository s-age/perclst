---
name: session-field-migration
description: Apply lazy normalize() for renamed session JSON fields. Use when renaming a persisted field in the session schema without writing a migration script.
paths:
  - 'src/lib/session/**'
  - 'src/domains/**'
disable-model-invocation: true
---

When a field on a persisted session JSON is renamed, use lazy normalization in `SessionDomain` instead of a migration script. On-disk files stay unchanged; the new field is backfilled at read time on every load.

## Steps

1. **Add `normalize(session)` to `SessionDomain`**:

```typescript
function normalize(session: Session): Session {
  if (!session.metadata) return session
  const meta = session.metadata as Session['metadata'] & { oldField?: OldType }
  if (!meta.newField) {
    meta.newField = meta.oldField ?? defaultValue
  }
  return session
}
```

2. **Guard the parent field first** — always check `!session.metadata` (or whatever the parent is) before accessing nested properties. Without this guard, test mocks and malformed files throw `TypeError: Cannot read properties of undefined`.

3. **Check `!meta.newField`, not `!meta.oldField`** — this correctly handles sessions that already carry the new field, including those with an empty array (empty arrays are truthy, so the condition is `false` and the existing value is left untouched).

4. **Use `?? defaultValue` fallback** — ensures the migrated field is always the correct type even on files that never had the old field at all.

5. **Call `normalize` in every read path** — apply it in `get()` and in `list()` (via `.map(normalize)`). Add it to any future bulk-read methods as they are introduced.

## Rules

- Do not write a migration script to patch files on disk — lazy normalization automatically handles files that appear later (e.g. synced from a backup or another machine).
- Do not skip the parent-field guard — test mocks and minimal objects omit `metadata` and will throw without it.
- Do not apply `normalize` only in `get()` — `list()` returns the same persisted objects and must also backfill.
