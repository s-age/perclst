import path from 'path'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { TsAnalysisService } from '@src/services/tsAnalysisService'
import type { CallGraphNode } from '@src/types/tsCallGraph'

function nodeLabel(node: CallGraphNode): string {
  if (node.kind === 'external') return node.externalName ?? 'unknown'
  if (!node.filePath || !node.symbolName) return 'unknown'
  return `${path.relative(process.cwd(), node.filePath)}::${node.symbolName}`
}

function formatChildren(nodes: CallGraphNode[], prefix: string): string {
  return nodes
    .map((node, i) => {
      const isLast = i === nodes.length - 1
      const connector = isLast ? '└── ' : '├── '
      const childPrefix = prefix + (isLast ? '    ' : '│   ')
      const suffix =
        node.kind === 'di'
          ? ' [di]'
          : node.kind === 'external'
            ? ' [external]'
            : node.kind === 'circular'
              ? ' [circular]'
              : node.kind === 'max_depth'
                ? ' [...]'
                : ''
      const line = `${prefix}${connector}${nodeLabel(node)}${suffix}`
      return node.children.length > 0
        ? line + '\n' + formatChildren(node.children, childPrefix)
        : line
    })
    .join('\n')
}

function formatTree(nodes: CallGraphNode[]): string {
  return nodes
    .map((node) => {
      const suffix =
        node.kind === 'di'
          ? ' [di]'
          : node.kind === 'external'
            ? ' [external]'
            : node.kind === 'circular'
              ? ' [circular]'
              : node.kind === 'max_depth'
                ? ' [...]'
                : ''
      const header = `${nodeLabel(node)}${suffix}`
      return node.children.length > 0 ? header + '\n' + formatChildren(node.children, '') : header
    })
    .join('\n\n')
}

export async function executeTsCallGraph(args: {
  file_path: string
  entry?: string
  max_depth?: number
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  const service = container.resolve<TsAnalysisService>(TOKENS.TsAnalysisService)
  const result = service.getCallGraph(args.file_path, args.entry, args.max_depth)
  const text = result.nodes.length > 0 ? formatTree(result.nodes) : '(no calls found)'

  return {
    content: [{ type: 'text' as const, text }]
  }
}
