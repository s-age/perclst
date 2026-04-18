import type { TypeScriptAnalysis, ReferenceInfo, TypeDefinition } from '@src/types/tsAnalysis'

export type ITsAnalysisRepository = {
  analyzeFile(filePath: string): TypeScriptAnalysis
  getReferences(
    filePath: string,
    symbolName: string,
    options?: { includeTest?: boolean }
  ): ReferenceInfo[]
  findContainingSymbol(
    filePath: string,
    line: number,
    column: number
  ): { symbol_name: string; file_path: string; line: number } | null
  getTypeDefinitions(filePath: string, symbolName: string): TypeDefinition | null
}
