import type { IPlanFileDomain } from './ports/planFile'
import type { IPlanFileRepository } from '@src/repositories/ports/planFile'

export class PlanFileDomain implements IPlanFileDomain {
  constructor(private readonly repo: IPlanFileRepository) {}

  exists(absolutePath: string): boolean {
    return this.repo.exists(absolutePath)
  }
}
