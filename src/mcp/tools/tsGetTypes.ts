import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { TsAnalysisService } from '@src/services/tsAnalysisService'

export const ts_get_types: {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: {
      file_path: { type: string; description: string }
      symbol_name: { type: string; description: string }
    }
    required: string[]
  }
} = {
  name: 'ts_get_types',
  description: 'Get type definitions for a TypeScript symbol',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Path to the TypeScript file'
      },
      symbol_name: {
        type: 'string',
        description: 'Name of the symbol to get type information for'
      }
    },
    required: ['file_path', 'symbol_name']
  }
}

export async function executeTsGetTypes(args: {
  file_path: string
  symbol_name: string
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  const service = container.resolve<TsAnalysisService>(TOKENS.TsAnalysisService)
  const definition = service.getTypeDefinitions(args.file_path, args.symbol_name)

  if (!definition) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Type definition not found for symbol: ${args.symbol_name}`
        }
      ]
    }
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(definition, null, 2)
      }
    ]
  }
}
