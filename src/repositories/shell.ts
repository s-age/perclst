import type { IShellRepository, ShellResult } from '@src/repositories/ports/shell'
import { execShell } from '@src/infrastructures/shell'

export class ShellRepository implements IShellRepository {
  exec(command: string, cwd: string): Promise<ShellResult> {
    return execShell(command, cwd)
  }
}
