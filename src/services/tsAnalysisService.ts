import type { ITsAnalysisDomain } from '@src/domains/ports/tsAnalysis'
import type {
  TypeScriptAnalysis,
  ReferenceInfo,
  RecursiveReferenceInfo,
  TypeDefinition
} from '@src/types/tsAnalysis'

export class TsAnalysisService {
  constructor(private readonly domain: ITsAnalysisDomain) {}

  analyze(filePath: string): TypeScriptAnalysis {
    return this.domain.analyze(filePath)
  }

  getReferences(
    filePath: string,
    symbolName: string,
    options?: { includeTest?: boolean; recursive?: boolean }
  ): ReferenceInfo[] | RecursiveReferenceInfo[] {
    if (options?.recursive !== false) {
      return this.domain.getReferencesRecursive(filePath, symbolName, options)
    }
    return this.domain.getReferences(filePath, symbolName, options)
  }

  getTypeDefinitions(filePath: string, symbolName: string): TypeDefinition | null {
    return this.domain.getTypeDefinitions(filePath, symbolName)
  }
}
