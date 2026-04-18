import { TsAnalyzer } from '@src/infrastructures/tsAnalyzer'
import type { ITsAnalysisRepository } from '@src/repositories/ports/tsAnalysis'
import type { TypeScriptAnalysis, ReferenceInfo, TypeDefinition } from '@src/types/tsAnalysis'

export class TsAnalysisRepository implements ITsAnalysisRepository {
  private infra = new TsAnalyzer()

  analyzeFile(filePath: string): TypeScriptAnalysis {
    return this.infra.analyzeFile(filePath)
  }

  getReferences(
    filePath: string,
    symbolName: string,
    options?: { includeTest?: boolean }
  ): ReferenceInfo[] {
    return this.infra.getReferences(filePath, symbolName, options)
  }

  getTypeDefinitions(filePath: string, symbolName: string): TypeDefinition | null {
    return this.infra.getTypeDefinitions(filePath, symbolName)
  }
}
