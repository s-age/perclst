import { vi, describe, it, expect, beforeEach } from 'vitest'

// vi.hoisted: both the mock infra object and the constructor function are created together so the
// factory can reference them without issues (vi.fn() inside vi.mock factories is unreliable because
// mock factories are hoisted before module scope, but vi.hoisted values are evaluated first)
const { mockInfra, MockClaudeCodeInfra } = vi.hoisted(() => {
  const infra = {
    buildArgs: vi.fn(),
    resolveJsonlPath: vi.fn(),
    countJsonlLines: vi.fn(),
    runClaude: vi.fn(),
    writeStderr: vi.fn()
  }
  // regular function (not arrow) so it is newable; returning an object from a constructor makes
  // `new` yield that object — i.e. `new ClaudeCodeInfra()` will be `infra`
  function MockInfra() {
    return infra
  }
  return { mockInfra: infra, MockClaudeCodeInfra: MockInfra }
})

vi.mock('@src/infrastructures/claudeCode', () => ({
  ClaudeCodeInfra: MockClaudeCodeInfra
}))

vi.mock('@src/repositories/parsers/claudeCodeParser', () => ({
  parseStreamEvents: vi.fn(),
  emitStreamEvents: vi.fn()
}))

import { ClaudeCodeRepository } from '../agentRepository'
import { parseStreamEvents, emitStreamEvents } from '@src/repositories/parsers/claudeCodeParser'
import { RawExitError } from '@src/errors/rawExitError'
import { RateLimitError } from '@src/errors/rateLimitError'
import { APIError } from '@src/errors/apiError'
import type { StartAction, ForkAction } from '@src/types/claudeCode'
import type { RawOutput } from '@src/types/claudeCode'

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

describe('ClaudeCodeRepository', () => {
  let repo: ClaudeCodeRepository

  beforeEach(() => {
    vi.clearAllMocks()
    mockInfra.buildArgs.mockReturnValue(['-p', '--output-format', 'stream-json'])
    mockInfra.resolveJsonlPath.mockReturnValue('/path/to/session.jsonl')
    mockInfra.countJsonlLines.mockReturnValue(0)
    mockInfra.runClaude.mockReturnValue(yieldLines())
    vi.mocked(parseStreamEvents).mockReturnValue(stubRawOutput)
    repo = new ClaudeCodeRepository()
  })

  describe('dispatch', () => {
    // -----------------------------------------------------------------------
    // Happy path
    // -----------------------------------------------------------------------

    it('returns the RawOutput produced by parseStreamEvents', async () => {
      const result = await repo.dispatch(startAction)

      expect(result).toBe(stubRawOutput)
    })

    it('passes all yielded lines and the jsonl baseline to parseStreamEvents', async () => {
      mockInfra.runClaude.mockReturnValue(yieldLines('line1', 'line2'))
      mockInfra.countJsonlLines.mockReturnValue(5)

      await repo.dispatch(startAction)

      expect(vi.mocked(parseStreamEvents)).toHaveBeenCalledWith(['line1', 'line2'], 5)
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
      mockInfra.runClaude.mockReturnValue(yieldLines('line1', 'line2'))

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
      mockInfra.runClaude.mockReturnValue(yieldLines('line1'))

      await repo.dispatch(startAction)

      expect(vi.mocked(emitStreamEvents)).not.toHaveBeenCalled()
    })

    // -----------------------------------------------------------------------
    // classifyExitError branches — triggered when runClaude throws RawExitError
    // -----------------------------------------------------------------------

    it('throws RateLimitError when RawExitError stderr contains "you\'ve hit your limit"', async () => {
      mockInfra.runClaude.mockReturnValue(
        throwImmediately(new RawExitError(1, "you've hit your limit"))
      )

      await expect(repo.dispatch(startAction)).rejects.toBeInstanceOf(RateLimitError)
    })

    it('throws RateLimitError when RawExitError stderr contains "you have hit your limit"', async () => {
      mockInfra.runClaude.mockReturnValue(
        throwImmediately(new RawExitError(1, 'you have hit your limit'))
      )

      await expect(repo.dispatch(startAction)).rejects.toBeInstanceOf(RateLimitError)
    })

    it('includes extracted reset info in RateLimitError when stderr contains the resets? pattern', async () => {
      mockInfra.runClaude.mockReturnValue(
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
      mockInfra.runClaude.mockReturnValue(
        throwImmediately(new RawExitError(1, "you've hit your limit"))
      )

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
      mockInfra.runClaude.mockReturnValue(
        throwImmediately(new RawExitError(2, 'some unexpected failure'))
      )

      await expect(repo.dispatch(startAction)).rejects.toBeInstanceOf(APIError)
    })

    it('writes stderr to infra before throwing APIError when RawExitError has non-empty stderr', async () => {
      mockInfra.runClaude.mockReturnValue(
        throwImmediately(new RawExitError(2, 'some unexpected failure'))
      )

      await expect(repo.dispatch(startAction)).rejects.toBeInstanceOf(APIError)

      expect(mockInfra.writeStderr).toHaveBeenCalledWith('some unexpected failure')
    })

    it('does not call writeStderr when RawExitError has an empty stderr string', async () => {
      mockInfra.runClaude.mockReturnValue(throwImmediately(new RawExitError(2, '')))

      await expect(repo.dispatch(startAction)).rejects.toBeInstanceOf(APIError)

      expect(mockInfra.writeStderr).not.toHaveBeenCalled()
    })

    // -----------------------------------------------------------------------
    // Error passthrough
    // -----------------------------------------------------------------------

    it('rethrows non-RawExitError errors from runClaude unchanged', async () => {
      const originalError = new Error('spawn failed')
      mockInfra.runClaude.mockReturnValue(throwImmediately(originalError))

      await expect(repo.dispatch(startAction)).rejects.toBe(originalError)
    })
  })
})
