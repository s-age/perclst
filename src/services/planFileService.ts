import type { IPlanFileDomain } from '@src/domains/ports/planFile'

export class PlanFileService {
  constructor(private readonly domain: IPlanFileDomain) {}

  exists(absolutePath: string): boolean {
    return this.domain.exists(absolutePath)
  }
}
