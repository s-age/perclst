import type { ICheckerRepository } from '@src/repositories/ports/checker'
import type { CommandResult } from '@src/types/checker'
import { findProjectRoot, runCommand } from '@src/infrastructures/commandRunner'

const DEFAULT_LINT_COMMAND = 'npm run lint:fix'
const DEFAULT_BUILD_COMMAND = 'npm run build'
const DEFAULT_TEST_COMMAND = 'npm run test:unit'

export class CheckerRepository implements ICheckerRepository {
  findProjectRoot(): string {
    return findProjectRoot()
  }

  runLint(cwd: string, command = DEFAULT_LINT_COMMAND): CommandResult {
    return runCommand(command, cwd)
  }

  runBuild(cwd: string, command = DEFAULT_BUILD_COMMAND): CommandResult {
    return runCommand(command, cwd)
  }

  runTest(cwd: string, command = DEFAULT_TEST_COMMAND): CommandResult {
    return runCommand(command, cwd)
  }
}
