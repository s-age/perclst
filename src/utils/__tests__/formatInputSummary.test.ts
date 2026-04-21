import { describe, it, expect } from 'vitest'
import { formatInputSummary } from '../formatInputSummary'

describe('formatInputSummary', () => {
  // Happy path: command is present and has highest priority
  it('returns command value as string when command exists', () => {
    const result = formatInputSummary({ command: 'npm start' })
    expect(result).toBe('npm start')
  })

  // Fallback: file_path when command is missing
  it('returns file_path when command is undefined', () => {
    const result = formatInputSummary({ file_path: '/path/to/file.txt' })
    expect(result).toBe('/path/to/file.txt')
  })

  // Fallback: path when command and file_path are missing
  it('returns path when command and file_path are undefined', () => {
    const result = formatInputSummary({ path: '/some/path' })
    expect(result).toBe('/some/path')
  })

  // Fallback: url when earlier fields are missing
  it('returns url when command, file_path, and path are undefined', () => {
    const result = formatInputSummary({ url: 'https://example.com' })
    expect(result).toBe('https://example.com')
  })

  // Fallback: pattern when all previous fields are missing
  it('returns pattern when all previous fields are undefined', () => {
    const result = formatInputSummary({ pattern: '*.ts' })
    expect(result).toBe('*.ts')
  })

  // Priority: command takes precedence over file_path
  it('prioritizes command over file_path', () => {
    const result = formatInputSummary({ command: 'start', file_path: '/file' })
    expect(result).toBe('start')
  })

  // Priority: file_path takes precedence over path
  it('prioritizes file_path over path', () => {
    const result = formatInputSummary({ file_path: '/file', path: '/other' })
    expect(result).toBe('/file')
  })

  // Priority: path takes precedence over url
  it('prioritizes path over url', () => {
    const result = formatInputSummary({ path: '/path', url: 'https://example.com' })
    expect(result).toBe('/path')
  })

  // Priority: url takes precedence over pattern
  it('prioritizes url over pattern', () => {
    const result = formatInputSummary({ url: 'https://example.com', pattern: '*.ts' })
    expect(result).toBe('https://example.com')
  })

  // Type coercion: number primary field should be converted to string
  it('converts number primary field to string', () => {
    const result = formatInputSummary({ command: 42 })
    expect(result).toBe('42')
  })

  // Type coercion: boolean primary field should be converted to string
  it('converts boolean primary field to string', () => {
    const result = formatInputSummary({ command: true })
    expect(result).toBe('true')
  })

  // No primary field: returns JSON stringified object when all primary fields are missing
  it('returns JSON-stringified object when no primary field exists', () => {
    const input = { foo: 'bar', baz: 123 }
    const result = formatInputSummary(input)
    expect(result).toBe(JSON.stringify(input, null, 2))
  })

  // No primary field: short JSON (≤6 lines) returns complete JSON
  it('returns complete JSON when object JSON representation is 6 lines or fewer', () => {
    const input = { a: 1, b: 2 }
    const result = formatInputSummary(input)
    const expected = JSON.stringify(input, null, 2)
    expect(result).toBe(expected)
    expect(result.split('\n').length).toBeLessThanOrEqual(6)
  })

  // No primary field: long JSON (>6 lines) returns truncated version with ellipsis
  it('truncates JSON to 6 lines with ellipsis when object is larger', () => {
    const input = {
      line1: 'a',
      line2: 'b',
      line3: 'c',
      line4: 'd',
      line5: 'e',
      line6: 'f',
      line7: 'g'
    }
    const result = formatInputSummary(input)
    const lines = result.split('\n')
    expect(lines.length).toBe(7) // 6 lines + ellipsis line
    expect(lines[6]).toBe('  ...')
  })

  // Edge case: empty object returns minimalist JSON
  it('handles empty object', () => {
    const result = formatInputSummary({})
    expect(result).toBe('{}')
  })

  // Edge case: object with many nested properties exceeding 6 lines
  it('handles deeply nested object with truncation', () => {
    const input = {
      user: { name: 'John', age: 30 },
      settings: { theme: 'dark', notifications: true },
      metadata: { created: '2024-01-01', updated: '2024-01-02' },
      extra: { field1: 'value1', field2: 'value2' }
    }
    const result = formatInputSummary(input)
    const lines = result.split('\n')
    expect(lines[lines.length - 1]).toBe('  ...')
  })

  // Edge case: primary field exists but is null (falsy, should not match due to nullish coalescing)
  it('treats null primary field as undefined and falls back to next field', () => {
    const result = formatInputSummary({ command: null, file_path: '/file' })
    expect(result).toBe('/file')
  })

  // Edge case: primary field exists but is empty string (falsy, should still return)
  it('returns empty string if command is empty string', () => {
    const result = formatInputSummary({ command: '' })
    expect(result).toBe('')
  })

  // Edge case: primary field exists but is 0 (falsy, should still return)
  it('returns "0" if command is zero', () => {
    const result = formatInputSummary({ command: 0 })
    expect(result).toBe('0')
  })

  // Edge case: primary field exists but is false (falsy, should still return)
  it('returns "false" if command is false', () => {
    const result = formatInputSummary({ command: false })
    expect(result).toBe('false')
  })

  // Edge case: all primary fields present, command has highest priority
  it('chooses command when all primary fields are present', () => {
    const input = {
      command: 'cmd',
      file_path: 'file',
      path: 'path',
      url: 'url',
      pattern: 'pattern'
    }
    const result = formatInputSummary(input)
    expect(result).toBe('cmd')
  })

  // Edge case: only pattern field from primary set
  it('returns pattern when it is the only primary field', () => {
    const result = formatInputSummary({ pattern: 'src/**/*.ts', other: 'value' })
    expect(result).toBe('src/**/*.ts')
  })
})
