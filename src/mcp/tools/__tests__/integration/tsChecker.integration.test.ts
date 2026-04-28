import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeTsChecker } from '../../tsChecker'
import { setupContainer, type Services } from '@src/core/di/setup'
import { makeTmpDir, buildTestConfig } from '@src/__tests__/helpers'
import type { CheckerResult } from '@src/types/checker'

const passResult: CheckerResult = {
  ok: true,
  lint: { errors: [], warnings: [], exitCode: 0 },
  build: { errors: [], warnings: [], exitCode: 0 },
  typecheck: { errors: [], warnings: [], exitCode: 0 },
  test: { errors: [], warnings: [], exitCode: 0 }
}

describe('executeTsChecker (integration)', () => {
  let dir: string
  let cleanup: () => void
  let mockCheckerService: Services['checkerService']

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())

    mockCheckerService = {
      check: vi.fn().mockResolvedValue(passResult)
    } as unknown as Services['checkerService']

    setupContainer({
      config: buildTestConfig(dir),
      services: { checkerService: mockCheckerService }
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    describe('project with no errors', () => {
      it('returns ok: true when all four phases succeed', async () => {
        const result = await executeTsChecker({ project_root: dir })
        const parsed = JSON.parse(result.content[0].text) as CheckerResult

        expect(parsed.ok).toBe(true)
      })

      it.each([['lint'], ['build'], ['typecheck'], ['test']] as const)(
        'returns empty errors array for %s phase when command exits with code 0',
        async (phase) => {
          const result = await executeTsChecker({ project_root: dir })
          const parsed = JSON.parse(result.content[0].text) as CheckerResult

          expect(parsed[phase].errors).toHaveLength(0)
        }
      )
    })

    describe('custom commands', () => {
      it('forwards lint_command to checkerService.check as lintCommand', async () => {
        await executeTsChecker({ project_root: dir, lint_command: 'custom-lint' })

        expect(vi.mocked(mockCheckerService.check)).toHaveBeenCalledWith(
          expect.objectContaining({ lintCommand: 'custom-lint' })
        )
      })

      it('forwards build_command to checkerService.check as buildCommand', async () => {
        await executeTsChecker({ project_root: dir, build_command: 'custom-build' })

        expect(vi.mocked(mockCheckerService.check)).toHaveBeenCalledWith(
          expect.objectContaining({ buildCommand: 'custom-build' })
        )
      })

      it('forwards typecheck_command to checkerService.check as typecheckCommand', async () => {
        await executeTsChecker({ project_root: dir, typecheck_command: 'custom-typecheck' })

        expect(vi.mocked(mockCheckerService.check)).toHaveBeenCalledWith(
          expect.objectContaining({ typecheckCommand: 'custom-typecheck' })
        )
      })

      it('forwards test_command to checkerService.check as testCommand', async () => {
        await executeTsChecker({ project_root: dir, test_command: 'custom-test' })

        expect(vi.mocked(mockCheckerService.check)).toHaveBeenCalledWith(
          expect.objectContaining({ testCommand: 'custom-test' })
        )
      })
    })
  })
})
