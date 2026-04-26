import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { TsAnalysisService } from '@src/services/tsAnalysisService'

export const ts_get_references: {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, { type: string; description: string; default?: boolean }>
    required: string[]
  }
} = {
  name: 'ts_get_references',
  description: 'Find all references to a TypeScript symbol',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Path to the TypeScript file'
      },
      symbol_name: {
        type: 'string',
        description: 'Name of the symbol to find references for'
      },
      include_test: {
        type: 'boolean',
        description: 'Include references from __tests__ directories (default: false)',
        default: false
      },
      recursive: {
        type: 'boolean',
        description:
          'Recursively follow callers up the call chain until no more references are found (default: true). Set to false for direct references only.',
        default: true
      }
    },
    required: ['file_path', 'symbol_name']
  }
}

export async function executeTsGetReferences(args: {
  file_path: string
  symbol_name: string
  include_test?: boolean
  recursive?: boolean
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  const service = container.resolve<TsAnalysisService>(TOKENS.TsAnalysisService)

  const references =
    args.recursive === false
      ? service.getReferences(args.file_path, args.symbol_name, {
          recursive: false,
          includeTest: args.include_test
        })
      : service.getReferences(args.file_path, args.symbol_name, {
          recursive: args.recursive,
          includeTest: args.include_test
        })

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ symbol: args.symbol_name, references }, null, 2)
      }
    ]
  }
}
