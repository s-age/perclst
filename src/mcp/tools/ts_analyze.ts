import { TypeScriptProject } from '@src/mcp/analyzers/project'

export const ts_analyze = {
  name: 'ts_analyze',
  description: 'Analyze TypeScript code structure (symbols, imports, exports)',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Path to the TypeScript file to analyze'
      }
    },
    required: ['file_path']
  }
}

export async function executeTsAnalyze(args: { file_path: string }) {
  const project = new TypeScriptProject()
  const analysis = project.analyze(args.file_path)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(analysis, null, 2)
      }
    ]
  }
}
