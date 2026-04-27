# E2E vs Integration Test Naming Convention

**Type:** Discovery

## Context

Applies when deciding where to place test files under `src/cli/commands/__tests__/` and how to
name the subdirectory that holds multi-layer tests that call TypeScript functions directly.

## What is true

| Label | Definition |
|-------|------------|
| **integration** | Calls TypeScript functions directly. DI container, services, and repositories are wired for real. External boundaries (e.g. `ClaudeCodeInfra`) are stubbed. |
| **e2e** | Spawns the CLI binary as a child process (e.g. `perclst start "task"`). Validates stdout and exit code only. |

The directory `src/cli/commands/__tests__/e2e/` was renamed to `integration/` (commit d2b11f6)
because tests there called `startCommand()` as a TypeScript function — not via a spawned binary.

## Why it matters

Calling `startCommand()` directly exercises multiple layers but does **not** test the CLI's
observable behaviour from the outside. Labelling that "e2e" would collide with any future test
that actually spawns `perclst`, creating confusion about what each suite covers.

## Do

- Name a test directory `integration/` when it calls TypeScript entry points directly with real
  DI wiring and stubbed external boundaries.
- Reserve `e2e/` strictly for tests that spawn the compiled CLI binary as a subprocess.

## Don't

- Don't label TypeScript function call tests as `e2e` even if they traverse many layers.
- Don't mix spawned-binary assertions and direct function calls in the same subdirectory.

---

**Keywords:** e2e, integration, test naming, test directory, __tests__, startCommand, CLI tests, subprocess
