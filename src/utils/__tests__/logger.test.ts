import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogLevel, logger } from '../logger'

const RESET = '\x1b[0m'

function hexToFg(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return ''
  return `\x1b[38;2;${parseInt(m[1], 16)};${parseInt(m[2], 16)};${parseInt(m[3], 16)}m`
}

function hexToBg(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return ''
  return `\x1b[48;2;${parseInt(m[1], 16)};${parseInt(m[2], 16)};${parseInt(m[3], 16)}m`
}

describe('LogLevel enum', () => {
  it('has the correct numeric values', () => {
    expect(LogLevel.DEBUG).toBe(0)
    expect(LogLevel.INFO).toBe(1)
    expect(LogLevel.WARN).toBe(2)
    expect(LogLevel.ERROR).toBe(3)
  })
})

describe('logger', () => {
  beforeEach(() => {
    logger.setLevel(LogLevel.DEBUG)
    vi.restoreAllMocks()
  })

  describe('debug()', () => {
    it('logs at DEBUG level when level is DEBUG', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.setLevel(LogLevel.DEBUG)
      logger.debug('test message')
      expect(spy).toHaveBeenCalledWith('[DEBUG] test message', '')
    })

    it('passes meta object when provided', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.setLevel(LogLevel.DEBUG)
      logger.debug('msg', { key: 'value' })
      expect(spy).toHaveBeenCalledWith('[DEBUG] msg', { key: 'value' })
    })

    it('is suppressed when level is INFO', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.setLevel(LogLevel.INFO)
      logger.debug('should not appear')
      expect(spy).not.toHaveBeenCalled()
    })

    it('is suppressed when level is WARN', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.setLevel(LogLevel.WARN)
      logger.debug('should not appear')
      expect(spy).not.toHaveBeenCalled()
    })

    it('is suppressed when level is ERROR', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.setLevel(LogLevel.ERROR)
      logger.debug('should not appear')
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('info()', () => {
    it('logs at INFO level when level is INFO', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.setLevel(LogLevel.INFO)
      logger.info('info message')
      expect(spy).toHaveBeenCalledWith('[INFO] info message', '')
    })

    it('logs at INFO level when level is DEBUG', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.setLevel(LogLevel.DEBUG)
      logger.info('info message')
      expect(spy).toHaveBeenCalledWith('[INFO] info message', '')
    })

    it('passes meta object when provided', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.setLevel(LogLevel.INFO)
      logger.info('msg', { count: 3 })
      expect(spy).toHaveBeenCalledWith('[INFO] msg', { count: 3 })
    })

    it('is suppressed when level is WARN', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.setLevel(LogLevel.WARN)
      logger.info('should not appear')
      expect(spy).not.toHaveBeenCalled()
    })

    it('is suppressed when level is ERROR', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.setLevel(LogLevel.ERROR)
      logger.info('should not appear')
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('warn()', () => {
    it('logs at WARN level when level is WARN', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      logger.setLevel(LogLevel.WARN)
      logger.warn('warn message')
      expect(spy).toHaveBeenCalledWith('[WARN] warn message', '')
    })

    it('logs at WARN level when level is DEBUG', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      logger.setLevel(LogLevel.DEBUG)
      logger.warn('warn message')
      expect(spy).toHaveBeenCalledWith('[WARN] warn message', '')
    })

    it('passes meta object when provided', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      logger.setLevel(LogLevel.WARN)
      logger.warn('msg', { reason: 'stale' })
      expect(spy).toHaveBeenCalledWith('[WARN] msg', { reason: 'stale' })
    })

    it('is suppressed when level is ERROR', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      logger.setLevel(LogLevel.ERROR)
      logger.warn('should not appear')
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('error()', () => {
    it('logs at ERROR level when level is ERROR', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      logger.setLevel(LogLevel.ERROR)
      logger.error('error message')
      expect(spy).toHaveBeenCalledWith('[ERROR] error message', '')
    })

    it('logs at ERROR level when level is DEBUG', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      logger.setLevel(LogLevel.DEBUG)
      logger.error('error message')
      expect(spy).toHaveBeenCalledWith('[ERROR] error message', '')
    })

    it('passes an Error object when provided', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      logger.setLevel(LogLevel.ERROR)
      const err = new Error('boom')
      logger.error('failed', err)
      expect(spy).toHaveBeenCalledWith('[ERROR] failed', err)
    })

    it('passes a plain object when provided', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      logger.setLevel(LogLevel.ERROR)
      logger.error('ctx', { code: 500 })
      expect(spy).toHaveBeenCalledWith('[ERROR] ctx', { code: 500 })
    })
  })

  describe('print()', () => {
    it('logs the message without any prefix', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.print('plain output')
      expect(spy).toHaveBeenCalledWith('plain output')
    })

    it('wraps message with foreground ANSI code when color is provided', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const color = '#D97757'
      logger.print('colored', { color })
      expect(spy).toHaveBeenCalledWith(`${hexToFg(color)}colored${RESET}`)
    })

    it('wraps message with background ANSI code when bgColor is provided', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const bgColor = '#1E1E2E'
      logger.print('bg only', { bgColor })
      expect(spy).toHaveBeenCalledWith(`${hexToBg(bgColor)}bg only${RESET}`)
    })

    it('applies both fg and bg when both options are provided', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const color = '#D97757'
      const bgColor = '#1E1E2E'
      logger.print('both', { color, bgColor })
      expect(spy).toHaveBeenCalledWith(`${hexToBg(bgColor)}${hexToFg(color)}both${RESET}`)
    })

    it('prints plain when options object is empty', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.print('no options', {})
      expect(spy).toHaveBeenCalledWith('no options')
    })

    it('prints plain when options is omitted', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.print('no arg')
      expect(spy).toHaveBeenCalledWith('no arg')
    })

    it('is not affected by the current log level', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      logger.setLevel(LogLevel.ERROR)
      logger.print('always printed')
      expect(spy).toHaveBeenCalledWith('always printed')
    })
  })

  describe('setLevel()', () => {
    it('changing level mid-sequence affects subsequent calls', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      logger.setLevel(LogLevel.DEBUG)
      logger.debug('visible')
      expect(logSpy).toHaveBeenCalledTimes(1)

      logger.setLevel(LogLevel.WARN)
      logger.debug('suppressed')
      logger.info('also suppressed')
      expect(logSpy).toHaveBeenCalledTimes(1)
    })
  })
})
