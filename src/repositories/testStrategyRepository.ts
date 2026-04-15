import type { ITestStrategyRepository } from '@src/repositories/ports/testStrategy'
import type { RawFunctionInfo, TestFramework } from '@src/types/testStrategy'
import {
  parseFunctions,
  findTestFile,
  extractTestFunctions,
  detectFramework
} from '@src/infrastructures/tsParser'

export class TestStrategyRepository implements ITestStrategyRepository {
  parseFunctions(filePath: string): RawFunctionInfo[] | null {
    return parseFunctions(filePath)
  }

  findTestFile(targetFilePath: string): string | null {
    return findTestFile(targetFilePath)
  }

  extractTestFunctions(testFilePath: string): string[] {
    return extractTestFunctions(testFilePath)
  }

  detectFramework(targetFilePath: string): TestFramework {
    return detectFramework(targetFilePath)
  }
}
