import type { ICheckerDomain } from '@src/domains/ports/checker'
import type { CheckerOptions, CheckerResult } from '@src/types/checker'

export class CheckerService {
  constructor(private readonly checkerDomain: ICheckerDomain) {}

  check(options: CheckerOptions): Promise<CheckerResult> {
    return this.checkerDomain.check(options)
  }
}
