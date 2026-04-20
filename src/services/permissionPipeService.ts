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
}
