export type IRejectionFeedbackRepository = {
  getFeedback(taskName: string): Promise<string | undefined>
  getCwd(): string
}
