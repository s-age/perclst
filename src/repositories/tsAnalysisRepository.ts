import { TsAnalyzer } from '@src/infrastructures/tsAnalyzer'
import {
  extractSymbols,
  extractImports,
  extractExports,
  extractTypeDefinition
} from '@src/repositories/parsers/tsAnalysisParser'
import { findContainingSymbol } from '@src/repositories/parsers/tsAstParser'
import type { ITsAnalysisRepository } from '@src/repositories/ports/tsAnalysis'
import type { TypeScriptAnalysis, ReferenceInfo, TypeDefinition } from '@src/types/tsAnalysis'

export class TsAnalysisRepository implements ITsAnalysisRepository {
  private infra = new TsAnalyzer()

  analyzeFile(filePath: string): TypeScriptAnalysis {
    const sf = this.infra.getSourceFile(filePath)
    return {
      file_path: filePath,
      symbols: extractSymbols(sf),
      imports: extractImports(sf),
      exports: extractExports(sf)
    }
  }

  getReferences(
    filePath: string,
    symbolName: string,
    options?: { includeTest?: boolean }
  ): ReferenceInfo[] {
    return this.infra.getReferences(filePath, symbolName, options)
  }

  findContainingSymbol(
    filePath: string,
    line: number,
    column: number
  ): { symbol_name: string; file_path: string; line: number } | null {
    const sf = this.infra.getSourceFile(filePath)
    return findContainingSymbol(sf, filePath, line, column)
  }

  getTypeDefinitions(filePath: string, symbolName: string): TypeDefinition | null {
    const sf = this.infra.getSourceFile(filePath)
    return extractTypeDefinition(sf, symbolName)
  }
}
