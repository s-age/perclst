export type RawCommandOutput = {
  stdout: string
  stderr: string
  exitCode: number
}

export type CommandResult = {
  errors: string[]
  warnings: string[]
  exitCode: number
}

export type CheckerOptions = {
  projectRoot?: string
  lintCommand?: string
  buildCommand?: string
  typecheckCommand?: string
  testCommand?: string
}

export type CheckerResult = {
  ok: boolean
  lint: CommandResult
  build: CommandResult
  typecheck: CommandResult
  test: CommandResult
}
