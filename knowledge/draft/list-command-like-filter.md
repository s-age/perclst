# `--like` filter matches session.name, not task description

**Discovery**: When implementing `listCommand` integration tests, the `--like` filter was expected to match against the initial task string, but it actually matches `session.name ?? ''`.

**Where**: `src/domains/session.ts:68` — `SessionDomain.list()` filters by `(s.name ?? '').includes(filter.like!)`

**Implication**: Sessions created without an explicit `name:` option will never match a non-empty `--like` filter, since `name` defaults to `undefined` and falls back to empty string in the comparison.

**In tests**: Must pass `name:` option to `startCommand` when testing `--like` filtering:
```ts
await startCommand('task', { outputOnly: true, name: 'recognizable-name' })
await listCommand({ like: 'recognizable' })  // matches ✓
```

Without the name, filtering would not work as expected in practice.
