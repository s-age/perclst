# ts-morph Project Constructor Is Expensive with tsConfigFilePath

**Type:** External

## Context

Applies whenever a unit test instantiates `new Project({ tsConfigFilePath: '...' })` directly or
indirectly (e.g. through `TsAnalyzer` or any other wrapper). The cost shows up in the MCP tool
test suite where `ts-morph` is the underlying engine.

## What happened / What is true

`new Project({ tsConfigFilePath: 'tsconfig.json' })` eagerly scans and loads **all** TypeScript
source files referenced by the config. On a medium-sized project this easily takes several seconds,
exceeding Vitest's default 5 000 ms timeout and causing flaky or failing tests.

## Do

- Mock `ts-morph` in unit tests: `vi.mock('ts-morph')` and control the constructor via
  `vi.mocked(Project).mockImplementation(function(this: unknown) { ... })`
- When fast construction without a full scan is needed at runtime, pass
  `{ skipAddingFilesFromTsConfig: true }` and add only the required files explicitly

## Don't

- Don't call `new Project({ tsConfigFilePath })` in any test that isn't explicitly an integration
  test with a generous timeout override
- Don't rely on the default Vitest timeout (5 000 ms) for any test that touches a real
  `ts-morph` Project

---

**Keywords:** ts-morph, Project, constructor, performance, vitest, timeout, skipAddingFilesFromTsConfig, TsAnalyzer, test
