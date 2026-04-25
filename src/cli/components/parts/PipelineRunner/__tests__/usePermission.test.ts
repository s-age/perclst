import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest'
import { useState, useEffect, type Dispatch } from 'react'
import { useInput } from 'ink'
import { usePermission } from '../usePermission.js'
import type { PermissionRequest } from '@src/types/permissionPipe.js'
import type { PermissionPipeService } from '@src/services/permissionPipeService.js'

vi.mock('react', () => ({
  useState: vi.fn(),
  useEffect: vi.fn()
}))

vi.mock('ink', () => ({
  useInput: vi.fn()
}))

// ── helpers ───────────────────────────────────────────────────────────────────

type UseStateResult = [PermissionRequest | null, Dispatch<unknown>]

const setPermRequest = vi.fn<(v: PermissionRequest | null) => void>()

const makeRequest = (input: Record<string, unknown> = { cmd: 'ls' }): PermissionRequest => ({
  tool_name: 'Bash',
  input
})

type MockService = {
  pollRequest: Mock<() => PermissionRequest | null>
  respond: Mock<() => void>
  askPermission: Mock<() => Promise<unknown>>
}

const makeService = (): MockService & PermissionPipeService =>
  ({
    pollRequest: vi.fn<() => PermissionRequest | null>(),
    respond: vi.fn<() => void>(),
    askPermission: vi.fn<() => Promise<unknown>>()
  }) as unknown as MockService & PermissionPipeService

// ── usePermission ─────────────────────────────────────────────────────────────

describe('usePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useState).mockReturnValue([null, setPermRequest] as unknown as UseStateResult)
    vi.mocked(useEffect).mockImplementation(() => {})
    vi.mocked(useInput).mockImplementation(() => {})
  })

  it('returns null permRequest when state is null', () => {
    const result = usePermission(null)
    expect(result.permRequest).toBeNull()
  })

  it('returns the permRequest value from state when a request exists', () => {
    const req = makeRequest()
    vi.mocked(useState).mockReturnValue([req, setPermRequest] as unknown as UseStateResult)
    const result = usePermission(null)
    expect(result.permRequest).toBe(req)
  })

  // ── effect: interval polling ──────────────────────────────────────────────

  describe('effect — interval polling', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.mocked(useEffect).mockImplementation((cb) => {
        void cb()
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('does not call setInterval when service is null', () => {
      const spy = vi.spyOn(globalThis, 'setInterval')
      usePermission(null)
      expect(spy).not.toHaveBeenCalled()
    })

    it('starts a 100ms interval when service is provided', () => {
      const spy = vi.spyOn(globalThis, 'setInterval')
      const service = makeService()
      service.pollRequest.mockReturnValue(null)
      usePermission(service)
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 100)
    })

    it('calls service.pollRequest on each interval tick', () => {
      const service = makeService()
      service.pollRequest.mockReturnValue(null)
      usePermission(service)
      vi.advanceTimersByTime(100)
      expect(service.pollRequest).toHaveBeenCalled()
    })

    it('calls setPermRequest when pollRequest returns a request', () => {
      const service = makeService()
      const req = makeRequest()
      service.pollRequest.mockReturnValue(req)
      usePermission(service)
      vi.advanceTimersByTime(100)
      expect(setPermRequest).toHaveBeenCalledWith(req)
    })

    it('does not call setPermRequest when pollRequest returns null', () => {
      const service = makeService()
      service.pollRequest.mockReturnValue(null)
      usePermission(service)
      vi.advanceTimersByTime(100)
      expect(setPermRequest).not.toHaveBeenCalled()
    })

    it('clears the interval on effect cleanup', () => {
      const clearSpy = vi.spyOn(globalThis, 'clearInterval')
      let cleanup: (() => void) | undefined
      vi.mocked(useEffect).mockImplementation((cb) => {
        cleanup = cb() as unknown as () => void
      })
      const service = makeService()
      service.pollRequest.mockReturnValue(null)
      usePermission(service)
      cleanup?.()
      expect(clearSpy).toHaveBeenCalled()
    })
  })

  // ── useInput handler: guards ──────────────────────────────────────────────

  describe('useInput handler — guards', () => {
    it('does not call service.respond when permRequest is null', () => {
      vi.mocked(useState).mockReturnValue([null, setPermRequest] as unknown as UseStateResult)
      const service = makeService()
      let handler: ((input: string) => void) | undefined
      vi.mocked(useInput).mockImplementation((h) => {
        handler = h as (input: string) => void
      })
      usePermission(service)
      handler?.('y')
      expect(service.respond).not.toHaveBeenCalled()
    })

    it('does not call setPermRequest when permRequest is null', () => {
      vi.mocked(useState).mockReturnValue([null, setPermRequest] as unknown as UseStateResult)
      const service = makeService()
      let handler: ((input: string) => void) | undefined
      vi.mocked(useInput).mockImplementation((h) => {
        handler = h as (input: string) => void
      })
      usePermission(service)
      handler?.('y')
      expect(setPermRequest).not.toHaveBeenCalled()
    })

    it('does not call setPermRequest when service is null', () => {
      const req = makeRequest()
      vi.mocked(useState).mockReturnValue([req, setPermRequest] as unknown as UseStateResult)
      let handler: ((input: string) => void) | undefined
      vi.mocked(useInput).mockImplementation((h) => {
        handler = h as (input: string) => void
      })
      usePermission(null)
      handler?.('y')
      expect(setPermRequest).not.toHaveBeenCalled()
    })
  })

  // ── useInput handler: respond ─────────────────────────────────────────────

  describe('useInput handler — respond', () => {
    it('calls service.respond when permRequest and service are both present', () => {
      const req = makeRequest()
      vi.mocked(useState).mockReturnValue([req, setPermRequest] as unknown as UseStateResult)
      const service = makeService()
      let handler: ((input: string) => void) | undefined
      vi.mocked(useInput).mockImplementation((h) => {
        handler = h as (input: string) => void
      })
      usePermission(service)
      handler?.('y')
      expect(service.respond).toHaveBeenCalled()
    })

    it('resets permRequest to null after respond', () => {
      const req = makeRequest()
      vi.mocked(useState).mockReturnValue([req, setPermRequest] as unknown as UseStateResult)
      const service = makeService()
      let handler: ((input: string) => void) | undefined
      vi.mocked(useInput).mockImplementation((h) => {
        handler = h as (input: string) => void
      })
      usePermission(service)
      handler?.('y')
      expect(setPermRequest).toHaveBeenCalledWith(null)
    })
  })
})

// ── buildPermissionResponse (via useInput) ────────────────────────────────────

type SetupResult = {
  service: MockService & PermissionPipeService
  trigger: (input: string) => void
}

describe('buildPermissionResponse', () => {
  const setupWithRequest = (req: PermissionRequest): SetupResult => {
    vi.mocked(useState).mockReturnValue([req, setPermRequest] as unknown as UseStateResult)
    vi.mocked(useEffect).mockImplementation(() => {})
    const service = makeService()
    let handler: ((input: string) => void) | undefined
    vi.mocked(useInput).mockImplementation((h) => {
      handler = h as (input: string) => void
    })
    usePermission(service)
    return {
      service,
      trigger: (input: string): void => {
        handler?.(input)
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls service.respond with allow behavior when input is 'y'", () => {
    const req = makeRequest({ cmd: 'ls' })
    const { service, trigger } = setupWithRequest(req)
    trigger('y')
    expect(service.respond).toHaveBeenCalledWith({
      behavior: 'allow',
      updatedInput: { cmd: 'ls' }
    })
  })

  it("calls service.respond with allow behavior when input is uppercase 'Y' (case-insensitive)", () => {
    const req = makeRequest({ cmd: 'ls' })
    const { service, trigger } = setupWithRequest(req)
    trigger('Y')
    expect(service.respond).toHaveBeenCalledWith({
      behavior: 'allow',
      updatedInput: { cmd: 'ls' }
    })
  })

  it("calls service.respond with deny behavior when input is 'n'", () => {
    const req = makeRequest()
    const { service, trigger } = setupWithRequest(req)
    trigger('n')
    expect(service.respond).toHaveBeenCalledWith({
      behavior: 'deny',
      message: 'User denied permission'
    })
  })

  it("calls service.respond with deny behavior for any non-'y' input", () => {
    const req = makeRequest()
    const { service, trigger } = setupWithRequest(req)
    trigger('x')
    expect(service.respond).toHaveBeenCalledWith({
      behavior: 'deny',
      message: 'User denied permission'
    })
  })
})
