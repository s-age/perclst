export class PipelineMaxRetriesError extends Error {
  constructor(taskIndex: number, maxRetries: number) {
    super(`Pipeline failed: max retries (${maxRetries}) exceeded at task ${taskIndex + 1}`)
    this.name = 'PipelineMaxRetriesError'
  }
}
