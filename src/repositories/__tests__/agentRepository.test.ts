import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@src/repositories/parsers/claudeCodeParser', () => ({
  createParseState: vi.fn(),
  processLine: vi.fn(),
  finalizeParseState: vi.fn(),
  emitStreamEvents: vi.fn()
}))

vi.mock('@src/repositories/parsers/claudeSessionScanner', () => ({
  computeBaselinesFromContent: vi.fn().mockReturnValue({ lineCount: 0, messagesTotal: 0 })
}))

import { ClaudeCodeRepository } from '../agentRepository'
import type { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
import {
  createParseState,
  processLine,
  finalizeParseState,
  emitStreamEvents
} from '@src/repositories/parsers/claudeCodeParser'
import { computeBaselinesFromContent } from '@src/repositories/parsers/claudeSessionScanner'
import { RawExitError } from '@src/errors/rawExitError'
import { RateLimitError } from '@src/errors/rateLimitError'
import { APIError } from '@src/errors/apiError'
import type { StartAction, ForkAction, RawOutput } from '@src/types/claudeCode'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function* yieldLines(...lines: string[]): AsyncGenerator<string> {
  for (const line of lines) yield line
}

async function* throwAfterLines(lines: string[], error: Error): AsyncGenerator<string> {
  for (const line of lines) yield line
  throw error
}

async function* throwImmediately(error: Error): AsyncGenerator<string> {
  yield* [] as string[] // satisfy require-yield; never produces a value
  throw error
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const stubRawOutput: RawOutput = {
  content: 'result text',
  thoughts: [],
  tool_history: [],
  usage: { input_tokens: 10, output_tokens: 20 },
  message_count: 3
}

const startAction: StartAction = {
  type: 'start',
  sessionId: 'sess-abc',
  prompt: 'do something',
  workingDir: '/work'
}

const forkAction: ForkAction = {
  type: 'fork',
  originalClaudeSessionId: 'orig-claude-sess',
  originalWorkingDir: '/orig-work',
  sessionId: 'fork-sess-1',
  prompt: 'fork task',
  workingDir: '/fork-work'
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const mockParseState = {}

describe('ClaudeCodeRepository', () => {
  let repo: ClaudeCodeRepository
  let mockInfra: ClaudeCodeInfra

  beforeEach(() => {
    vi.clearAllMocks()
    mockInfra = {
      buildArgs: vi.fn().mockReturnValue(['-p', '--output-format', 'stream-json']),
      resolveJsonlPath: vi.fn().mockReturnValue('/path/to/session.jsonl'),
      readJsonlContent: vi.fn().mockReturnValue(''),
      runClaude: vi.fn().mockReturnValue(yieldLines()),
      writeStderr: vi.fn(),
      spawnInteractive: vi.fn()
    } as unknown as ClaudeCodeInfra
    vi.mocked(createParseState).mockReturnValue(
      mockParseState as ReturnType<typeof createParseState>
    )
    vi.mocked(finalizeParseState).mockReturnValue(stubRawOutput)
    repo = new ClaudeCodeRepository(mockInfra)
  })

  describe('dispatch', () => {
    // -----------------------------------------------------------------------
    // Happy path
    // -----------------------------------------------------------------------

    it('returns the RawOutput produced by finalizeParseState', async () => {
      const result = await repo.dispatch(startAction)

      expect(result).toMatchObject(stubRawOutput)
    })

    it('calls processLine for each yielded line and finalizeParseState with the jsonl baseline', async () => {
      mockInfra.runClaude = vi.fn().mockReturnValue(yieldLines('line1', 'line2'))
      mockInfra.readJsonlContent = vi.fn().mockReturnValue('a\nb\nc\nd\ne')
      vi.mocked(computeBaselinesFromContent).mockReturnValueOnce({ lineCount: 5, messagesTotal: 0 })

      await repo.dispatch(startAction)

      expect(vi.mocked(processLine)).toHaveBeenCalledWith(mockParseState, 'line1')
      expect(vi.mocked(processLine)).toHaveBeenCalledWith(mockParseState, 'line2')
      expect(vi.mocked(finalizeParseState)).toHaveBeenCalledWith(mockParseState, 5)
    })

    it('resolves the jsonl baseline using sessionId and workingDir for a start action', async () => {
      await repo.dispatch(startAction)

      expect(mockInfra.resolveJsonlPath).toHaveBeenCalledWith('sess-abc', '/work')
    })

    it('resolves the jsonl baseline using originalClaudeSessionId and originalWorkingDir for a fork action', async () => {
      await repo.dispatch(forkAction)

      expect(mockInfra.resolveJsonlPath).toHaveBeenCalledWith('orig-claude-sess', '/orig-work')
    })

    it('calls emitStreamEvents for each yielded line when onStreamEvent is provided', async () => {
      const onStreamEvent = vi.fn()
      mockInfra.runClaude = vi.fn().mockReturnValue(yieldLines('line1', 'line2'))

      await repo.dispatch(startAction, onStreamEvent)

      expect(vi.mocked(emitStreamEvents)).toHaveBeenCalledWith(
        'line1',
        expect.any(Map),
        onStreamEvent
      )
      expect(vi.mocked(emitStreamEvents)).toHaveBeenCalledWith(
        'line2',
        expect.any(Map),
        onStreamEvent
      )
    })

    it('does not call emitStreamEvents when onStreamEvent is omitted', async () => {
      mockInfra.runClaude = vi.fn().mockReturnValue(yieldLines('line1'))

      await repo.dispatch(startAction)

      expect(vi.mocked(emitStreamEvents)).not.toHaveBeenCalled()
    })

    // -----------------------------------------------------------------------
    // classifyExitError branches — triggered when runClaude throws RawExitError
    // -----------------------------------------------------------------------

    it('throws RateLimitError when RawExitError stderr contains "you\'ve hit your limit"', async () => {
      mockInfra.runClaude = vi
        .fn()
        .mockReturnValue(throwImmediately(new RawExitError(1, "you've hit your limit")))

      await expect(repo.dispatch(startAction)).rejects.toBeInstanceOf(RateLimitError)
    })

    it('throws RateLimitError when RawExitError stderr contains "you have hit your limit"', async () => {
      mockInfra.runClaude = vi
        .fn()
        .mockReturnValue(throwImmediately(new RawExitError(1, 'you have hit your limit')))

      await expect(repo.dispatch(startAction)).rejects.toBeInstanceOf(RateLimitError)
    })

    it('includes extracted reset info in RateLimitError when stderr contains the resets? pattern', async () => {
      mockInfra.runClaude = vi
        .fn()
        .mockReturnValue(
          throwAfterLines([], new RawExitError(1, "you've hit your limit resets in 3 hours"))
        )

      let caught: unknown
      try {
        await repo.dispatch(startAction)
      } catch (e) {
        caught = e
      }

      expect(caught).toBeInstanceOf(RateLimitError)
      expect((caught as RateLimitError).resetInfo).toBe('in 3 hours')
    })

    it('sets resetInfo to undefined in RateLimitError when the resets? pattern is absent from stderr', async () => {
      mockInfra.runClaude = vi
        .fn()
        .mockReturnValue(throwImmediately(new RawExitError(1, "you've hit your limit")))

      let caught: unknown
      try {
        await repo.dispatch(startAction)
      } catch (e) {
        caught = e
      }

      expect(caught).toBeInstanceOf(RateLimitError)
      expect((caught as RateLimitError).resetInfo).toBeUndefined()
    })

    it('throws APIError when RawExitError is not a rate-limit error', async () => {
      mockInfra.runClaude = vi
        .fn()
        .mockReturnValue(throwImmediately(new RawExitError(2, 'some unexpected failure')))

      await expect(repo.dispatch(startAction)).rejects.toBeInstanceOf(APIError)
    })

    it('writes stderr to infra before throwing APIError when RawExitError has non-empty stderr', async () => {
      mockInfra.runClaude = vi
        .fn()
        .mockReturnValue(throwImmediately(new RawExitError(2, 'some unexpected failure')))

      await expect(repo.dispatch(startAction)).rejects.toBeInstanceOf(APIError)

      expect(mockInfra.writeStderr).toHaveBeenCalledWith('some unexpected failure')
    })

    it('does not call writeStderr when RawExitError has an empty stderr string', async () => {
      mockInfra.runClaude = vi.fn().mockReturnValue(throwImmediately(new RawExitError(2, '')))

      await expect(repo.dispatch(startAction)).rejects.toBeInstanceOf(APIError)

      expect(mockInfra.writeStderr).not.toHaveBeenCalled()
    })

    // -----------------------------------------------------------------------
    // Error passthrough
    // -----------------------------------------------------------------------

    it('rethrows non-RawExitError errors from runClaude unchanged', async () => {
      const originalError = new Error('spawn failed')
      mockInfra.runClaude = vi.fn().mockReturnValue(throwImmediately(originalError))

      await expect(repo.dispatch(startAction)).rejects.toBe(originalError)
    })
  })
})
