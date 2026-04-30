import type { ICheckerRepository } from '@src/repositories/ports/checker'
import type { CommandResult } from '@src/types/checker'
import type { CommandRunnerInfra } from '@src/infrastructures/commandRunner'
import type { ProjectRootInfra } from '@src/infrastructures/projectRoot'
import { parseCheckerOutput } from '@src/repositories/parsers/checkerOutputParser'

const DEFAULT_LINT_COMMAND = 'npm run lint:fix'
const DEFAULT_BUILD_COMMAND = 'npm run build'
const DEFAULT_TYPECHECK_COMMAND = 'npm run typecheck'
const DEFAULT_TEST_COMMAND = 'npm run test:unit'

export class CheckerRepository implements ICheckerRepository {
  constructor(
    private runner: CommandRunnerInfra,
    private projectRoot: ProjectRootInfra
  ) {}

  findProjectRoot(): string {
    return this.projectRoot.findProjectRoot()
  }

  async runLint(cwd: string, command = DEFAULT_LINT_COMMAND): Promise<CommandResult> {
    const { stdout, stderr, exitCode } = await this.runner.runCommand(command, cwd)
    return parseCheckerOutput(stdout, stderr, exitCode)
  }

  async runBuild(cwd: string, command = DEFAULT_BUILD_COMMAND): Promise<CommandResult> {
    const { stdout, stderr, exitCode } = await this.runner.runCommand(command, cwd)
    return parseCheckerOutput(stdout, stderr, exitCode)
  }

  async runTypecheck(cwd: string, command = DEFAULT_TYPECHECK_COMMAND): Promise<CommandResult> {
    const { stdout, stderr, exitCode } = await this.runner.runCommand(command, cwd)
    return parseCheckerOutput(stdout, stderr, exitCode)
  }

  async runTest(cwd: string, command = DEFAULT_TEST_COMMAND): Promise<CommandResult> {
    const { stdout, stderr, exitCode } = await this.runner.runCommand(command, cwd)
    return parseCheckerOutput(stdout, stderr, exitCode)
  }
}
