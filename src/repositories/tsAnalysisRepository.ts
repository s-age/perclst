import { Node } from 'ts-morph'
import type { TsAnalyzer } from '@src/infrastructures/tsAnalyzer'
import {
  extractSymbols,
  extractImports,
  extractExports,
  extractTypeDefinition,
  resolveSymbol,
  extractReferences
} from '@src/repositories/parsers/tsAnalysisParser'
import { findContainingSymbol } from '@src/repositories/parsers/tsAstParser'
import type { ITsAnalysisRepository } from '@src/repositories/ports/tsAnalysis'
import type { TypeScriptAnalysis, ReferenceInfo, TypeDefinition } from '@src/types/tsAnalysis'

export class TsAnalysisRepository implements ITsAnalysisRepository {
  constructor(private infra: TsAnalyzer) {}

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
    const sf = this.infra.getSourceFile(filePath)
    const symbol = resolveSymbol(sf, symbolName)
    if (!symbol || !Node.isReferenceFindable(symbol)) return []
    return extractReferences(symbol.findReferences(), options)
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
