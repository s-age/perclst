import type { CheckerOptions, CheckerResult } from '@src/types/checker'

export type ICheckerDomain = {
  check(options: CheckerOptions): CheckerResult
}
