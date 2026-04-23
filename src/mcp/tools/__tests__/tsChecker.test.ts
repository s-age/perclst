import { vi, describe, it, expect, beforeEach } from 'vitest'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { CheckerResult } from '@src/types/checker'
import { executeTsChecker } from '../tsChecker'

vi.mock('@src/core/di/container')

type MockCheckerService = {
  check: ReturnType<typeof vi.fn>
}

describe('tsChecker', () => {
  let mockCheckerService: MockCheckerService
  let mockResolve: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockCheckerService = {
      check: vi.fn()
    }

    mockResolve = vi.fn().mockReturnValue(mockCheckerService)
    // eslint-disable-next-line local/no-any -- library-dependent type, container is mocked and doesn't have specific resolve typing
    ;(container.resolve as any) = mockResolve
  })

  describe('executeTsChecker', () => {
    it('should call container.resolve with CheckerService token', async () => {
      const checkerResult: CheckerResult = {
        ok: true,
        lint: { errors: [], warnings: [], exitCode: 0 },
        build: { errors: [], warnings: [], exitCode: 0 },
        test: { errors: [], warnings: [], exitCode: 0 }
      }
      mockCheckerService.check.mockResolvedValue(checkerResult)

      await executeTsChecker({})

      expect(mockResolve).toHaveBeenCalledWith(TOKENS.CheckerService)
    })

    it('should pass all arguments to service.check with camelCase keys', async () => {
      const checkerResult: CheckerResult = {
        ok: true,
        lint: { errors: [], warnings: [], exitCode: 0 },
        build: { errors: [], warnings: [], exitCode: 0 },
        test: { errors: [], warnings: [], exitCode: 0 }
      }
      mockCheckerService.check.mockResolvedValue(checkerResult)

      await executeTsChecker({
        project_root: '/path/to/project',
        lint_command: 'eslint .',
        build_command: 'npm run build',
        test_command: 'npm test'
      })

      expect(mockCheckerService.check).toHaveBeenCalledWith({
        projectRoot: '/path/to/project',
        lintCommand: 'eslint .',
        buildCommand: 'npm run build',
        testCommand: 'npm test'
      })
    })

    it('should pass no arguments when args object is empty', async () => {
      const checkerResult: CheckerResult = {
        ok: true,
        lint: { errors: [], warnings: [], exitCode: 0 },
        build: { errors: [], warnings: [], exitCode: 0 },
        test: { errors: [], warnings: [], exitCode: 0 }
      }
      mockCheckerService.check.mockResolvedValue(checkerResult)

      await executeTsChecker({})

      expect(mockCheckerService.check).toHaveBeenCalledWith({
        projectRoot: undefined,
        lintCommand: undefined,
        buildCommand: undefined,
        testCommand: undefined
      })
    })

    it('should pass only provided arguments to service.check', async () => {
      const checkerResult: CheckerResult = {
        ok: true,
        lint: { errors: [], warnings: [], exitCode: 0 },
        build: { errors: [], warnings: [], exitCode: 0 },
        test: { errors: [], warnings: [], exitCode: 0 }
      }
      mockCheckerService.check.mockResolvedValue(checkerResult)

      await executeTsChecker({
        project_root: '/path/to/project',
        lint_command: 'eslint .'
      })

      expect(mockCheckerService.check).toHaveBeenCalledWith({
        projectRoot: '/path/to/project',
        lintCommand: 'eslint .',
        buildCommand: undefined,
        testCommand: undefined
      })
    })

    it('should return result as JSON-stringified text in content array', async () => {
      const checkerResult: CheckerResult = {
        ok: true,
        lint: { errors: [], warnings: [], exitCode: 0 },
        build: { errors: [], warnings: [], exitCode: 0 },
        test: { errors: [], warnings: [], exitCode: 0 }
      }
      mockCheckerService.check.mockResolvedValue(checkerResult)

      const result = await executeTsChecker({})

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(checkerResult, null, 2)
          }
        ]
      })
    })

    it('should stringify checker result with proper formatting (2-space indentation)', async () => {
      const checkerResult: CheckerResult = {
        ok: false,
        lint: { errors: ['error1'], warnings: ['warning1'], exitCode: 1 },
        build: { errors: [], warnings: [], exitCode: 0 },
        test: { errors: ['test-error'], warnings: [], exitCode: 1 }
      }
      mockCheckerService.check.mockResolvedValue(checkerResult)

      const result = await executeTsChecker({})

      const stringifiedResult = JSON.stringify(checkerResult, null, 2)
      expect(result.content[0].text).toBe(stringifiedResult)
      expect(result.content[0].text).toContain('"ok": false')
      expect(result.content[0].text).toContain('"error1"')
      expect(result.content[0].text).toContain('"test-error"')
    })

    it('should propagate service errors', async () => {
      const error = new Error('Service check failed')
      mockCheckerService.check.mockRejectedValue(error)

      await expect(executeTsChecker({})).rejects.toThrow('Service check failed')
    })

    it('should return result with all command results having errors', async () => {
      const checkerResult: CheckerResult = {
        ok: false,
        lint: { errors: ['lint-error'], warnings: ['lint-warning'], exitCode: 1 },
        build: { errors: ['build-error'], warnings: [], exitCode: 1 },
        test: { errors: ['test-error1', 'test-error2'], warnings: ['test-warning'], exitCode: 1 }
      }
      mockCheckerService.check.mockResolvedValue(checkerResult)

      const result = await executeTsChecker({})

      const parsed = JSON.parse(result.content[0].text) as CheckerResult
      expect(parsed.ok).toBe(false)
      expect(parsed.lint.errors).toContain('lint-error')
      expect(parsed.build.errors).toContain('build-error')
      expect(parsed.test.errors).toContain('test-error1')
    })

    it('should return result with successful checks', async () => {
      const checkerResult: CheckerResult = {
        ok: true,
        lint: { errors: [], warnings: [], exitCode: 0 },
        build: { errors: [], warnings: [], exitCode: 0 },
        test: { errors: [], warnings: [], exitCode: 0 }
      }
      mockCheckerService.check.mockResolvedValue(checkerResult)

      const result = await executeTsChecker({})

      const parsed = JSON.parse(result.content[0].text) as CheckerResult
      expect(parsed.ok).toBe(true)
      expect(parsed.lint.exitCode).toBe(0)
      expect(parsed.build.exitCode).toBe(0)
      expect(parsed.test.exitCode).toBe(0)
    })

    it('should return result with only warnings, no errors', async () => {
      const checkerResult: CheckerResult = {
        ok: true,
        lint: { errors: [], warnings: ['warning1', 'warning2'], exitCode: 0 },
        build: { errors: [], warnings: ['build-warning'], exitCode: 0 },
        test: { errors: [], warnings: [], exitCode: 0 }
      }
      mockCheckerService.check.mockResolvedValue(checkerResult)

      const result = await executeTsChecker({})

      const parsed = JSON.parse(result.content[0].text) as CheckerResult
      expect(parsed.ok).toBe(true)
      expect(parsed.lint.warnings).toEqual(['warning1', 'warning2'])
      expect(parsed.build.warnings).toEqual(['build-warning'])
    })
  })
})
