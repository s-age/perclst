import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { curateCommand } from '../curate'
import { cwdPath } from '@src/utils/path'
import { PROCEDURES_DIR } from './helper'

vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')
vi.mock('@src/cli/display')

import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr } from '@src/utils/output'
import { printResponse } from '@src/cli/display'

describe('curateCommand', () => {
  const mockKnowledgeService = { hasDraftEntries: vi.fn() }
  const mockAgentService = { start: vi.fn() }
  const mockConfig = { display: {} }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(container.resolve).mockImplementation((token) => {
      if (token === TOKENS.KnowledgeSearchService) return mockKnowledgeService
      if (token === TOKENS.AgentService) return mockAgentService
      if (token === TOKENS.Config) return mockConfig
      throw new Error(`Unexpected token: ${String(token)}`)
    })
    mockAgentService.start.mockResolvedValue({
      sessionId: 'session-1',
      response: { content: 'ok' }
    })
  })

  it('prints message and returns early when no draft entries exist', async () => {
    mockKnowledgeService.hasDraftEntries.mockReturnValue(false)

    await curateCommand()

    expect(vi.mocked(stdout).print).toHaveBeenCalledWith('No draft entries to curate.')
  })

  it('does not call agentService.start when no draft entries exist', async () => {
    mockKnowledgeService.hasDraftEntries.mockReturnValue(false)

    await curateCommand()

    expect(mockAgentService.start).not.toHaveBeenCalled()
  })

  it('calls agentService.start with the curate task when draft entries exist', async () => {
    mockKnowledgeService.hasDraftEntries.mockReturnValue(true)
    const knowledgeDir = cwdPath('knowledge')

    await curateCommand()

    expect(mockAgentService.start).toHaveBeenCalledWith(
      `Promote all entries in ${knowledgeDir}/draft/ into structured ${knowledgeDir}/ files.`,
      expect.objectContaining({ procedure: 'meta-librarian/curate', labels: ['curate'] }),
      expect.objectContaining({ allowedTools: ['Skill', 'Write', 'Read', 'Bash', 'Glob'] })
    )
  })

  it('references a procedure file that exists', async () => {
    mockKnowledgeService.hasDraftEntries.mockReturnValue(true)

    await curateCommand()

    const procedure = mockAgentService.start.mock.calls[0][1].procedure
    expect(existsSync(join(PROCEDURES_DIR, `${procedure}.md`))).toBe(true)
  })

  it('calls printResponse with the agent response', async () => {
    mockKnowledgeService.hasDraftEntries.mockReturnValue(true)

    await curateCommand()

    expect(vi.mocked(printResponse)).toHaveBeenCalled()
  })

  it('prints error and exits when agentService.start throws', async () => {
    mockKnowledgeService.hasDraftEntries.mockReturnValue(true)
    const error = new Error('Agent failed')
    mockAgentService.start.mockRejectedValueOnce(error)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await curateCommand()

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to curate knowledge', error)
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })
})
