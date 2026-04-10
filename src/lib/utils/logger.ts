export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

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
}

export const logger = new Logger()
