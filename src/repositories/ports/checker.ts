import type { CommandResult } from '@src/types/checker'

export type ICheckerRepository = {
  findProjectRoot(): string
  runLint(cwd: string, command?: string): CommandResult
  runBuild(cwd: string, command?: string): CommandResult
  runTest(cwd: string, command?: string): CommandResult
}
