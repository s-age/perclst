# Session Field Rename: normalize() Migration Pattern

**Type:** Discovery

## Context

When a field on a persisted session JSON is renamed, existing files on disk still carry
the old name. This pattern describes how `SessionDomain` handles backward compatibility
at load time without a migration script or schema version bump.

## What happened / What is true

`metadata.tags` was renamed to `metadata.labels`. Rather than migrating all existing
session files on disk, a `normalize(session)` function was added to `SessionDomain`.
It reads the old field and backfills the new one lazily on every `get()` and `list()` call:

```typescript
function normalize(session: Session): Session {
  if (!session.metadata) return session
  const meta = session.metadata as Session['metadata'] & { tags?: string[] }
  if (!meta.labels) {
    meta.labels = meta.tags ?? []
  }
  return session
}
```

Key details:
- Called in `get()` and in `list()` (via `.map(normalize)`)
- `if (!meta.labels)` is safe even when `labels: []` is present — empty arrays are truthy,
  so the condition is `false` and the already-present empty array is left untouched
- The guard `if (!session.metadata) return session` is required because test mocks
  (and theoretically malformed files) may omit the `metadata` key entirely; without it,
  the function throws `TypeError: Cannot read properties of undefined (reading 'labels')`

## Do

- Add a `normalize()` function in the domain layer for any load-time field migration
- Guard against `!session.metadata` (or any parent field) before accessing nested properties
- Call `normalize` in every read path (`get`, `list`, and any future bulk-read methods)
- Use `?? []` fallback so the migrated field is always the correct type even on old data

## Don't

- Don't write one-off migration scripts to patch session files on disk — lazy normalization
  keeps the codebase simpler and handles files that appear later (e.g. synced from backup)
- Don't skip the `metadata` guard assuming all session objects are fully shaped — minimal
  objects from tests or corrupted files will break without it

---

**Keywords:** normalize, field rename, migration, backward compatibility, metadata, labels, tags, session domain, lazy migration
