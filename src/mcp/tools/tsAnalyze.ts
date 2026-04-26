import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { TsAnalysisService } from '@src/services/tsAnalysisService'

export const tsAnalyze: {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: { file_path: { type: string; description: string } }
    required: string[]
  }
} = {
  name: 'ts_analyze',
  description:
    'Analyze TypeScript code structure (symbols with constructor params and public methods, imports, exports, variable declarations)',
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

export async function executeTsAnalyze(args: {
  file_path: string
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  const service = container.resolve<TsAnalysisService>(TOKENS.TsAnalysisService)
  const analysis = service.analyze(args.file_path)

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(analysis, null, 2)
      }
    ]
  }
}
