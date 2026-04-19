# ESLint max-lines-per-function Gotchas

**Type:** Problem

## Context

Applies when configuring `max-lines-per-function` in ESLint for a project that has
both `.tsx` (React components) and `.ts` (custom hooks, utilities) files, and uses
Prettier as a formatter. Two independent gotchas can cause unexpected lint failures.

## What happened / What is true

**Gotcha 1 — `.ts` hooks don't inherit `.tsx` relaxed limits**

If `max-lines-per-function` is set to a higher limit (e.g. 75) for `*.tsx` files only,
custom hooks extracted to `.ts` files fall under the stricter default limit (e.g. 50).
`usePipelineRun.ts` was 57 lines and triggered warnings because the relaxed rule only
applied to `*.tsx`.

Resolution: extracted the heavy logic from the hook into a module-level pure function
(`runPipeline`), keeping the hook itself thin (state + `useEffect` wiring only).

**Gotcha 2 — Prettier inflates line counts after formatting**

A function written at 49 lines by hand can become 51 lines after `prettier --write`
due to multi-line object literal expansion. ESLint evaluates the *post-format* file,
so a function that looks fine before formatting can fail after.

## Do

- Keep `.ts` custom hooks under 50 lines; delegate heavy logic to module-level pure functions
- Always run `npx prettier --write && npm run lint` (in that order) when a function is near the limit
- Treat the post-Prettier line count as the authoritative count

## Don't

- Assume `.tsx` lint overrides apply to `.ts` files with the same filename prefix
- Run `npm run lint` alone when checking a near-limit function — Prettier may not have run yet
- Write hooks that mix state management with heavy business logic

---

**Keywords:** ESLint, max-lines-per-function, Prettier, custom hooks, tsx, ts, lint, line count, formatting
