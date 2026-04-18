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
      }
    },
    required: ['file_path', 'symbol_name']
  }
}

export async function executeTsGetReferences(args: { file_path: string; symbol_name: string }) {
  const service = container.resolve<TsAnalysisService>(TOKENS.TsAnalysisService)
  const references = service.getReferences(args.file_path, args.symbol_name)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ symbol: args.symbol_name, references }, null, 2)
      }
    ]
  }
}
