import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CheckerService } from '../checkerService'
import type { ICheckerDomain } from '@src/domains/ports/checker'
import type { CheckerOptions, CheckerResult } from '@src/types/checker'

const mockCheckerResult: CheckerResult = {
  ok: true,
  lint: {
    errors: [],
    warnings: [],
    exitCode: 0
  },
  build: {
    errors: [],
    warnings: [],
    exitCode: 0
  },
  test: {
    errors: [],
    warnings: [],
    exitCode: 0
  }
}

describe('CheckerService', () => {
  let checkerDomain: ICheckerDomain
  let service: CheckerService

  beforeEach(() => {
    vi.clearAllMocks()
    checkerDomain = {
      check: vi.fn().mockReturnValue(mockCheckerResult)
    }
    service = new CheckerService(checkerDomain)
  })

  describe('check', () => {
    it('delegates to domain.check and returns result', () => {
      const options: CheckerOptions = {
        projectRoot: '/test/project',
        lintCommand: 'npm run lint',
        buildCommand: 'npm run build',
        testCommand: 'npm run test'
      }

      const result = service.check(options)

      expect(checkerDomain.check).toHaveBeenCalledWith(options)
      expect(result).toBe(mockCheckerResult)
    })

    it('works with partial options', () => {
      const options: CheckerOptions = {
        projectRoot: '/test/project'
      }

      const result = service.check(options)

      expect(checkerDomain.check).toHaveBeenCalledWith(options)
      expect(result).toBe(mockCheckerResult)
    })

    it('works with empty options', () => {
      const options: CheckerOptions = {}

      const result = service.check(options)

      expect(checkerDomain.check).toHaveBeenCalledWith(options)
      expect(result).toBe(mockCheckerResult)
    })

    it('returns result with failing checks', () => {
      const failingResult: CheckerResult = {
        ok: false,
        lint: {
          errors: ['ESLint error'],
          warnings: ['ESLint warning'],
          exitCode: 1
        },
        build: {
          errors: ['Build failed'],
          warnings: [],
          exitCode: 1
        },
        test: {
          errors: ['Test failed'],
          warnings: ['Test warning'],
          exitCode: 1
        }
      }
      vi.mocked(checkerDomain.check).mockReturnValue(failingResult)

      const result = service.check({})

      expect(result).toBe(failingResult)
      expect(result.ok).toBe(false)
    })

    it('returns result with warnings only', () => {
      const warningResult: CheckerResult = {
        ok: true,
        lint: {
          errors: [],
          warnings: ['ESLint warning'],
          exitCode: 0
        },
        build: {
          errors: [],
          warnings: ['Build warning'],
          exitCode: 0
        },
        test: {
          errors: [],
          warnings: [],
          exitCode: 0
        }
      }
      vi.mocked(checkerDomain.check).mockReturnValue(warningResult)

      const result = service.check({})

      expect(result).toBe(warningResult)
      expect(result.ok).toBe(true)
    })
  })
})
