import type {
  TypeScriptAnalysis,
  ReferenceInfo,
  RecursiveReferenceInfo,
  TypeDefinition
} from '@src/types/tsAnalysis'

export type ITsAnalysisDomain = {
  analyze(filePath: string): TypeScriptAnalysis
  getReferences(
    filePath: string,
    symbolName: string,
    options?: { includeTest?: boolean }
  ): ReferenceInfo[]
  getReferencesRecursive(
    filePath: string,
    symbolName: string,
    options?: { includeTest?: boolean }
  ): RecursiveReferenceInfo[]
  getTypeDefinitions(filePath: string, symbolName: string): TypeDefinition | null
}
