export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`)
    this.name = 'SessionNotFoundError'
  }
}

export class SessionAlreadyExistsError extends Error {
  constructor(sessionId: string) {
    super(`Session already exists: ${sessionId}`)
    this.name = 'SessionAlreadyExistsError'
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export class ProcedureNotFoundError extends Error {
  constructor(procedureName: string) {
    super(`Procedure not found: ${procedureName}`)
    this.name = 'ProcedureNotFoundError'
  }
}
