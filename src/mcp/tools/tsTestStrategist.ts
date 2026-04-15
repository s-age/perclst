import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { TestStrategistService } from '@src/services/testStrategistService'

export const ts_test_strategist = {
  name: 'ts_test_strategist',
  description:
    'Formulate a unit test strategy for a TypeScript file — identifies untested functions, ' +
    'calculates cyclomatic complexity, and suggests mocks for dependencies.',
  inputSchema: {
    type: 'object',
    properties: {
      target_file_path: {
        type: 'string',
        description: 'Path to the target TypeScript implementation file (.ts or .tsx)'
      },
      test_file_path: {
        type: 'string',
        description: 'Path to the corresponding test file (auto-discovered if omitted)'
      }
    },
    required: ['target_file_path']
  }
}

export async function executeTsTestStrategist(args: {
  target_file_path: string
  test_file_path?: string
}) {
  const service = container.resolve<TestStrategistService>(TOKENS.TestStrategistService)
  const result = service.analyze({
    targetFilePath: args.target_file_path,
    testFilePath: args.test_file_path
  })
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
}
