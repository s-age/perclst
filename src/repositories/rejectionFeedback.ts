import { resolve } from '@src/utils/path'
import type { IRejectionFeedbackRepository } from '@src/repositories/ports/rejectionFeedback'
import type { FsInfra } from '@src/infrastructures/fs'

type RejectionFs = Pick<FsInfra, 'fileExists' | 'readText' | 'removeFile' | 'currentWorkingDir'>

export class RejectionFeedbackRepository implements IRejectionFeedbackRepository {
  constructor(private fs: RejectionFs) {}

  async getFeedback(taskName: string): Promise<string | undefined> {
    const tmpPath = resolve(`.claude/tmp/${taskName}`)
    if (!this.fs.fileExists(tmpPath)) return undefined
    const feedback = this.fs.readText(tmpPath)
    await this.fs.removeFile(tmpPath)
    return feedback
  }

  getCwd(): string {
    return this.fs.currentWorkingDir()
  }
}
