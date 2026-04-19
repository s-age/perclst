import type { ITestStrategyRepository } from '@src/repositories/ports/testStrategy'
import type { RawFunctionInfo, TestFramework } from '@src/types/testStrategy'
import { TsAnalyzer } from '@src/infrastructures/tsAnalyzer'
import {
  findTestFile as _findTestFile,
  canonicalTestFilePath as _canonicalTestFilePath
} from '@src/infrastructures/testFileDiscovery'
import {
  parseFunctions as _parseFunctions,
  extractTestFunctions as _extractTestFunctions,
  detectFramework as _detectFramework
} from '@src/repositories/parsers/tsParser'

// ---------------------------------------------------------------------------
// Standalone functions
// ---------------------------------------------------------------------------

export function parseFunctionsFromFile(filePath: string): RawFunctionInfo[] | null {
  const sf = new TsAnalyzer({ skipAddingFilesFromTsConfig: true }).getSourceFileIfExists(filePath)
  return sf ? _parseFunctions(sf) : null
}

export function findTestFile(targetFilePath: string): string | null {
  return _findTestFile(targetFilePath)
}

export function canonicalTestFilePath(targetFilePath: string): string {
  return _canonicalTestFilePath(targetFilePath)
}

export function extractTestFunctions(testFilePath: string): string[] {
  return _extractTestFunctions(testFilePath)
}

export function detectFramework(targetFilePath: string): TestFramework {
  return _detectFramework(targetFilePath)
}

// ---------------------------------------------------------------------------
// Class form
// ---------------------------------------------------------------------------

export class TestStrategyRepository implements ITestStrategyRepository {
  parseFunctions(filePath: string): RawFunctionInfo[] | null {
    return parseFunctionsFromFile(filePath)
  }

  findTestFile(targetFilePath: string): string | null {
    return findTestFile(targetFilePath)
  }

  canonicalTestFilePath(targetFilePath: string): string {
    return canonicalTestFilePath(targetFilePath)
  }

  extractTestFunctions(testFilePath: string): string[] {
    return extractTestFunctions(testFilePath)
  }

  detectFramework(targetFilePath: string): TestFramework {
    return detectFramework(targetFilePath)
  }
}
