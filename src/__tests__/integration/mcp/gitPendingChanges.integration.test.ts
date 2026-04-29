import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeGitPendingChanges } from '@src/mcp/tools/gitPendingChanges'
import { setupContainer } from '@src/core/di/setup'
import { makeTmpDir, buildTestConfig } from '@src/__tests__/helpers'

describe('executeGitPendingChanges (integration)', () => {
  let dir: string
  let cleanup: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    execSync('git init -b main', { cwd: dir })
    execSync('git config user.email "test@test.com"', { cwd: dir })
    execSync('git config user.name "Test"', { cwd: dir })
    setupContainer({ config: buildTestConfig(dir) })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('includes staged file names in content[0].text when staged changes exist', async () => {
      writeFileSync(join(dir, 'base.txt'), 'base')
      execSync('git add base.txt', { cwd: dir })
      execSync('git commit -m "initial"', { cwd: dir })
      writeFileSync(join(dir, 'staged.txt'), 'staged content')
      execSync('git add staged.txt', { cwd: dir })

      const result = await executeGitPendingChanges({ repo_path: dir })

      expect(result.content[0].text).toContain('staged.txt')
    })

    it('includes unstaged file names in content[0].text when unstaged modifications exist', async () => {
      writeFileSync(join(dir, 'tracked.txt'), 'original content')
      execSync('git add tracked.txt', { cwd: dir })
      execSync('git commit -m "initial"', { cwd: dir })
      writeFileSync(join(dir, 'tracked.txt'), 'modified content')

      const result = await executeGitPendingChanges({ repo_path: dir })

      expect(result.content[0].text).toContain('tracked.txt')
    })

    it('returns "(no pending changes)" when the working tree is clean', async () => {
      writeFileSync(join(dir, 'file.txt'), 'content')
      execSync('git add file.txt', { cwd: dir })
      execSync('git commit -m "initial"', { cwd: dir })

      const result = await executeGitPendingChanges({ repo_path: dir })

      expect(result.content[0].text).toBe('(no pending changes)')
    })
  })

  describe('error path', () => {
    it('returns "(no pending changes)" when repo_path is not a git repository', async () => {
      // getPendingDiff catches all git errors and returns null → '(no pending changes)'
      const { dir: nonGitDir, cleanup: nonGitCleanup } = makeTmpDir()
      try {
        const result = await executeGitPendingChanges({ repo_path: nonGitDir })

        expect(result.content[0].text).toBe('(no pending changes)')
      } finally {
        nonGitCleanup()
      }
    })
  })
})
