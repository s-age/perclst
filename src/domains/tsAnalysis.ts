import type { ITsAnalysisDomain } from '@src/domains/ports/tsAnalysis'
import type { ITsAnalysisRepository } from '@src/repositories/ports/tsAnalysis'
import type {
  TypeScriptAnalysis,
  ReferenceInfo,
  RecursiveReferenceInfo,
  TypeDefinition
} from '@src/types/tsAnalysis'

export class TsAnalysisDomain implements ITsAnalysisDomain {
  constructor(private readonly repo: ITsAnalysisRepository) {}

  analyze(filePath: string): TypeScriptAnalysis {
    return this.repo.analyzeFile(filePath)
  }

  getReferences(
    filePath: string,
    symbolName: string,
    options?: { includeTest?: boolean }
  ): ReferenceInfo[] {
    return this.repo.getReferences(filePath, symbolName, options)
  }

  getReferencesRecursive(
    filePath: string,
    symbolName: string,
    options?: { includeTest?: boolean }
  ): RecursiveReferenceInfo[] {
    return this.collectReferencesRecursive(filePath, symbolName, options, new Set())
  }

  private collectReferencesRecursive(
    filePath: string,
    symbolName: string,
    options: { includeTest?: boolean } | undefined,
    visited: Set<string>
  ): RecursiveReferenceInfo[] {
    const key = `${filePath}::${symbolName}`
    if (visited.has(key)) return []
    visited.add(key)

    const directRefs = this.repo.getReferences(filePath, symbolName, options)
    const callerRefsCache = new Map<string, RecursiveReferenceInfo[]>()

    return directRefs.map((ref) => {
      const containing = this.repo.findContainingSymbol(ref.file_path, ref.line, ref.column)
      if (!containing) return ref

      const callerKey = `${containing.file_path}::${containing.symbol_name}`
      if (!callerRefsCache.has(callerKey)) {
        callerRefsCache.set(
          callerKey,
          this.collectReferencesRecursive(
            containing.file_path,
            containing.symbol_name,
            options,
            visited
          )
        )
      }

      return {
        ...ref,
        caller: {
          symbol_name: containing.symbol_name,
          file_path: containing.file_path,
          line: containing.line,
          references: callerRefsCache.get(callerKey)!
        }
      }
    })
  }

  getTypeDefinitions(filePath: string, symbolName: string): TypeDefinition | null {
    return this.repo.getTypeDefinitions(filePath, symbolName)
  }
}
