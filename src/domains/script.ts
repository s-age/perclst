import type { IShellRepository } from '@src/repositories/ports/shell'
import type { IScriptDomain, ScriptResult } from '@src/domains/ports/script'

export class ScriptDomain implements IScriptDomain {
  constructor(private shellRepo: IShellRepository) {}

  async run(command: string, cwd: string): Promise<ScriptResult> {
    return this.shellRepo.exec(command, cwd)
  }
}
