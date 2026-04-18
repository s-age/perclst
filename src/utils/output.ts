export enum LogLevel {
  DEBUG = 0,
  INFO = 1
}

let currentLevel: LogLevel = LogLevel.INFO

export function setLogLevel(level: LogLevel): void {
  currentLevel = level
}

export const stdout = {
  print(message: string): void {
    process.stdout.write(message + '\n')
  }
}

export const stderr = {
  print(message: string, cause?: unknown): void {
    process.stderr.write(message + '\n')
    if (cause !== undefined && cause !== '') {
      console.error(cause)
    }
  }
}

export const debug = {
  print(message: string, meta?: Record<string, unknown>): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.debug(message, meta ?? '')
    }
  }
}
