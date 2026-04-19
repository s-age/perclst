import { useState, useEffect } from 'react'
import { useInput } from 'ink'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import type { PermissionRequest, PermissionResult } from './types.js'

function respondPermission(pipePath: string, result: PermissionResult): void {
  try {
    writeFileSync(`${pipePath}.res`, JSON.stringify(result), 'utf-8')
  } catch {
    /* ignore */
  }
}

export function usePermission() {
  const permPipePath = process.env.PERCLST_PERMISSION_PIPE ?? null
  const [permRequest, setPermRequest] = useState<PermissionRequest | null>(null)

  useEffect(() => {
    if (!permPipePath) return
    const reqPath = `${permPipePath}.req`
    const interval = setInterval(() => {
      if (!existsSync(reqPath)) return
      try {
        const req = JSON.parse(readFileSync(reqPath, 'utf-8')) as PermissionRequest
        try {
          unlinkSync(reqPath)
        } catch {
          /* ignore */
        }
        setPermRequest(req)
      } catch {
        /* ignore */
      }
    }, 100)
    return () => clearInterval(interval)
  }, [permPipePath])

  useInput((input) => {
    if (!permRequest || !permPipePath) return
    const allow = input.toLowerCase() === 'y'
    respondPermission(
      permPipePath,
      allow
        ? { behavior: 'allow', updatedInput: permRequest.input }
        : { behavior: 'deny', message: 'User denied permission' }
    )
    setPermRequest(null)
  })

  return { permRequest }
}
