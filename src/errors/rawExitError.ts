export class RawExitError extends Error {
  constructor(
    public readonly code: number | null,
    public readonly stderr: string
  ) {
    super(`claude exited with code ${code}`)
    this.name = 'RawExitError'
  }
}
