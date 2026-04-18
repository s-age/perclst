import type { ICheckerRepository } from '@src/repositories/ports/checker'
import type { CommandResult } from '@src/types/checker'
import { runCommand } from '@src/infrastructures/commandRunner'
import { findProjectRoot } from '@src/infrastructures/projectRoot'

const DEFAULT_LINT_COMMAND = 'npm run lint:fix'
const DEFAULT_BUILD_COMMAND = 'npm run build'
const DEFAULT_TEST_COMMAND = 'npm run test:unit'

// ESLint/tsc output lines that contain these substrings are noise, not real errors
const ERROR_IGNORE_PATTERNS = ['rollup', 'throw new error', 'requirewithfriendlyerror']

function parseOutput(stdout: string, stderr: string, exitCode: number): CommandResult {
  const errors: string[] = []
  const warnings: string[] = []
  let currentFile = ''
  for (const line of (stdout + stderr).split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const lower = trimmed.toLowerCase()
    if (/^\/.+\.(ts|tsx|js|jsx|mjs|cjs|json)$/.test(trimmed)) {
      currentFile = trimmed
      continue
    }
    if (/\d+ problems?\s*\(\d+ errors?,\s*\d+ warnings?\)/.test(trimmed)) continue
    if (lower.includes('error')) {
      if (ERROR_IGNORE_PATTERNS.some((p) => lower.includes(p))) continue
      errors.push(currentFile ? `${currentFile}: ${trimmed}` : trimmed)
    } else if (lower.includes('warning')) {
      warnings.push(currentFile ? `${currentFile}: ${trimmed}` : trimmed)
    }
  }
  return { errors, warnings, exitCode }
}

export class CheckerRepository implements ICheckerRepository {
  findProjectRoot(): string {
    return findProjectRoot()
  }

  async runLint(cwd: string, command = DEFAULT_LINT_COMMAND): Promise<CommandResult> {
    const { stdout, stderr, exitCode } = await runCommand(command, cwd)
    return parseOutput(stdout, stderr, exitCode)
  }

  async runBuild(cwd: string, command = DEFAULT_BUILD_COMMAND): Promise<CommandResult> {
    const { stdout, stderr, exitCode } = await runCommand(command, cwd)
    return parseOutput(stdout, stderr, exitCode)
  }

  async runTest(cwd: string, command = DEFAULT_TEST_COMMAND): Promise<CommandResult> {
    const { stdout, stderr, exitCode } = await runCommand(command, cwd)
    return parseOutput(stdout, stderr, exitCode)
  }
}
