import { describe, it, expect } from 'vitest'
import { assertNoSingleDashMultiCharOptions } from '../argFormat'
import { ValidationError } from '@src/errors/validationError'

describe('assertNoSingleDashMultiCharOptions', () => {
  // Happy path: no violations
  it('should not throw when given empty array', () => {
    expect(() => {
      assertNoSingleDashMultiCharOptions([])
    }).not.toThrow()
  })

  it('should not throw when given double-dash options', () => {
    expect(() => {
      assertNoSingleDashMultiCharOptions(['--name', '--verbose', '--output'])
    }).not.toThrow()
  })

  it('should not throw when given single-dash single-char options', () => {
    expect(() => {
      assertNoSingleDashMultiCharOptions(['-v', '-n', '-h'])
    }).not.toThrow()
  })

  it('should not throw when given non-option arguments', () => {
    expect(() => {
      assertNoSingleDashMultiCharOptions(['value', 'another-value', 'path/to/file'])
    }).not.toThrow()
  })

  it('should not throw when given mixed valid arguments', () => {
    expect(() => {
      assertNoSingleDashMultiCharOptions([
        'task description',
        '--model',
        'sonnet',
        '-v',
        '--output-only'
      ])
    }).not.toThrow()
  })

  it('should not throw when given single-dash followed by digit', () => {
    expect(() => {
      assertNoSingleDashMultiCharOptions(['-123'])
    }).not.toThrow()
  })

  // Error path: single-dash multi-char options
  it.each([
    ['-ab', "invalid option '-ab' — did you mean '--ab'?"],
    ['-name', "invalid option '-name' — did you mean '--name'?"],
    ['-NAME', "invalid option '-NAME' — did you mean '--NAME'?"],
    ['-Model', "invalid option '-Model' — did you mean '--Model'?"]
  ] as const)('should throw ValidationError for single-dash option %s', (input, expectedMsg) => {
    expect(() => {
      assertNoSingleDashMultiCharOptions([input])
    }).toThrow(new ValidationError(expectedMsg))
  })

  it('should throw ValidationError on first violation in list of args', () => {
    expect(() => {
      assertNoSingleDashMultiCharOptions(['--valid', '-invalid', '--also-valid'])
    }).toThrow(new ValidationError("invalid option '-invalid' — did you mean '--invalid'?"))
  })

  it('should throw ValidationError when single-dash is followed by letters and digit', () => {
    expect(() => {
      assertNoSingleDashMultiCharOptions(['-ab1'])
    }).toThrow(new ValidationError("invalid option '-ab1' — did you mean '--ab1'?"))
  })
})
