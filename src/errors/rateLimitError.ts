export class RateLimitError extends Error {
  constructor(public readonly resetInfo?: string) {
    const detail = resetInfo ? ` (${resetInfo})` : ''
    super(`Claude API usage limit reached${detail}`)
    this.name = 'RateLimitError'
  }
}
