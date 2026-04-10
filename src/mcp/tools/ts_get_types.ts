import { TypeScriptProject } from '../analyzers/project.js'
import { MCPTool } from '../types.js'

export const ts_get_types: MCPTool = {
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
}) {
  const project = new TypeScriptProject()
  const definition = project.getTypeDefinitions(args.file_path, args.symbol_name)

  if (!definition) {
    return {
      content: [
        {
          type: 'text',
          text: `Type definition not found for symbol: ${args.symbol_name}`
        }
      ]
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(definition, null, 2)
      }
    ]
  }
}
