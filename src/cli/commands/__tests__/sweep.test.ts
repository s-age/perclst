import { vi, describe, it, expect, beforeEach } from 'vitest'
import { sweepCommand } from '../sweep'
import * as output from '@src/utils/output'
import { ValidationError } from '@src/errors/validationError'
import { parseSweepSession } from '@src/validators/cli/sweepSession'
import { container } from '@src/core/di/container'

// Mock dependencies
vi.mock('@src/core/di/container')
vi.mock('@src/validators/cli/sweepSession')
vi.mock('@src/utils/output')

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

// Mock container and services
const mockSessionService = {
  sweep: vi.fn()
}

vi.mocked(container).resolve = vi.fn(() => mockSessionService) as never

describe('sweepCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExit.mockClear()
  })

  describe('happy path', () => {
    it('should delete matching sessions and print their details', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          name: 'test-session',
          created_at: '2026-04-20T10:00:00Z',
          metadata: { status: 'completed' }
        }
      ]

      vi.mocked(parseSweepSession).mockReturnValue({
        from: undefined,
        to: undefined,
        status: undefined,
        like: undefined,
        anonOnly: false,
        dryRun: false,
        force: false
      })

      mockSessionService.sweep.mockResolvedValue(mockSessions)

      await sweepCommand({})

      expect(output.stdout.print).toHaveBeenCalledWith('\nDeleted 1 session(s):\n')
      expect(output.stdout.print).toHaveBeenCalledWith(
        '  [completed] test-session(session-1)  created: 2026-04-20'
      )
      expect(mockExit).not.toHaveBeenCalled()
    })

    it('should print dry-run message when dryRun flag is set', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          name: 'test-session',
          created_at: '2026-04-20T10:00:00Z',
          metadata: { status: 'active' }
        }
      ]

      vi.mocked(parseSweepSession).mockReturnValue({
        from: undefined,
        to: undefined,
        status: undefined,
        like: undefined,
        anonOnly: false,
        dryRun: true,
        force: false
      })

      mockSessionService.sweep.mockResolvedValue(mockSessions)

      await sweepCommand({ dryRun: true })

      expect(output.stdout.print).toHaveBeenCalledWith(
        '\n[dry-run] 1 session(s) would be deleted:\n'
      )
      expect(mockExit).not.toHaveBeenCalled()
    })

    it('should print message when no sessions match filters', async () => {
      vi.mocked(parseSweepSession).mockReturnValue({
        from: undefined,
        to: undefined,
        status: undefined,
        like: undefined,
        anonOnly: false,
        dryRun: false,
        force: false
      })

      mockSessionService.sweep.mockResolvedValue([])

      await sweepCommand({})

      expect(output.stdout.print).toHaveBeenCalledWith('No sessions matched the given filters')
      expect(mockExit).not.toHaveBeenCalled()
    })

    it('should handle anonymous sessions by printing "anonymous" as label', async () => {
      const mockSessions = [
        {
          id: 'anon-session-1',
          name: undefined,
          created_at: '2026-04-20T10:00:00Z',
          metadata: { status: 'failed' }
        }
      ]

      vi.mocked(parseSweepSession).mockReturnValue({
        from: undefined,
        to: undefined,
        status: undefined,
        like: undefined,
        anonOnly: false,
        dryRun: false,
        force: false
      })

      mockSessionService.sweep.mockResolvedValue(mockSessions)

      await sweepCommand({})

      expect(output.stdout.print).toHaveBeenCalledWith(
        '  [failed] anonymous(anon-session-1)  created: 2026-04-20'
      )
    })

    it('should print multiple sessions with their details', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          name: 'first-session',
          created_at: '2026-04-20T10:00:00Z',
          metadata: { status: 'completed' }
        },
        {
          id: 'session-2',
          name: 'second-session',
          created_at: '2026-04-21T10:00:00Z',
          metadata: { status: 'active' }
        }
      ]

      vi.mocked(parseSweepSession).mockReturnValue({
        from: undefined,
        to: undefined,
        status: undefined,
        like: undefined,
        anonOnly: false,
        dryRun: false,
        force: false
      })

      mockSessionService.sweep.mockResolvedValue(mockSessions)

      await sweepCommand({})

      expect(output.stdout.print).toHaveBeenCalledWith('\nDeleted 2 session(s):\n')
      expect(output.stdout.print).toHaveBeenCalledWith(
        '  [completed] first-session(session-1)  created: 2026-04-20'
      )
      expect(output.stdout.print).toHaveBeenCalledWith(
        '  [active] second-session(session-2)  created: 2026-04-21'
      )
    })

    it('should pass filter options to sessionService.sweep()', async () => {
      vi.mocked(parseSweepSession).mockReturnValue({
        from: '2026-04-20',
        to: '2026-04-22',
        status: 'completed',
        like: 'test-*',
        anonOnly: true,
        dryRun: false,
        force: false
      })

      mockSessionService.sweep.mockResolvedValue([])

      await sweepCommand({
        from: '2026-04-20',
        to: '2026-04-22',
        status: 'completed',
        like: 'test-*',
        anonOnly: true
      })

      expect(mockSessionService.sweep).toHaveBeenCalledWith(
        {
          from: '2026-04-20',
          to: '2026-04-22',
          status: 'completed',
          like: 'test-*',
          anonOnly: true
        },
        false
      )
    })

    it('should pass dryRun flag to sessionService.sweep()', async () => {
      vi.mocked(parseSweepSession).mockReturnValue({
        from: undefined,
        to: undefined,
        status: undefined,
        like: undefined,
        anonOnly: false,
        dryRun: true,
        force: false
      })

      mockSessionService.sweep.mockResolvedValue([])

      await sweepCommand({ dryRun: true })

      expect(mockSessionService.sweep).toHaveBeenCalledWith(expect.any(Object), true)
    })

    it('should default optional flags to false when not provided', async () => {
      vi.mocked(parseSweepSession).mockReturnValue({
        from: undefined,
        to: undefined,
        status: undefined,
        like: undefined,
        anonOnly: false,
        dryRun: false,
        force: false
      })

      mockSessionService.sweep.mockResolvedValue([])

      await sweepCommand({})

      expect(vi.mocked(parseSweepSession)).toHaveBeenCalledWith({
        from: undefined,
        to: undefined,
        status: undefined,
        like: undefined,
        anonOnly: false,
        dryRun: false,
        force: false
      })
    })
  })

  describe('error handling', () => {
    it('should catch ValidationError and print to stderr with exit code 1', async () => {
      const validationError = new ValidationError('Invalid date format')
      vi.mocked(parseSweepSession).mockImplementation(() => {
        throw validationError
      })

      await sweepCommand({})

      expect(output.stderr.print).toHaveBeenCalledWith('Invalid arguments: Invalid date format')
      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should catch other errors and print to stderr with exit code 1', async () => {
      vi.mocked(parseSweepSession).mockReturnValue({
        from: undefined,
        to: undefined,
        status: undefined,
        like: undefined,
        anonOnly: false,
        dryRun: false,
        force: false
      })

      const testError = new Error('Service connection failed')
      mockSessionService.sweep.mockRejectedValue(testError)

      await sweepCommand({})

      expect(output.stderr.print).toHaveBeenCalledWith('Failed to sweep sessions', testError)
      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should handle ValidationError with empty message', async () => {
      const validationError = new ValidationError('')
      vi.mocked(parseSweepSession).mockImplementation(() => {
        throw validationError
      })

      await sweepCommand({})

      expect(output.stderr.print).toHaveBeenCalledWith('Invalid arguments: ')
      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should handle generic Error thrown by sessionService.sweep()', async () => {
      vi.mocked(parseSweepSession).mockReturnValue({
        from: undefined,
        to: undefined,
        status: undefined,
        like: undefined,
        anonOnly: false,
        dryRun: false,
        force: false
      })

      const genericError = new Error('Unexpected error occurred')
      mockSessionService.sweep.mockRejectedValue(genericError)

      await sweepCommand({})

      expect(output.stderr.print).toHaveBeenCalledWith('Failed to sweep sessions', genericError)
      expect(mockExit).toHaveBeenCalledWith(1)
    })
  })

  describe('integration', () => {
    it('should resolve SessionService from container', async () => {
      vi.mocked(parseSweepSession).mockReturnValue({
        from: undefined,
        to: undefined,
        status: undefined,
        like: undefined,
        anonOnly: false,
        dryRun: false,
        force: false
      })

      mockSessionService.sweep.mockResolvedValue([])

      await sweepCommand({})

      expect(vi.mocked(container).resolve).toHaveBeenCalled()
    })

    it('should call validator with all provided options', async () => {
      vi.mocked(parseSweepSession).mockReturnValue({
        from: '2026-04-20',
        to: '2026-04-22',
        status: 'completed',
        like: 'test-*',
        anonOnly: true,
        dryRun: true,
        force: true
      })

      mockSessionService.sweep.mockResolvedValue([])

      await sweepCommand({
        from: '2026-04-20',
        to: '2026-04-22',
        status: 'completed',
        like: 'test-*',
        anonOnly: true,
        dryRun: true,
        force: true
      })

      expect(vi.mocked(parseSweepSession)).toHaveBeenCalledWith({
        from: '2026-04-20',
        to: '2026-04-22',
        status: 'completed',
        like: 'test-*',
        anonOnly: true,
        dryRun: true,
        force: true
      })
    })
  })
})
