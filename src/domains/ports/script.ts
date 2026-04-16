export type ScriptResult = {
  exitCode: number
  stdout: string
  stderr: string
}

export type IScriptDomain = {
  run(command: string, cwd: string): Promise<ScriptResult>
}
