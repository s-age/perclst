import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeTsChecker } from '@src/mcp/tools/tsChecker'
import { setupContainer } from '@src/core/di/setup'
import { makeTmpDir, buildTestConfig } from '@src/__tests__/helpers'
import { buildCommandRunnerInfraStub } from '@src/__tests__/integration/cli/helpers'
import type { CheckerResult } from '@src/types/checker'
import type { Infras } from '@src/core/di/setupInfrastructures'

describe('executeTsChecker (integration)', () => {
  let dir: string
  let cleanup: () => void
  let commandRunner: Infras['commandRunnerInfra']

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())

    commandRunner = buildCommandRunnerInfraStub({ exitCode: 0 })

    setupContainer({
      config: buildTestConfig(dir),
      infras: { commandRunnerInfra: commandRunner }
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

    describe('output parsing', () => {
      it('error/warning lines are classified with file paths', async () => {
        const runner = buildCommandRunnerInfraStub({
          exitCode: 1,
          stdout: [
            '/src/file.ts',
            '  1:1  error  Missing semicolon  semi',
            '  2:1  warning  Unused variable  no-unused-vars',
            '',
            '2 problems (1 error, 1 warning)'
          ].join('\n')
        })
        setupContainer({ config: buildTestConfig(dir), infras: { commandRunnerInfra: runner } })

        const result = await executeTsChecker({ project_root: dir })
        const parsed = JSON.parse(result.content[0].text) as CheckerResult

        expect(parsed.lint.errors[0]).toContain('/src/file.ts')
        expect(parsed.lint.warnings[0]).toContain('/src/file.ts')
      })

      it('lines matching ERROR_IGNORE_PATTERNS are filtered', async () => {
        const runner = buildCommandRunnerInfraStub({
          exitCode: 1,
          stdout: 'Error: rollup plugin failed\n  1:1  error  Real error  rule'
        })
        setupContainer({ config: buildTestConfig(dir), infras: { commandRunnerInfra: runner } })

        const result = await executeTsChecker({ project_root: dir })
        const parsed = JSON.parse(result.content[0].text) as CheckerResult

        expect(parsed.lint.errors).toHaveLength(1)
        expect(parsed.lint.errors[0]).toContain('Real error')
      })
    })

    describe('project_root fallback', () => {
      it('findProjectRoot is used when project_root is omitted', async () => {
        setupContainer({
          config: buildTestConfig(dir),
          infras: { commandRunnerInfra: commandRunner }
        })

        const result = await executeTsChecker({})
        const parsed = JSON.parse(result.content[0].text) as CheckerResult

        expect(parsed.ok).toBe(true)
      })
    })

    describe('custom commands', () => {
      it('forwards lint_command to commandRunnerInfra.runCommand', async () => {
        await executeTsChecker({ project_root: dir, lint_command: 'custom-lint' })

        expect(commandRunner.runCommand).toHaveBeenCalledWith('custom-lint', dir)
      })

      it('forwards build_command to commandRunnerInfra.runCommand', async () => {
        await executeTsChecker({ project_root: dir, build_command: 'custom-build' })

        expect(commandRunner.runCommand).toHaveBeenCalledWith('custom-build', dir)
      })

      it('forwards typecheck_command to commandRunnerInfra.runCommand', async () => {
        await executeTsChecker({ project_root: dir, typecheck_command: 'custom-typecheck' })

        expect(commandRunner.runCommand).toHaveBeenCalledWith('custom-typecheck', dir)
      })

      it('forwards test_command to commandRunnerInfra.runCommand', async () => {
        await executeTsChecker({ project_root: dir, test_command: 'custom-test' })

        expect(commandRunner.runCommand).toHaveBeenCalledWith('custom-test', dir)
      })
    })
  })
})
