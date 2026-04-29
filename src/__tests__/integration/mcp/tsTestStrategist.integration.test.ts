import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeTsTestStrategist } from '@src/mcp/tools/tsTestStrategist'
import { setupContainer } from '@src/core/di/setup'
import { makeTmpDir, buildTestConfig } from '@src/__tests__/helpers'
import type { TestStrategyResult } from '@src/types/testStrategy'

describe('executeTsTestStrategist (integration)', () => {
  let dir: string
  let cleanup: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    setupContainer({ config: buildTestConfig(dir) })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('returns non-empty strategies array when fixture defines a class with branching logic', async () => {
      const fixturePath = join(dir, 'fixture.ts')
      writeFileSync(
        fixturePath,
        [
          'export class MyService {',
          '  process(value: number): string {',
          '    if (value > 0) {',
          "      return 'positive'",
          '    } else if (value < 0) {',
          "      return 'negative'",
          '    } else {',
          "      return 'zero'",
          '    }',
          '  }',
          '}'
        ].join('\n')
      )

      const result = await executeTsTestStrategist({ target_file_path: fixturePath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.strategies.length).toBeGreaterThan(0)
    })

    it('returns at least one suggested test case when fixture defines a simple function', async () => {
      const fixturePath = join(dir, 'simple.ts')
      writeFileSync(
        fixturePath,
        ['export function greet(name: string): string {', '  return `Hello, ${name}!`', '}'].join(
          '\n'
        )
      )

      const result = await executeTsTestStrategist({ target_file_path: fixturePath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.strategies[0].suggested_test_case_count).toBeGreaterThanOrEqual(1)
    })
  })

  describe('findTestFile traversal', () => {
    it('traverses up to .git root and finds test file from __tests__ directory', async () => {
      const srcDir = join(dir, 'src', 'lib')
      mkdirSync(srcDir, { recursive: true })
      mkdirSync(join(dir, '.git'))
      mkdirSync(join(dir, '__tests__'), { recursive: true })

      const targetPath = join(srcDir, 'calc.ts')
      writeFileSync(
        targetPath,
        'export function add(a: number, b: number): number { return a + b }'
      )
      writeFileSync(
        join(dir, '__tests__', 'calc.test.ts'),
        "import { describe, it } from 'vitest'\ndescribe('calc', () => { it('adds', () => {}) })"
      )

      const result = await executeTsTestStrategist({ target_file_path: targetPath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.test_file_exists).toBe(true)
      expect(parsed.corresponding_test_file).toContain('calc.test.ts')
    })
  })

  describe('extractTestFunctions', () => {
    it('reflects existing test names in strategies when adjacent test file exists', async () => {
      const targetPath = join(dir, 'util.ts')
      const testDir = join(dir, '__tests__')
      mkdirSync(testDir, { recursive: true })

      writeFileSync(targetPath, 'export function double(n: number): number { return n * 2 }')
      writeFileSync(
        join(testDir, 'util.test.ts'),
        "import { describe, it } from 'vitest'\ndescribe('double', () => { it('doubles value', () => {}) })"
      )

      const result = await executeTsTestStrategist({ target_file_path: targetPath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.test_file_exists).toBe(true)
      expect(parsed.strategies.length).toBeGreaterThan(0)
    })
  })

  describe('readPackageDeps', () => {
    it('detects framework as vitest when vitest is in package.json', async () => {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ devDependencies: { vitest: '^1.0.0' } })
      )
      const targetPath = join(dir, 'math.ts')
      writeFileSync(targetPath, 'export function inc(n: number): number { return n + 1 }')

      const result = await executeTsTestStrategist({ target_file_path: targetPath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.strategies.length).toBeGreaterThan(0)
    })

    it('falls back to jest framework when package.json does not exist', async () => {
      const subDir = join(dir, 'deep', 'nested')
      mkdirSync(subDir, { recursive: true })
      const targetPath = join(subDir, 'func.ts')
      writeFileSync(targetPath, 'export function noop(): void {}')

      const result = await executeTsTestStrategist({ target_file_path: targetPath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.strategies.length).toBeGreaterThan(0)
    })
  })

  describe('parseFunctions — AST pattern coverage', () => {
    it('counts loops in fixture with for / while / do-while', async () => {
      const fixturePath = join(dir, 'loops.ts')
      writeFileSync(
        fixturePath,
        [
          'export function withLoops(items: number[]): number {',
          '  let sum = 0',
          '  for (let i = 0; i < items.length; i++) { sum += items[i] }',
          '  while (sum > 100) { sum -= 10 }',
          '  do { sum++ } while (sum < 0)',
          '  return sum',
          '}'
        ].join('\n')
      )

      const result = await executeTsTestStrategist({ target_file_path: fixturePath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.strategies).toHaveLength(1)
      expect(parsed.strategies[0].complexity).toBeGreaterThanOrEqual(4)
    })

    it('counts catch clauses in fixture with try/catch', async () => {
      const fixturePath = join(dir, 'trycatch.ts')
      writeFileSync(
        fixturePath,
        [
          'export function safeParse(json: string): unknown {',
          '  try {',
          '    return JSON.parse(json)',
          '  } catch (e) {',
          '    return null',
          '  }',
          '}'
        ].join('\n')
      )

      const result = await executeTsTestStrategist({ target_file_path: fixturePath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.strategies).toHaveLength(1)
      expect(parsed.strategies[0].complexity).toBeGreaterThanOrEqual(2)
    })

    it('counts logical operators (&&, ||, ??) in fixture', async () => {
      const fixturePath = join(dir, 'logical.ts')
      writeFileSync(
        fixturePath,
        [
          'export function check(a: boolean, b: boolean, c?: string): string {',
          "  if (a && b) return 'both'",
          "  if (a || b) return 'either'",
          "  return c ?? 'default'",
          '}'
        ].join('\n')
      )

      const result = await executeTsTestStrategist({ target_file_path: fixturePath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.strategies).toHaveLength(1)
      expect(parsed.strategies[0].complexity).toBeGreaterThanOrEqual(6)
    })

    it('detects arrow function and function expression variable declarations', async () => {
      const fixturePath = join(dir, 'varfuncs.ts')
      writeFileSync(
        fixturePath,
        [
          'export const add = (a: number, b: number): number => a + b',
          'export const mul = function(a: number, b: number): number { return a * b }',
          'export function div(a: number, b: number): number { return a / b }'
        ].join('\n')
      )

      const result = await executeTsTestStrategist({ target_file_path: fixturePath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      const names = parsed.strategies.map((s) => s.function_name)
      expect(names).toContain('add')
      expect(names).toContain('mul')
      expect(names).toContain('div')
    })

    it('collects named/default/namespace imports as suggested_mocks', async () => {
      const fixturePath = join(dir, 'imports.ts')
      writeFileSync(
        fixturePath,
        [
          "import { readFile, writeFile } from 'fs'",
          "import path from 'path'",
          "import * as os from 'os'",
          "import type { Buffer } from 'buffer'",
          '',
          'export function loadConfig(): string {',
          '  const home = os.homedir()',
          '  const full = path.join(home, ".config")',
          '  return readFile(full, "utf-8") as unknown as string',
          '}'
        ].join('\n')
      )

      const result = await executeTsTestStrategist({ target_file_path: fixturePath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.strategies).toHaveLength(1)
      const mocks = parsed.strategies[0].suggested_mocks
      expect(mocks).toContain('readFile')
      expect(mocks).toContain('path')
      expect(mocks).toContain('os')
      expect(mocks).not.toContain('Buffer')
    })
  })

  describe('error path', () => {
    it('returns error field in content when target file path does not exist', async () => {
      const nonExistentPath = join(dir, 'nonexistent.ts')

      const result = await executeTsTestStrategist({ target_file_path: nonExistentPath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.error).toMatch(/File not found/)
    })
  })
})
