import { execSync } from 'child_process'

export function execGitSync(args: string): string {
  return execSync(`git ${args}`, { encoding: 'utf-8' }).trim()
}
