import type { TsAnalyzer } from '@src/infrastructures/tsAnalyzer'
import {
  extractSymbols,
  extractImports,
  extractExports,
  extractTypeDefinition,
  findReferenceFindableSymbols,
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
    const symbols = findReferenceFindableSymbols(sf, symbolName)
    if (symbols.length === 0) return []
    const allRefs = symbols.flatMap((s) => s.findReferences())
    return extractReferences(allRefs, options)
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
