import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LogLevel, setLogLevel, stdout, stderr, debug } from '../output'

describe('LogLevel enum', () => {
  it('has the correct numeric values', () => {
    expect(LogLevel.DEBUG).toBe(0)
    expect(LogLevel.INFO).toBe(1)
  })
})

describe('stdout', () => {
  it('writes message to process.stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stdout.print('hello')
    expect(spy).toHaveBeenCalledWith('hello\n')
    spy.mockRestore()
  })
})

describe('stderr', () => {
  it('writes message to process.stderr', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stderr.print('error msg')
    expect(spy).toHaveBeenCalledWith('error msg\n')
    spy.mockRestore()
  })

  it('also logs cause to console.error when provided', () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cause = new Error('boom')
    stderr.print('failed', cause)
    expect(errSpy).toHaveBeenCalledWith(cause)
    vi.restoreAllMocks()
  })

  it('does not call console.error when cause is omitted', () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    stderr.print('no cause')
    expect(errSpy).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('does not call console.error when cause is an empty string', () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    stderr.print('error msg', '')
    expect(errSpy).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})

describe('debug', () => {
  beforeEach(() => {
    setLogLevel(LogLevel.INFO)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints when log level is DEBUG', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    setLogLevel(LogLevel.DEBUG)
    debug.print('verbose info')
    expect(spy).toHaveBeenCalledWith('verbose info', '')
  })

  it('passes meta when provided', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    setLogLevel(LogLevel.DEBUG)
    debug.print('msg', { key: 'val' })
    expect(spy).toHaveBeenCalledWith('msg', { key: 'val' })
  })

  it('is suppressed when log level is INFO', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    setLogLevel(LogLevel.INFO)
    debug.print('should not appear')
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('setLogLevel', () => {
  afterEach(() => {
    setLogLevel(LogLevel.INFO)
    vi.restoreAllMocks()
  })

  it('changing level mid-sequence affects subsequent calls', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    setLogLevel(LogLevel.DEBUG)
    debug.print('visible')
    expect(spy).toHaveBeenCalledTimes(1)

    setLogLevel(LogLevel.INFO)
    debug.print('suppressed')
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
