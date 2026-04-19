# Test File Organization for Large Suites

**Type:** Discovery

## Context

When writing comprehensive unit tests for complex modules, single test files can easily exceed the project's 300-line eslint limit. This happens when a module has multiple functions with high cyclomatic complexity (8–18) that each require 4–8+ test cases.

## What is true

- Test files in this project live at `{dir}/__tests__/{stem}.test.ts` (not alongside source files)
- Import paths from test files must use `../` to traverse out of the `__tests__/` subdirectory
- The eslint `max-lines` rule enforces a 300-line limit per test file
- Splitting a large test suite by function grouping (one file per high-complexity function) keeps each file manageable while maintaining semantic organization
- When a module has multiple functions of varying complexity, one file per function is clearer than grouping by complexity level

## Pattern: claudeSessionParser example

For a module with 7 functions and 39 total test cases:

- **High complexity (≥9)**: One file per function
  - `claudeSessionParser.processAssistantEntry.test.ts` (complexity 18, 8 tests, ~190 lines)
  - `claudeSessionParser.buildTurns.test.ts` (complexity 9, 8 tests, ~165 lines)
- **Medium complexity (6–8)**: One file for simpler functions or group together
  - `claudeSessionParser.buildSummaryStats.test.ts` (complexity 6, 4 tests, ~80 lines)
- **Low complexity (<6)**: Combine in main file
  - `claudeSessionParser.test.ts` (3 functions, 14 tests, ~260 lines)

## Do

- Create a separate file for each function with cyclomatic complexity ≥9 and ≥6 test cases
- Name files `{source}.{functionName}.test.ts` to make relationships explicit
- Group simpler functions (complexity <6, <3 tests) in a shared `{source}.test.ts` file
- Test import paths will always traverse one level up: `'../{source}'`

## Don't

- Don't combine high-complexity functions in one file just to avoid creating new files
- Don't place test files at the same level as source files (`*.test.ts` next to `*.ts`)
- Don't rely on relative complexity sorting alone—organize by function semantic groups

---

**Keywords:** test organization, eslint max-lines, test file structure, __tests__ directory
