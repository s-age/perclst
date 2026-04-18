import type { TypeScriptAnalysis, ReferenceInfo, TypeDefinition } from '@src/types/tsAnalysis'

export type ITsAnalysisDomain = {
  analyze(filePath: string): TypeScriptAnalysis
  getReferences(filePath: string, symbolName: string): ReferenceInfo[]
  getTypeDefinitions(filePath: string, symbolName: string): TypeDefinition | null
}
