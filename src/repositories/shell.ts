import type { IShellRepository, ShellResult } from '@src/repositories/ports/shell'
import type { ShellInfra } from '@src/infrastructures/shell'

export class ShellRepository implements IShellRepository {
  constructor(private shellInfra: ShellInfra) {}

  exec(command: string, cwd: string): Promise<ShellResult> {
    return this.shellInfra.execShell(command, cwd)
  }
}
