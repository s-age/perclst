import { writeFileSync } from 'fs'
import { join } from 'path'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeTsGetTypes } from '../../tsGetTypes'
import { makeTmpDir, setupTsAnalysisContainer } from '@src/__tests__/helpers'
import type { TypeDefinition } from '@src/types/tsAnalysis'

describe('executeTsGetTypes (integration)', () => {
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
    it('returns type "class" when fixture defines a class with that name', async () => {
      const fixturePath = join(dir, 'fixture.ts')
      writeFileSync(
        fixturePath,
        [
          'export class Animal {',
          '  name: string = ""',
          '  speak(): string { return "" }',
          '}'
        ].join('\n')
      )

      const result = await executeTsGetTypes({ file_path: fixturePath, symbol_name: 'Animal' })
      const parsed = JSON.parse(result.content[0].text) as TypeDefinition

      expect(parsed.type).toBe('class')
    })

    it('returns type "interface" when fixture defines an interface with that name', async () => {
      const fixturePath = join(dir, 'fixture.ts')
      writeFileSync(fixturePath, 'export interface Point { x: number; y: number }\n')

      const result = await executeTsGetTypes({ file_path: fixturePath, symbol_name: 'Point' })
      const parsed = JSON.parse(result.content[0].text) as TypeDefinition

      expect(parsed.type).toBe('interface')
    })
  })

  describe('error path', () => {
    it('returns not-found message in content text when symbol does not exist in the file', async () => {
      const fixturePath = join(dir, 'fixture.ts')
      writeFileSync(fixturePath, 'export const value = 42\n')

      const result = await executeTsGetTypes({
        file_path: fixturePath,
        symbol_name: 'NonExistentSymbol'
      })

      expect(result.content[0].text).toBe('Type definition not found for symbol: NonExistentSymbol')
    })
  })
})
