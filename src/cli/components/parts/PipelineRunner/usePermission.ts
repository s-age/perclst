import { useState, useEffect } from 'react'
import { useInput } from 'ink'
import type { PermissionPipeService } from '@src/services/permissionPipeService'
import type { PermissionRequest } from '@src/types/permissionPipe'

function buildPermissionResponse(
  input: string,
  permRequest: PermissionRequest
):
  | { behavior: 'allow'; updatedInput: Record<string, unknown> }
  | { behavior: 'deny'; message: string } {
  const allow = input.toLowerCase() === 'y'
  return allow
    ? { behavior: 'allow', updatedInput: permRequest.input }
    : { behavior: 'deny', message: 'User denied permission' }
}

export function usePermission(service: PermissionPipeService | null): {
  permRequest: PermissionRequest | null
} {
  const [permRequest, setPermRequest] = useState<PermissionRequest | null>(null)

  useEffect(() => {
    if (!service) return
    const interval = setInterval(() => {
      const req = service.pollRequest()
      if (req) setPermRequest(req)
    }, 100)
    return (): void => clearInterval(interval)
  }, [service])

  useInput((input): void => {
    if (!permRequest || !service) return
    service.respond(buildPermissionResponse(input, permRequest))
    setPermRequest(null)
  })

  return { permRequest }
}
