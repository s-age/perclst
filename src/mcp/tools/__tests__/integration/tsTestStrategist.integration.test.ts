import { writeFileSync } from 'fs'
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

  describe('error path', () => {
    it('returns error field in content when target file path does not exist', async () => {
      const nonExistentPath = join(dir, 'nonexistent.ts')

      const result = await executeTsTestStrategist({ target_file_path: nonExistentPath })
      const parsed = JSON.parse(result.content[0].text) as TestStrategyResult

      expect(parsed.error).toMatch(/File not found/)
    })
  })
})
