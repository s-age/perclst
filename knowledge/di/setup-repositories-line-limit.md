# setupRepositories max-lines-per-function Lint Limit

**Type:** Problem

## Context

`src/core/di/setupRepositories.ts` has the ESLint rule `max-lines-per-function: 50` applied to the
`setupRepositories` function. Every new repository registration adds lines, making the function grow
toward the limit over time.

## What happened / What is true

- Adding `PlanFileRepository` caused `setupRepositories` to exceed the 50-line lint limit (commit 69508ca).
- The fix was to extract all `container.register` calls into a `registerAll(repos)` helper — the
  same pattern that `setupServices.ts` had used from the start.
- `setupServices.ts` adopted `registerAll()` proactively; `setupRepositories.ts` was refactored
  reactively only after hitting the limit.

## Do

- Check the current line count of `setupRepositories` **before** adding a new repository.
- Extract `container.register` calls into a `registerAll(repos)` helper when approaching 50 lines.
- Use `setupServices.ts` as the reference implementation for the `registerAll` pattern.

## Don't

- Don't add new repository registrations without checking the function's line count first.
- Don't ignore `max-lines-per-function` lint errors — they signal the function needs splitting.

---

**Keywords:** setupRepositories, max-lines-per-function, lint, ESLint, DI container, registerAll, dependency injection, line limit, PlanFileRepository
