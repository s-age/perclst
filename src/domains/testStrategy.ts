import type { ITestStrategyDomain } from '@src/domains/ports/testStrategy'
import type { ITestStrategyRepository } from '@src/repositories/ports/testStrategy'
import type {
  TestFramework,
  TestStrategyOptions,
  TestStrategyResult
} from '@src/types/testStrategy'
import { buildRecommendation, buildStrategy } from '@src/utils/testStrategyHelpers'

// ---------------------------------------------------------------------------
// Domain class
// ---------------------------------------------------------------------------

export class TestStrategyDomain implements ITestStrategyDomain {
  constructor(private readonly repo: ITestStrategyRepository) {}

  analyze(options: TestStrategyOptions): TestStrategyResult {
    const { targetFilePath, testFilePath } = options

    if (!targetFilePath.endsWith('.ts') && !targetFilePath.endsWith('.tsx')) {
      return this.errResult(targetFilePath, `Not a TypeScript file: ${targetFilePath}`)
    }

    const functions = this.repo.parseFunctions(targetFilePath)
    if (functions === null) {
      return this.errResult(targetFilePath, `File not found: ${targetFilePath}`)
    }

    const resolvedTestFile = testFilePath ?? this.repo.findTestFile(targetFilePath)
    const testFunctions = resolvedTestFile ? this.repo.extractTestFunctions(resolvedTestFile) : []
    const framework = this.detectFramework(this.repo.readPackageDeps(targetFilePath))
    const strategies = functions.map((raw) => buildStrategy(raw, framework, testFunctions))

    return {
      target_file_path: targetFilePath,
      corresponding_test_file: resolvedTestFile,
      test_file_exists: resolvedTestFile !== null,
      expected_test_file_path: resolvedTestFile ?? this.repo.canonicalTestFilePath(targetFilePath),
      strategies,
      overall_recommendation: buildRecommendation(strategies)
    }
  }

  private detectFramework(deps: Record<string, string> | null): TestFramework {
    if (deps && 'vitest' in deps) return 'vitest'
    return 'jest'
  }

  private errResult(targetFilePath: string, error: string): TestStrategyResult {
    return {
      target_file_path: targetFilePath,
      corresponding_test_file: null,
      test_file_exists: false,
      expected_test_file_path: '',
      strategies: [],
      overall_recommendation: '',
      error
    }
  }
}
