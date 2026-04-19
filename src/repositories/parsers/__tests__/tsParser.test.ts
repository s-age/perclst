import { describe, it, expect, beforeEach, vi } from 'vitest'
import { extractTestFunctions, detectFramework } from '../tsParser'
import * as fsModule from '@src/infrastructures/fs'

vi.mock('@src/infrastructures/fs')

describe('extractTestFunctions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array if test file does not exist', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(false)

    const result = extractTestFunctions('nonexistent.test.ts')

    expect(result).toEqual([])
  })

  it('extracts single test name from it() with single quotes', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readText).mockReturnValue("it('should do something', () => {})")

    const result = extractTestFunctions('test.ts')

    expect(result).toContain('should do something')
  })

  it('extracts single test name from it() with double quotes', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readText).mockReturnValue('it("should work", () => {})')

    const result = extractTestFunctions('test.ts')

    expect(result).toContain('should work')
  })

  it('extracts test name from it() with backticks', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readText).mockReturnValue('it(`should do template`, () => {})')

    const result = extractTestFunctions('test.ts')

    expect(result).toContain('should do template')
  })

  it('extracts test name from test() call', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readText).mockReturnValue("test('another test', () => {})")

    const result = extractTestFunctions('test.ts')

    expect(result).toContain('another test')
  })

  it('extracts test name from it.skip() call', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readText).mockReturnValue("it.skip('skipped test', () => {})")

    const result = extractTestFunctions('test.ts')

    expect(result).toContain('skipped test')
  })

  it('extracts test name from test.skip() call', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readText).mockReturnValue("test.skip('skipped test 2', () => {})")

    const result = extractTestFunctions('test.ts')

    expect(result).toContain('skipped test 2')
  })

  it('extracts multiple test functions from single file', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readText).mockReturnValue(`
      it('first test', () => {})
      it('second test', () => {})
      test('third test', () => {})
    `)

    const result = extractTestFunctions('test.ts')

    expect(result).toHaveLength(3)
    expect(result).toContain('first test')
    expect(result).toContain('second test')
    expect(result).toContain('third test')
  })

  it('ignores commented out test definitions', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readText).mockReturnValue(`
      // it('commented test', () => {})
      it('real test', () => {})
    `)

    const result = extractTestFunctions('test.ts')

    expect(result).toContain('real test')
  })

  it('extracts test names with special characters', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readText).mockReturnValue("it('should handle @#$ chars', () => {})")

    const result = extractTestFunctions('test.ts')

    expect(result).toContain('should handle @#$ chars')
  })

  it('handles empty test file', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readText).mockReturnValue('')

    const result = extractTestFunctions('empty.test.ts')

    expect(result).toEqual([])
  })

  it('handles test file with no test definitions', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readText).mockReturnValue('const x = 42\nconst y = 43')

    const result = extractTestFunctions('notest.ts')

    expect(result).toEqual([])
  })
})

describe('detectFramework', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns vitest when vitest in dependencies', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readJson).mockReturnValue({
      dependencies: { vitest: '^1.0.0' }
    })

    const result = detectFramework('/project/src/file.ts')

    expect(result).toBe('vitest')
  })

  it('returns vitest when vitest in devDependencies', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readJson).mockReturnValue({
      devDependencies: { vitest: '^1.0.0' }
    })

    const result = detectFramework('/project/src/file.ts')

    expect(result).toBe('vitest')
  })

  it('returns jest as default when vitest not found', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readJson).mockReturnValue({
      dependencies: { jest: '^29.0.0' }
    })

    const result = detectFramework('/project/src/file.ts')

    expect(result).toBe('jest')
  })

  it('returns jest when no package.json found', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(false)

    const result = detectFramework('/project/src/file.ts')

    expect(result).toBe('jest')
  })

  it('searches up directory tree for package.json', () => {
    vi.mocked(fsModule.fileExists)
      .mockReturnValueOnce(false) // nested/package.json
      .mockReturnValueOnce(true) // parent/package.json

    vi.mocked(fsModule.readJson).mockReturnValue({
      devDependencies: { vitest: '^1.0.0' }
    })

    const result = detectFramework('/project/nested/file.ts')

    expect(result).toBe('vitest')
  })

  it('stops searching after 20 levels', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(false)

    const result = detectFramework('/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/file.ts')

    expect(result).toBe('jest')
  })

  it('handles readJson errors gracefully', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readJson).mockImplementation(() => {
      throw new Error('Invalid JSON')
    })

    const result = detectFramework('/project/src/file.ts')

    expect(result).toBe('jest')
  })

  it('prioritizes vitest over jest when both present', () => {
    vi.mocked(fsModule.fileExists).mockReturnValue(true)
    vi.mocked(fsModule.readJson).mockReturnValue({
      devDependencies: {
        vitest: '^1.0.0',
        jest: '^29.0.0'
      }
    })

    const result = detectFramework('/project/src/file.ts')

    expect(result).toBe('vitest')
  })
})
