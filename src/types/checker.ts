export type CommandResult = {
  errors: string[]
  warnings: string[]
  exitCode: number
}

export type CheckerOptions = {
  projectRoot?: string
  lintCommand?: string
  buildCommand?: string
  testCommand?: string
}

export type CheckerResult = {
  ok: boolean
  lint: CommandResult
  build: CommandResult
  test: CommandResult
}
