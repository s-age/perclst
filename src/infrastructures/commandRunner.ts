import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import type { CommandResult } from '@src/types/checker'

// Lines matching these patterns are noise, not real errors
const ERROR_IGNORE_PATTERNS = ['rollup', 'throw new error', 'requirewithfriendlyerror']

export function findProjectRoot(): string {
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
  let currentFile = ''
  for (const line of output.split('\n')) {
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

export function runCommand(command: string, cwd: string): CommandResult {
  try {
    const output = execSync(command, { cwd, encoding: 'utf-8', stdio: 'pipe' })
    return parseOutput(output, 0)
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number }
    const output = (err.stdout ?? '') + (err.stderr ?? '')
    return parseOutput(output, err.status ?? 1)
  }
}
