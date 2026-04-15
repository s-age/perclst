import type { ITestStrategyDomain } from '@src/domains/ports/testStrategy'
import type { TestStrategyOptions, TestStrategyResult } from '@src/types/testStrategy'

export class TestStrategistService {
  constructor(private readonly testStrategyDomain: ITestStrategyDomain) {}

  analyze(options: TestStrategyOptions): TestStrategyResult {
    return this.testStrategyDomain.analyze(options)
  }
}
