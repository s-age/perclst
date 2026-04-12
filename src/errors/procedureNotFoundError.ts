export class ProcedureNotFoundError extends Error {
  constructor(procedureName: string) {
    super(`Procedure not found: ${procedureName}`)
    this.name = 'ProcedureNotFoundError'
  }
}
