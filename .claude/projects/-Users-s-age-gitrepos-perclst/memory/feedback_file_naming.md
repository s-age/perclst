---
name: File naming and interface conventions
description: New TypeScript files must use camelCase names; interface keyword is banned by ESLint — use type instead
type: feedback
---

New TypeScript files should use camelCase naming (e.g., `sessionRepository.ts`, not `session-repository.ts`).

**Why:** User preference; ESLint also bans the `interface` keyword so all type contracts must use `type` instead.

**How to apply:** When creating new .ts files, use camelCase for the filename. Replace all `interface` declarations with `type`. Applies to repos, services, ports, and any other new files.
