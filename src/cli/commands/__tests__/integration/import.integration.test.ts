import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { importCommand } from '../../import'
import { setupContainer } from '@src/core/di/setup'
import { makeTmpDir, buildTestConfig } from './helpers'
import { stdout, stderr } from '@src/utils/output'
import { UserCancelledError } from '@src/errors/userCancelledError'
import { confirmIfDuplicateName } from '@src/cli/prompt'
import type { Session } from '@src/types/session'
import type { ImportService } from '@src/services/importService'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('importCommand (integration)', () => {
  let dir: string
  let cleanup: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  function buildFakeSession(overrides: Partial<Session> = {}): Session {
    return {
      id: 'imported-session-id',
      claude_session_id: 'claude-session-abc123',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      working_dir: '/tmp/project',
      metadata: { labels: [], status: 'completed' },
      ...overrides
    }
  }

  describe('happy path', () => {
    it('stdout に "Imported: <id>" が出力される', async () => {
      const session = buildFakeSession()
      const importMock = vi.fn().mockResolvedValue(session)
      setupContainer({
        config: buildTestConfig(dir),
        services: { importService: { import: importMock } as unknown as ImportService }
      })

      await importCommand('claude-session-abc123', {})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(`Imported: ${session.id}`)
    })

    it('stdout に "  Claude session: <claude_session_id>" が出力される', async () => {
      const session = buildFakeSession()
      const importMock = vi.fn().mockResolvedValue(session)
      setupContainer({
        config: buildTestConfig(dir),
        services: { importService: { import: importMock } as unknown as ImportService }
      })

      await importCommand('claude-session-abc123', {})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        `  Claude session: ${session.claude_session_id}`
      )
    })

    it('--name 指定のとき confirmIfDuplicateName が呼ばれる', async () => {
      const session = buildFakeSession({ name: 'my-session' })
      const importMock = vi.fn().mockResolvedValue(session)
      setupContainer({
        config: buildTestConfig(dir),
        services: { importService: { import: importMock } as unknown as ImportService }
      })

      await importCommand('claude-session-abc123', { name: 'my-session' })

      expect(vi.mocked(confirmIfDuplicateName)).toHaveBeenCalled()
    })

    it('--labels 指定のとき import に labels が渡される', async () => {
      const session = buildFakeSession()
      const importMock = vi.fn().mockResolvedValue(session)
      setupContainer({
        config: buildTestConfig(dir),
        services: { importService: { import: importMock } as unknown as ImportService }
      })

      await importCommand('claude-session-abc123', { labels: ['foo', 'bar'] })

      expect(importMock).toHaveBeenCalledWith(
        'claude-session-abc123',
        expect.objectContaining({ labels: ['foo', 'bar'] })
      )
    })
  })

  describe('error path', () => {
    it('UserCancelledError のとき process.exit(0) と "Cancelled." が出る', async () => {
      vi.mocked(confirmIfDuplicateName).mockRejectedValue(new UserCancelledError())
      const importMock = vi.fn()
      setupContainer({
        config: buildTestConfig(dir),
        services: { importService: { import: importMock } as unknown as ImportService }
      })

      await expect(importCommand('claude-session-abc123', { name: 'test' })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(0)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Cancelled.')
    })

    it('Generic Error のとき process.exit(1) と "Failed to import session" が出る', async () => {
      const err = new Error('import failed')
      const importMock = vi.fn().mockRejectedValue(err)
      setupContainer({
        config: buildTestConfig(dir),
        services: { importService: { import: importMock } as unknown as ImportService }
      })

      await expect(importCommand('claude-session-abc123', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to import session', err)
    })
  })
})
