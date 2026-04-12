export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/** Convert a hex color string (e.g. "#D97757") to an ANSI 24-bit foreground escape code. */
function hexToFg(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return ''
  return `\x1b[38;2;${parseInt(m[1], 16)};${parseInt(m[2], 16)};${parseInt(m[3], 16)}m`
}

/** Convert a hex color string (e.g. "#D97757") to an ANSI 24-bit background escape code. */
function hexToBg(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return ''
  return `\x1b[48;2;${parseInt(m[1], 16)};${parseInt(m[2], 16)};${parseInt(m[3], 16)}m`
}

const RESET = '\x1b[0m'

class Logger {
  private level: LogLevel = LogLevel.INFO

  setLevel(level: LogLevel) {
    this.level = level
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, meta || '')
    }
  }

  info(message: string, meta?: Record<string, unknown>) {
    if (this.level <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, meta || '')
    }
  }

  warn(message: string, meta?: Record<string, unknown>) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, meta || '')
    }
  }

  error(message: string, error?: Error | Record<string, unknown>) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error || '')
    }
  }

  /** Output to stdout without any log-level prefix. Accepts optional hex color / background color. */
  print(message: string, options?: { color?: string; bgColor?: string }) {
    if (!options?.color && !options?.bgColor) {
      console.log(message)
      return
    }
    const fg = options.color ? hexToFg(options.color) : ''
    const bg = options.bgColor ? hexToBg(options.bgColor) : ''
    console.log(`${bg}${fg}${message}${RESET}`)
  }
}

export const logger = new Logger()
