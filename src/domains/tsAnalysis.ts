import type { ITsAnalysisDomain } from '@src/domains/ports/tsAnalysis'
import type { ITsAnalysisRepository } from '@src/repositories/ports/tsAnalysis'
import type { TypeScriptAnalysis, ReferenceInfo, TypeDefinition } from '@src/types/tsAnalysis'

export class TsAnalysisDomain implements ITsAnalysisDomain {
  constructor(private readonly repo: ITsAnalysisRepository) {}

  analyze(filePath: string): TypeScriptAnalysis {
    return this.repo.analyzeFile(filePath)
  }

  getReferences(filePath: string, symbolName: string): ReferenceInfo[] {
    return this.repo.getReferences(filePath, symbolName)
  }

  getTypeDefinitions(filePath: string, symbolName: string): TypeDefinition | null {
    return this.repo.getTypeDefinitions(filePath, symbolName)
  }
}
