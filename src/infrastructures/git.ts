import { execSync, spawnSync } from 'child_process'

export function execGitSync(args: string, cwd?: string): string {
  return execSync(`git ${args}`, { encoding: 'utf-8', cwd }).trim()
}

// spawnSync avoids shell interpretation of args and does not throw on non-zero exit.
// Needed for `git diff --no-index` which exits 1 when files differ.
export function spawnGitSync(args: string[], cwd?: string): string {
  const result = spawnSync('git', args, { encoding: 'utf-8', cwd })
  return (result.stdout ?? '').trim()
}

export class GitInfra {
  execGitSync(args: string, cwd?: string): string {
    return execGitSync(args, cwd)
  }
  spawnGitSync(args: string[], cwd?: string): string {
    return spawnGitSync(args, cwd)
  }
}
