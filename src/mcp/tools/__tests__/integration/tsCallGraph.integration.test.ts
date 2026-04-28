import { writeFileSync } from 'fs'
import { join } from 'path'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeTsCallGraph } from '../../tsCallGraph'
import { setupContainer } from '@src/core/di/setup'
import { makeTmpDir, buildTestConfig } from '@src/__tests__/helpers'

describe('executeTsCallGraph (integration)', () => {
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
    it('output contains funcB as a child node when funcA calls funcB', async () => {
      const fixturePath = join(dir, 'fixture.ts')
      writeFileSync(
        fixturePath,
        [
          'export function funcB(): string {',
          '  return "hello"',
          '}',
          '',
          'export function funcA(): string {',
          '  return funcB()',
          '}'
        ].join('\n')
      )

      const result = await executeTsCallGraph({ file_path: fixturePath })

      expect(result.content[0].text).toMatch(/└── .*::funcB/)
    })

    it('returns "(no calls found)" when fixture has no exported functions', async () => {
      const fixturePath = join(dir, 'no-exports.ts')
      writeFileSync(fixturePath, 'const localVar = 42\n')

      const result = await executeTsCallGraph({ file_path: fixturePath })

      expect(result.content[0].text).toBe('(no calls found)')
    })
  })

  describe('error path', () => {
    it('throws when the file path does not exist', async () => {
      const nonExistentPath = join(dir, 'nonexistent.ts')

      await expect(executeTsCallGraph({ file_path: nonExistentPath })).rejects.toThrow()
    })
  })
})
