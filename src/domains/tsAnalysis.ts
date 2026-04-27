import type { ITsAnalysisDomain } from '@src/domains/ports/tsAnalysis'
import type { ITsAnalysisRepository } from '@src/repositories/ports/tsAnalysis'
import type {
  TypeScriptAnalysis,
  ReferenceInfo,
  RecursiveReferenceInfo,
  TypeDefinition
} from '@src/types/tsAnalysis'
import type { CallGraphNode } from '@src/types/tsCallGraph'

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

  getCallGraph(filePath: string, entry?: string, maxDepth = 5): CallGraphNode[] {
    const visiting = new Set<string>()
    if (entry) {
      return [
        this.buildNode({ filePath, symbolName: entry, kind: 'local', depth: maxDepth }, visiting)
      ]
    }
    const analysis = this.repo.analyzeFile(filePath)
    return (analysis.exports ?? [])
      .filter((e) => e.kind === 'function')
      .map((e) =>
        this.buildNode({ filePath, symbolName: e.name, kind: 'local', depth: maxDepth }, visiting)
      )
  }

  private buildNode(
    opts: { filePath: string; symbolName: string; kind: CallGraphNode['kind']; depth: number },
    visiting: Set<string>
  ): CallGraphNode {
    const { filePath, symbolName, kind, depth } = opts
    const key = `${filePath}::${symbolName}`

    if (visiting.has(key)) {
      return { filePath, symbolName, kind: 'circular', children: [] }
    }
    if (depth === 0) {
      return { filePath, symbolName, kind: 'max_depth', children: [] }
    }

    visiting.add(key)

    const callees = this.repo.getCallees(filePath, symbolName)
    const children = callees.map((callee) => {
      if (callee.kind === 'external' || !callee.filePath || !callee.symbolName) {
        return {
          filePath: null,
          symbolName: null,
          externalName: callee.externalName ?? 'unknown',
          kind: 'external' as const,
          children: []
        }
      }
      return this.buildNode(
        {
          filePath: callee.filePath,
          symbolName: callee.symbolName,
          kind: callee.kind,
          depth: depth - 1
        },
        visiting
      )
    })

    visiting.delete(key)

    return { filePath, symbolName, kind, children }
  }
}
