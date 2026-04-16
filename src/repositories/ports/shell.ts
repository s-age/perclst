export type ShellResult = {
  exitCode: number
  stdout: string
  stderr: string
}

export type IShellRepository = {
  exec(command: string, cwd: string): Promise<ShellResult>
}
