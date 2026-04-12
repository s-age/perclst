export class SessionAlreadyExistsError extends Error {
  constructor(sessionId: string) {
    super(`Session already exists: ${sessionId}`)
    this.name = 'SessionAlreadyExistsError'
  }
}
