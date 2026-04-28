import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeTsTestStrategist } from '../../tsTestStrategist'
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
    it('.git ルートまで遡って __tests__ ディレクトリからテストファイルを発見する', async () => {
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
    it('隣接テストファイルがあるとき既存テスト名が strategies に反映される', async () => {
      const targetPath = join(dir, 'util.ts')
      const testDir = join(dir, '__tests__')
      mkdirSync(testDir, { recursive: true })

      writeFileSync(
        targetPath,
        'export function double(n: number): number { return n * 2 }'
      )
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
    it('package.json に vitest があるとき framework が vitest として検出される', async () => {
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

    it('package.json が存在しないとき framework が jest にフォールバックする', async () => {
      const subDir = join(dir, 'deep', 'nested')
      mkdirSync(subDir, { recursive: true })
      const targetPath = join(subDir, 'func.ts')
      writeFileSync(targetPath, 'export function noop(): void {}')

      const result = await executeTsTestStrategist({ target_file_path: targetPath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.strategies.length).toBeGreaterThan(0)
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
