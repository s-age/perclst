import type { FsInfra } from '@src/infrastructures/fs'
import type { IPlanFileRepository } from './ports/planFile'

export class PlanFileRepository implements IPlanFileRepository {
  constructor(private readonly fs: FsInfra) {}

  exists(absolutePath: string): boolean {
    return this.fs.fileExists(absolutePath)
  }
}
