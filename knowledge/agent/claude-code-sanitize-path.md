# Claude Code Project Directory Path Encoding

**Type:** Discovery

## Context

When perclst needs to locate Claude Code's stored session files, it must reconstruct
the directory name Claude Code uses under `~/.claude/projects/`. Claude Code encodes
the working directory path via a `sanitizePath` function that differs from naive
slash-replacement and must be matched exactly for session lookup to succeed.

## What happened / What is true

Claude Code's `sanitizePath` (in `src/utils/sessionStoragePortable.ts`):

```typescript
export function sanitizePath(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '-')
  if (sanitized.length <= 200) return sanitized
  const hash = typeof Bun !== 'undefined' ? Bun.hash(name).toString(36) : simpleHash(name)
  return `${sanitized.slice(0, 200)}-${hash}`
}
```

- Every non-alphanumeric character (slashes, underscores, dots, colons, spaces) → `-`
- Example: `/Users/s-age/my_project` → `-Users-s-age-my-project`
- Paths exceeding 200 sanitized characters are truncated to 200 chars + `-` + hash suffix
- Claude Code runs under **Bun** and uses `Bun.hash` for the hash suffix on long paths
- perclst runs under **Node.js**; `Bun.hash` is unavailable, so a djb2 fallback produces
  a **different hash value** — the two runtimes will disagree on the directory name

For paths ≤ 200 chars after sanitizing (the vast majority of real projects), no hash
is involved and there is no mismatch.

**Fix in perclst**: `resolveProjectDir` in `claudeSessions.ts` falls back to a glob
prefix scan (`~/.claude/projects/<first-200-chars>*`) when the exact computed path
does not exist on disk, handling the Bun/Node hash difference transparently.

## Do

- Replace **all** non-alphanumeric characters with `-` when reconstructing the Claude
  project directory name (not just slashes)
- Use a glob prefix scan as fallback for paths > 200 chars to handle the Bun/Node
  hash mismatch

## Don't

- Don't use only slash-replacement (`workingDir.replace(/\//g, '-')`) — this was the
  previous wrong implementation that caused session files to be unfindable for projects
  with underscores or other special characters in their path
- Don't assume an exact match for paths > 200 chars without the glob fallback

---

**Keywords:** sanitizePath, project directory, claude projects, path encoding, Bun.hash, djb2, session lookup, encodeWorkingDir, hash mismatch, resolveProjectDir
