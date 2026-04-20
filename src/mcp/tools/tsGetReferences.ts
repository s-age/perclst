import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { TsAnalysisService } from '@src/services/tsAnalysisService'

export const ts_get_references = {
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
}) {
  const service = container.resolve<TsAnalysisService>(TOKENS.TsAnalysisService)

  const references = service.getReferences(args.file_path, args.symbol_name, {
    includeTest: args.include_test,
    recursive: args.recursive
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
