import type { CommandResult } from '@src/types/checker'

export type ICheckerRepository = {
  findProjectRoot(): string
  runLint(cwd: string, command?: string): Promise<CommandResult>
  runBuild(cwd: string, command?: string): Promise<CommandResult>
  runTypecheck(cwd: string, command?: string): Promise<CommandResult>
  runTest(cwd: string, command?: string): Promise<CommandResult>
}
