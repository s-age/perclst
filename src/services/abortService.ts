export class AbortService {
  private controller = new AbortController()

  get signal(): AbortSignal {
    return this.controller.signal
  }

  abort(): void {
    this.controller.abort()
  }
}
