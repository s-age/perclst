# Gitignored User Config with Template and Sync Script

**Type:** Discovery

## Context

`src/constants/config.ts` is intentionally excluded from git so users can edit it locally without
merge conflicts. The canonical template lives in `config.default.ts`; a sync script (`sync-config.ts`)
keeps them aligned.

## What happened / What is true

- `config.ts` is listed in `.gitignore` — it is never committed
- `config.default.ts` is committed and tracks the authoritative set of constants
- `scripts/sync-config.ts` performs a **one-way additive merge**:
  - Appends new `export const` declarations from `config.default.ts` to `config.ts`
  - Never overwrites user-modified values
  - Constants removed from `config.default.ts` are left orphaned in `config.ts` (they compile fine
    as unused exports)
- Two npm lifecycle hooks trigger the sync:
  - `postinstall` — fires on `npm install` (fresh clone, CI)
  - `prebuild` — fires before `npm run build` (covers new constants added after a `git pull`)
  - `postinstall` alone is insufficient: it does not fire after `git pull`

## Do

- Trigger `sync-config.ts` from both `postinstall` and `prebuild` to cover all developer workflows
- Keep the sync script additive-only — only append, never overwrite

## Don't

- Don't rely on `postinstall` alone; new constants won't reach developers who only `git pull` + build
- Don't commit `config.ts` — it belongs to the local environment

---

**Keywords:** config.ts, gitignore, config.default.ts, sync-config, postinstall, prebuild, npm lifecycle, user config, additive merge
