import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { surveyCommand } from '../survey'
import { stderr } from '@src/utils/output'

// Mock only the startCommand module
vi.mock('../start', () => ({
  startCommand: vi.fn()
}))

import { startCommand } from '../start'

describe('surveyCommand', () => {
  let stderrPrintSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    // Explicitly clear startCommand mock to ensure fresh state
    vi.mocked(startCommand).mockClear()
    // Spy on stderr.print to track calls
    stderrPrintSpy = vi.spyOn(stderr, 'print').mockImplementation(() => {})
  })

  afterEach(() => {
    stderrPrintSpy.mockRestore()
  })

  describe('refresh option', () => {
    it('calls startCommand with refresh procedure when refresh is true', async () => {
      await surveyCommand('some query', { refresh: true, outputOnly: false })

      expect(startCommand).toHaveBeenCalledOnce()
      expect(startCommand).toHaveBeenCalledWith(
        'Refresh all codebase catalogs in .claude/skills/code-base-survey/ to reflect the current state of src/.',
        {
          procedure: 'code-base-survey-refresh',
          labels: ['survey'],
          model: 'sonnet',
          allowedTools: [
            'Skill',
            'Read',
            'Glob',
            'Grep',
            'Bash',
            'Write',
            'mcp__perclst__ts_analyze'
          ],
          outputOnly: false
        }
      )
    })

    it('returns early when refresh is true, ignoring query parameter', async () => {
      await surveyCommand(undefined, { refresh: true, outputOnly: true })

      expect(startCommand).toHaveBeenCalledOnce()
      expect(stderrPrintSpy).not.toHaveBeenCalled()
    })

    it('passes outputOnly flag to startCommand in refresh procedure', async () => {
      await surveyCommand('query', { refresh: true, outputOnly: true })

      expect(startCommand).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          outputOnly: true
        })
      )
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
        expect(startCommand).not.toHaveBeenCalled()
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
    it('calls startCommand with survey procedure when query is provided', async () => {
      await surveyCommand('find authentication bugs', { refresh: false, outputOnly: false })

      expect(startCommand).toHaveBeenCalledOnce()
      expect(startCommand).toHaveBeenCalledWith('find authentication bugs', {
        procedure: 'code-base-survey',
        labels: ['survey'],
        model: 'sonnet',
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
        outputOnly: false
      })
    })

    it('passes query directly to startCommand', async () => {
      const testQuery = 'investigate performance issues'

      await surveyCommand(testQuery, { refresh: false, outputOnly: false })

      expect(startCommand).toHaveBeenCalledWith(testQuery, expect.any(Object))
    })

    it('passes outputOnly flag to startCommand in survey procedure', async () => {
      await surveyCommand('test query', { refresh: false, outputOnly: true })

      expect(startCommand).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          outputOnly: true
        })
      )
    })

    it('does not call stderr when query is provided', async () => {
      await surveyCommand('valid query', { refresh: false })

      expect(stderrPrintSpy).not.toHaveBeenCalled()
    })
  })

  describe('options defaults', () => {
    it('treats undefined refresh as false', async () => {
      await surveyCommand('my query', { outputOnly: false })

      expect(startCommand).toHaveBeenCalledWith(
        'my query',
        expect.objectContaining({
          procedure: 'code-base-survey'
        })
      )
    })

    it('treats undefined outputOnly as falsy', async () => {
      await surveyCommand('query', { refresh: false })

      expect(startCommand).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          outputOnly: undefined
        })
      )
    })
  })
})
