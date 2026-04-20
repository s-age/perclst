import { useState, useEffect } from 'react'
import { useInput } from 'ink'
import type { PermissionPipeService } from '@src/services/permissionPipeService.js'
import type { PermissionRequest } from '@src/types/permissionPipe.js'

export function usePermission(service: PermissionPipeService | null) {
  const [permRequest, setPermRequest] = useState<PermissionRequest | null>(null)

  useEffect(() => {
    if (!service) return
    const interval = setInterval(() => {
      const req = service.pollRequest()
      if (req) setPermRequest(req)
    }, 100)
    return () => clearInterval(interval)
  }, [service])

  useInput((input) => {
    if (!permRequest || !service) return
    const allow = input.toLowerCase() === 'y'
    service.respond(
      allow
        ? { behavior: 'allow', updatedInput: permRequest.input }
        : { behavior: 'deny', message: 'User denied permission' }
    )
    setPermRequest(null)
  })

  return { permRequest }
}
