import { exec } from 'child_process'
import type { ShellResult } from '@src/types/shell'

export function execShell(command: string, cwd: string): Promise<ShellResult> {
  return new Promise((resolve) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      resolve({ exitCode: error?.code ?? 0, stdout, stderr })
    })
  })
}
