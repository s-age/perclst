import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { surveyCommand } from '../survey'
import { stderr } from '@src/utils/output'
import { PROCEDURES_DIR } from './helper'

vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')
vi.mock('@src/cli/display')

import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'

describe('surveyCommand', () => {
  const mockAgentService = { start: vi.fn() }
  const mockConfig = { display: {} }
  let stderrPrintSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(container.resolve).mockImplementation((token) => {
      if (token === TOKENS.AgentService) return mockAgentService
      if (token === TOKENS.Config) return mockConfig
      throw new Error(`Unexpected token: ${String(token)}`)
    })
    mockAgentService.start.mockResolvedValue({
      sessionId: 'session-1',
      response: { content: 'ok' }
    })
    stderrPrintSpy = vi.spyOn(stderr, 'print').mockImplementation(() => {})
  })

  afterEach(() => {
    stderrPrintSpy.mockRestore()
  })

  describe('refresh option', () => {
    it('calls agentService.start with refresh procedure when refresh is true', async () => {
      await surveyCommand('some query', { refresh: true, outputOnly: false })

      expect(mockAgentService.start).toHaveBeenCalledOnce()
      expect(mockAgentService.start).toHaveBeenCalledWith(
        'Refresh all codebase catalogs in .claude/skills/code-base-survey/ to reflect the current state of src/.',
        expect.objectContaining({
          procedure: 'code-base-survey/refresh',
          labels: ['survey']
        }),
        expect.objectContaining({
          allowedTools: [
            'Skill',
            'Read',
            'Glob',
            'Grep',
            'Bash',
            'Write',
            'mcp__perclst__ts_analyze'
          ],
          model: 'sonnet'
        })
      )
    })

    it('returns early when refresh is true, ignoring query parameter', async () => {
      await surveyCommand(undefined, { refresh: true, outputOnly: true })

      expect(mockAgentService.start).toHaveBeenCalledOnce()
      expect(stderrPrintSpy).not.toHaveBeenCalled()
    })

    it('references a procedure file that exists', async () => {
      await surveyCommand(undefined, { refresh: true, outputOnly: true })

      const procedure = mockAgentService.start.mock.calls[0][1].procedure
      expect(existsSync(join(PROCEDURES_DIR, `${procedure}.md`))).toBe(true)
    })

    it('passes outputOnly flag through in refresh mode', async () => {
      await surveyCommand('query', { refresh: true, outputOnly: true })

      // When outputOnly is true, streaming is disabled — onStreamEvent should be undefined
      const runOptions = mockAgentService.start.mock.calls[0][2]
      expect(runOptions.onStreamEvent).toBeUndefined()
    })
  })

  describe('query validation', () => {
    it('calls stderr.print and exits when query is not provided and refresh is false', async () => {
      const exitError = new Error('process.exit(1)')
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw exitError
      })

      try {
        await expect(surveyCommand(undefined, { refresh: false })).rejects.toThrow(exitError)

        expect(stderrPrintSpy).toHaveBeenCalledWith(
          'A query is required. Use --refresh to update catalogs instead.'
        )
        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(mockAgentService.start).not.toHaveBeenCalled()
      } finally {
        exitSpy.mockRestore()
      }
    })

    it('calls stderr.print and exits when query is empty string and refresh is false', async () => {
      const exitError = new Error('process.exit(1)')
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw exitError
      })

      try {
        await expect(surveyCommand('', { refresh: false })).rejects.toThrow(exitError)

        expect(stderrPrintSpy).toHaveBeenCalledWith(
          'A query is required. Use --refresh to update catalogs instead.'
        )
        expect(exitSpy).toHaveBeenCalledWith(1)
      } finally {
        exitSpy.mockRestore()
      }
    })
  })

  describe('survey procedure', () => {
    it('calls agentService.start with survey procedure when query is provided', async () => {
      await surveyCommand('find authentication bugs', { refresh: false, outputOnly: false })

      expect(mockAgentService.start).toHaveBeenCalledOnce()
      expect(mockAgentService.start).toHaveBeenCalledWith(
        'find authentication bugs',
        expect.objectContaining({
          procedure: 'code-base-survey/survey',
          labels: ['survey']
        }),
        expect.objectContaining({
          allowedTools: [
            'Skill',
            'Read',
            'Glob',
            'Grep',
            'Write',
            'mcp__perclst__knowledge_search',
            'mcp__perclst__ts_analyze',
            'mcp__perclst__ts_get_references',
            'mcp__perclst__ts_get_types'
          ],
          model: 'sonnet'
        })
      )
    })

    it('passes query directly to agentService.start', async () => {
      const testQuery = 'investigate performance issues'

      await surveyCommand(testQuery, { refresh: false, outputOnly: false })

      expect(mockAgentService.start).toHaveBeenCalledWith(
        testQuery,
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('enables streaming when outputOnly is false', async () => {
      await surveyCommand('test query', { refresh: false, outputOnly: false })

      const runOptions = mockAgentService.start.mock.calls[0][2]
      expect(runOptions.onStreamEvent).toBeTypeOf('function')
    })

    it('disables streaming when outputOnly is true', async () => {
      await surveyCommand('test query', { refresh: false, outputOnly: true })

      const runOptions = mockAgentService.start.mock.calls[0][2]
      expect(runOptions.onStreamEvent).toBeUndefined()
    })

    it('references a procedure file that exists', async () => {
      await surveyCommand('query', { refresh: false, outputOnly: false })

      const procedure = mockAgentService.start.mock.calls[0][1].procedure
      expect(existsSync(join(PROCEDURES_DIR, `${procedure}.md`))).toBe(true)
    })

    it('does not call stderr when query is provided', async () => {
      await surveyCommand('valid query', { refresh: false })

      expect(stderrPrintSpy).not.toHaveBeenCalled()
    })
  })

  describe('options defaults', () => {
    it('treats undefined refresh as false and uses survey procedure', async () => {
      await surveyCommand('my query', { outputOnly: false })

      expect(mockAgentService.start).toHaveBeenCalledWith(
        'my query',
        expect.objectContaining({ procedure: 'code-base-survey/survey' }),
        expect.any(Object)
      )
    })

    it('enables streaming when outputOnly is undefined', async () => {
      await surveyCommand('query', { refresh: false })

      const runOptions = mockAgentService.start.mock.calls[0][2]
      expect(runOptions.onStreamEvent).toBeTypeOf('function')
    })
  })
})
