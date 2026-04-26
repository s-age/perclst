import * as readline from 'readline'
import { UserCancelledError } from '@src/errors/userCancelledError'

export function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

async function askWorkingDirSwitch(sessionDir: string, currentDir: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
  const question = [
    `Session working directory: ${sessionDir}`,
    `Current directory:         ${currentDir}`,
    '\nSwitch to session directory and continue? [Y/n] '
  ].join('\n')
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() !== 'n')
    })
  })
}

export async function handleWorkingDirMismatch(
  sessionDir: string,
  interactive = true
): Promise<void> {
  if (!sessionDir || sessionDir === process.cwd() || !interactive) return
  const confirmed = await askWorkingDirSwitch(sessionDir, process.cwd())
  if (!confirmed) throw new UserCancelledError()
  process.chdir(sessionDir)
}
