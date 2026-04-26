import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { CheckerService } from '@src/services/checkerService'

export const tsChecker: {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
} = {
  name: 'ts_checker',
  description:
    'Run lint (lint:fix), build, typecheck (tsc --noEmit), and unit tests in one shot and report errors/warnings for each. ' +
    'Use this after making TypeScript changes to verify correctness before completing a task.',
  inputSchema: {
    type: 'object',
    properties: {
      project_root: {
        type: 'string',
        description: 'Absolute path to the project root. Auto-detected when omitted.'
      },
      lint_command: {
        type: 'string',
        description: 'Lint command. Defaults to "npm run lint:fix".'
      },
      build_command: {
        type: 'string',
        description: 'Build command. Defaults to "npm run build".'
      },
      typecheck_command: {
        type: 'string',
        description: 'Typecheck command. Defaults to "npm run typecheck".'
      },
      test_command: {
        type: 'string',
        description: 'Test command. Defaults to "npm run test:unit".'
      }
    },
    required: []
  }
}

export async function executeTsChecker(args: {
  project_root?: string
  lint_command?: string
  build_command?: string
  typecheck_command?: string
  test_command?: string
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  const service = container.resolve<CheckerService>(TOKENS.CheckerService)
  const result = await service.check({
    projectRoot: args.project_root,
    lintCommand: args.lint_command,
    buildCommand: args.build_command,
    typecheckCommand: args.typecheck_command,
    testCommand: args.test_command
  })
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
}
