export class PipelineAbortedError extends Error {
  constructor() {
    super('Pipeline aborted by user')
    this.name = 'PipelineAbortedError'
  }
}
