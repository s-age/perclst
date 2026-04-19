import type { RawFunctionInfo, TestFramework } from '@src/types/testStrategy'

export type ITestStrategyRepository = {
  parseFunctions(filePath: string): RawFunctionInfo[] | null
  findTestFile(targetFilePath: string): string | null
  canonicalTestFilePath(targetFilePath: string): string
  extractTestFunctions(testFilePath: string): string[]
  detectFramework(targetFilePath: string): TestFramework
}
