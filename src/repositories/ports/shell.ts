import type { ShellResult } from '@src/types/shell'

export type { ShellResult }

export type IShellRepository = {
  exec(command: string, cwd: string): Promise<ShellResult>
}
