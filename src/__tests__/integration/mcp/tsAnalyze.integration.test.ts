import { writeFileSync } from 'fs'
import { join } from 'path'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeTsAnalyze } from '@src/mcp/tools/tsAnalyze'
import { makeTmpDir, setupTsAnalysisContainer } from '@src/__tests__/helpers'
import type { TypeScriptAnalysis } from '@src/types/tsAnalysis'

describe('executeTsAnalyze (integration)', () => {
  let dir: string
  let cleanup: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    setupTsAnalysisContainer(dir)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('returns non-empty symbols array when fixture defines a class and a function', async () => {
      const fixturePath = join(dir, 'fixture.ts')
      writeFileSync(
        fixturePath,
        [
          'export class MyClass {',
          '  constructor(private name: string) {}',
          '  greet(): string { return "hello" }',
          '}',
          '',
          'export function myFunction(): void {',
          '  console.log("hello")',
          '}'
        ].join('\n')
      )

      const result = await executeTsAnalyze({ file_path: fixturePath })
      const parsed = JSON.parse(result.content[0].text) as TypeScriptAnalysis

      expect((parsed.symbols ?? []).length).toBeGreaterThan(0)
    })

    it('returns empty exports array when fixture has no export statements', async () => {
      const fixturePath = join(dir, 'no-exports.ts')
      writeFileSync(fixturePath, 'const localVar = 42\n')

      const result = await executeTsAnalyze({ file_path: fixturePath })
      const parsed = JSON.parse(result.content[0].text) as TypeScriptAnalysis

      expect(parsed.exports ?? []).toHaveLength(0)
    })
  })

  describe('error path', () => {
    it('throws when the file path does not exist', async () => {
      const nonExistentPath = join(dir, 'nonexistent.ts')

      await expect(executeTsAnalyze({ file_path: nonExistentPath })).rejects.toThrow()
    })
  })
})
