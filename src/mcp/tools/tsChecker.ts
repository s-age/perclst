import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

type CommandResult = {
  errors: string[]
  warnings: string[]
  exitCode: number
}

type TsCheckerResult = {
  lint: CommandResult
  build: CommandResult
  test: CommandResult
}

// Lines matching these patterns are noise, not real errors
const ERROR_IGNORE_PATTERNS = ['rollup', 'throw new error', 'requirewithfriendlyerror']

function findProjectRoot(): string {
  const thisFile = fileURLToPath(import.meta.url)
  let dir = dirname(thisFile)
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'package.json'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return process.cwd()
}

function parseOutput(output: string, exitCode: number): CommandResult {
  const errors: string[] = []
  const warnings: string[] = []
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const lower = trimmed.toLowerCase()
    if (lower.includes('error')) {
      if (ERROR_IGNORE_PATTERNS.some((p) => lower.includes(p))) continue
      errors.push(trimmed)
    } else if (lower.includes('warning')) {
      warnings.push(trimmed)
    }
  }
  return { errors, warnings, exitCode }
}

function runCommand(command: string, cwd: string): CommandResult {
  try {
    const output = execSync(command, { cwd, encoding: 'utf-8', stdio: 'pipe' })
    return parseOutput(output, 0)
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number }
    const output = (err.stdout ?? '') + (err.stderr ?? '')
    return parseOutput(output, err.status ?? 1)
  }
}

export async function executeTsChecker(args: {
  project_root?: string
  lint_command?: string
  build_command?: string
  test_command?: string
}) {
  const projectRoot = args.project_root ?? findProjectRoot()
  const lintCommand = args.lint_command ?? 'npm run lint:fix'
  const buildCommand = args.build_command ?? 'npm run build'
  const testCommand = args.test_command ?? 'npm run test:unit'

  const result: TsCheckerResult = {
    lint: runCommand(lintCommand, projectRoot),
    build: runCommand(buildCommand, projectRoot),
    test: runCommand(testCommand, projectRoot)
  }

  const allClear =
    result.lint.exitCode === 0 && result.build.exitCode === 0 && result.test.exitCode === 0

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ ok: allClear, ...result }, null, 2)
      }
    ]
  }
}
