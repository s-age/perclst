# Typing Infrastructure Stubs in CLI Tests

**Type:** Problem

## Context

Applies when writing stubs for infrastructure classes (e.g. `ClaudeCodeInfra`) inside tests
that live under `src/cli/`. The architecture rules control which layers each directory may import.

## What happened

Importing `ClaudeCodeInfra` directly from `@src/infrastructures/claudeCode` inside a CLI test
violates the arch rule: `cli` is not allowed to import `infrastructures`.

```ts
// ❌ Arch violation — cli cannot import infrastructures
import type { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
```

## Solution

Import the `Infras` aggregate type from `@src/core/di/setupInfrastructures` instead. `core/di`
is on the CLI's allow-list. Index into it to get the exact member type:

```ts
// ✅ Allowed — core/di is importable from cli
import type { Infras } from '@src/core/di/setupInfrastructures'

export function buildClaudeCodeStub(lines: string[]): Infras['claudeCodeInfra'] {
  return {
    resolveJsonlPath: vi.fn(() => '/dev/null'),
    // ...
  } as unknown as Infras['claudeCodeInfra']
}
```

`Infras['claudeCodeInfra']` resolves to `ClaudeCodeInfra` structurally, with no arch violation.

## Do

- Source stub return types from `Infras['<member>']` (`@src/core/di/setupInfrastructures`)
  when in CLI test code.

## Don't

- Don't import types directly from `@src/infrastructures/*` in CLI tests.
- Don't import infrastructure utilities such as `readJson` in CLI tests; use
  `readFileSync` + `JSON.parse` from Node.js instead.

---

**Keywords:** cli test, infrastructure stub, Infras, ClaudeCodeInfra, arch violation, import allowlist, core/di, type import
