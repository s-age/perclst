import { vi, describe, it, expect, beforeEach } from 'vitest'
import { assertNoSingleDashMultiCharOptions } from '../argFormat'

const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('exit called')
})
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('assertNoSingleDashMultiCharOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Happy path: no violations
  it('should not exit when given empty array', () => {
    assertNoSingleDashMultiCharOptions([])

    expect(exitSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('should not exit when given double-dash options', () => {
    assertNoSingleDashMultiCharOptions(['--name', '--verbose', '--output'])
  })

  it('should not exit when given single-dash single-char options', () => {
    assertNoSingleDashMultiCharOptions(['-v', '-n', '-h'])
  })

  it('should not exit when given non-option arguments', () => {
    assertNoSingleDashMultiCharOptions(['value', 'another-value', 'path/to/file'])
  })

  it('should not exit when given mixed valid arguments', () => {
    assertNoSingleDashMultiCharOptions([
      'task description',
      '--model',
      'sonnet',
      '-v',
      '--output-only'
    ])
  })

  it('should not match single-dash followed by digit', () => {
    assertNoSingleDashMultiCharOptions(['-123'])
  })

  // Error path: single-dash multi-char options
  it.each([
    ['-ab', "error: invalid option '-ab' — did you mean '--ab'?"],
    ['-name', "error: invalid option '-name' — did you mean '--name'?"],
    ['-NAME', "error: invalid option '-NAME' — did you mean '--NAME'?"],
    ['-Model', "error: invalid option '-Model' — did you mean '--Model'?"]
  ])('should exit with error for single-dash option %s', (input, expectedMsg) => {
    expect(() => {
      assertNoSingleDashMultiCharOptions([input])
    }).toThrow()

    expect(errorSpy).toHaveBeenCalledWith(expectedMsg)
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('should exit on first violation in list of args', () => {
    expect(() => {
      assertNoSingleDashMultiCharOptions(['--valid', '-invalid', '--also-valid'])
    }).toThrow()

    expect(errorSpy).toHaveBeenCalledWith(
      "error: invalid option '-invalid' — did you mean '--invalid'?"
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(errorSpy).toHaveBeenCalledTimes(1)
  })

  it('should match single-dash with letters followed by digit', () => {
    expect(() => {
      assertNoSingleDashMultiCharOptions(['-ab1'])
    }).toThrow()

    expect(errorSpy).toHaveBeenCalledWith("error: invalid option '-ab1' — did you mean '--ab1'?")
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
