import type { IPermissionPipeDomain } from '@src/domains/ports/permissionPipe.js'
import type { IPermissionPipeRepository } from '@src/repositories/ports/permissionPipe.js'
import type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe.js'

export class PermissionPipeDomain implements IPermissionPipeDomain {
  constructor(private repo: IPermissionPipeRepository) {}

  pollRequest(): PermissionRequest | null {
    return this.repo.pollRequest()
  }

  respond(result: PermissionResult): void {
    this.repo.respond(result)
  }

  async askPermission(args: {
    tool_name: string
    input: Record<string, unknown>
    tool_use_id?: string
  }): Promise<PermissionResult> {
    return this.repo.askPermission(args)
  }
}
