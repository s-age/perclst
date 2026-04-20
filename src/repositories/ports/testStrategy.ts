import type { RawFunctionInfo } from '@src/types/testStrategy'

export type ITestStrategyRepository = {
  parseFunctions(filePath: string): RawFunctionInfo[] | null
  findTestFile(targetFilePath: string): string | null
  canonicalTestFilePath(targetFilePath: string): string
  extractTestFunctions(testFilePath: string): string[]
  readPackageDeps(targetFilePath: string): Record<string, string> | null
}
