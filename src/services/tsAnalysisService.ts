import type { ITsAnalysisDomain } from '@src/domains/ports/tsAnalysis'
import type {
  TypeScriptAnalysis,
  ReferenceInfo,
  RecursiveReferenceInfo,
  TypeDefinition
} from '@src/types/tsAnalysis'
import type { CallGraphNode } from '@src/types/tsCallGraph'

export class TsAnalysisService {
  constructor(private readonly domain: ITsAnalysisDomain) {}

  analyze(filePath: string): TypeScriptAnalysis {
    return this.domain.analyze(filePath)
  }

  getReferences(
    filePath: string,
    symbolName: string,
    options: { recursive: false; includeTest?: boolean }
  ): ReferenceInfo[]
  getReferences(
    filePath: string,
    symbolName: string,
    options?: { recursive?: true; includeTest?: boolean }
  ): RecursiveReferenceInfo[]
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

  getCallGraph(
    filePath: string,
    entry?: string,
    maxDepth?: number
  ): { file_path: string; entry: string | null; max_depth: number; nodes: CallGraphNode[] } {
    const resolvedMaxDepth = maxDepth ?? 5
    return {
      file_path: filePath,
      entry: entry ?? null,
      max_depth: resolvedMaxDepth,
      nodes: this.domain.getCallGraph(filePath, entry, resolvedMaxDepth)
    }
  }
}
