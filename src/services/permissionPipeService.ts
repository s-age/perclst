import type { IPermissionPipeDomain } from '@src/domains/ports/permissionPipe.js'
import type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe.js'

export class PermissionPipeService {
  constructor(private domain: IPermissionPipeDomain) {}

  pollRequest(): PermissionRequest | null {
    return this.domain.pollRequest()
  }

  respond(result: PermissionResult): void {
    this.domain.respond(result)
  }

  async askPermission(args: {
    tool_name: string
    input: Record<string, unknown>
    tool_use_id?: string
  }): Promise<PermissionResult> {
    return this.domain.askPermission(args)
  }
}
