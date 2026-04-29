import { spawnSync } from 'child_process'

export class GitInfra {
  spawnGitSync(args: string[], cwd?: string): string {
    const result = spawnSync('git', args, { encoding: 'utf-8', cwd })
    return (result.stdout ?? '').trim()
  }

  // Throws on non-zero exit (like the old execSync path).
  execGitSync(args: string[], cwd?: string): string {
    const result = spawnSync('git', args, { encoding: 'utf-8', cwd })
    if (result.status !== 0) {
      const msg = (result.stderr ?? '').trim() || `git ${args[0]} exited with ${result.status}`
      throw new Error(msg)
    }
    return (result.stdout ?? '').trim()
  }
}
