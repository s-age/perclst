import type { TestStrategyOptions, TestStrategyResult } from '@src/types/testStrategy'

export type ITestStrategyDomain = {
  analyze(options: TestStrategyOptions): TestStrategyResult
}
