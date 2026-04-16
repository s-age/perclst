import { exec } from 'child_process'
import type { IShellRepository, ShellResult } from '@src/repositories/ports/shell'

export class ShellRepository implements IShellRepository {
  exec(command: string, cwd: string): Promise<ShellResult> {
    return new Promise((resolve) => {
      exec(command, { cwd }, (error, stdout, stderr) => {
        resolve({
          exitCode: error?.code ?? 0,
          stdout,
          stderr
        })
      })
    })
  }
}
