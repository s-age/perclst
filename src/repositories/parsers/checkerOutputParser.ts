import type { CommandResult } from '@src/types/checker'

// ESLint/tsc output lines that contain these substrings are noise, not real errors
const ERROR_IGNORE_PATTERNS = ['rollup', 'throw new error', 'requirewithfriendlyerror']

export function parseCheckerOutput(
  stdout: string,
  stderr: string,
  exitCode: number
): CommandResult {
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
