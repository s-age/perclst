import { describe, it, expect, beforeEach } from 'vitest'
import { AbortService } from '../abortService'

describe('AbortService', () => {
  let service: AbortService

  beforeEach(() => {
    service = new AbortService()
  })

  describe('signal', () => {
    it('returns an AbortSignal instance', () => {
      expect(service.signal).toBeInstanceOf(AbortSignal)
    })

    it('returns a non-aborted signal before abort is called', () => {
      expect(service.signal.aborted).toBe(false)
    })

    it('returns the same signal reference on repeated accesses', () => {
      expect(service.signal).toBe(service.signal)
    })
  })

  describe('abort', () => {
    it('marks the signal as aborted', () => {
      service.abort()

      expect(service.signal.aborted).toBe(true)
    })

    it('does not throw when called a second time', () => {
      service.abort()

      expect(() => service.abort()).not.toThrow()
    })
  })
})
