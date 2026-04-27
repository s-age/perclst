import type { TsAnalyzer } from '@src/infrastructures/tsAnalyzer'
import {
  extractSymbols,
  extractImports,
  extractExports,
  extractTypeDefinition,
  findReferenceFindableSymbol,
  extractReferences
} from '@src/repositories/parsers/tsAnalysisParser'
import { findContainingSymbol } from '@src/repositories/parsers/tsAstParser'
import { extractCallees } from '@src/repositories/parsers/tsCallGraphParser'
import type { ITsAnalysisRepository } from '@src/repositories/ports/tsAnalysis'
import type { TypeScriptAnalysis, ReferenceInfo, TypeDefinition } from '@src/types/tsAnalysis'
import type { Callee } from '@src/types/tsCallGraph'

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
    const symbol = findReferenceFindableSymbol(sf, symbolName)
    if (!symbol) return []
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

  getCallees(filePath: string, symbolName: string): Callee[] {
    const sf = this.infra.getSourceFile(filePath)
    return extractCallees(sf, symbolName)
  }
}
