import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { retrieveCommand } from '../retrieve'
import { PROCEDURES_DIR } from './helper'

vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')
vi.mock('@src/cli/display')

import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stderr } from '@src/utils/output'

describe('retrieveCommand', () => {
  const mockAgentService = { start: vi.fn() }
  const mockConfig = { display: {} }

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
  })

  it('calls agentService.start with single keyword in task', async () => {
    await retrieveCommand(['session'])

    expect(mockAgentService.start).toHaveBeenCalledWith(
      'Search the knowledge base for the following keywords and return a structured summary of findings: session',
      expect.objectContaining({
        procedure: 'meta-knowledge-concierge/retrieve',
        labels: ['retrieve']
      }),
      expect.any(Object)
    )
  })

  it('calls agentService.start with multiple keywords joined by commas', async () => {
    await retrieveCommand(['fork', 'session', 'resume'])

    expect(mockAgentService.start).toHaveBeenCalledWith(
      'Search the knowledge base for the following keywords and return a structured summary of findings: fork, session, resume',
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('calls agentService.start with empty keywords array', async () => {
    await retrieveCommand([])

    expect(mockAgentService.start).toHaveBeenCalledWith(
      'Search the knowledge base for the following keywords and return a structured summary of findings: ',
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('calls agentService.start with keywords containing special characters', async () => {
    await retrieveCommand(['--flag', 'test-case', 'node.js'])

    expect(mockAgentService.start).toHaveBeenCalledWith(
      'Search the knowledge base for the following keywords and return a structured summary of findings: --flag, test-case, node.js',
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('uses procedure meta-knowledge-concierge/retrieve', async () => {
    await retrieveCommand(['test'])

    const createParams = mockAgentService.start.mock.calls[0][1]
    expect(createParams.procedure).toBe('meta-knowledge-concierge/retrieve')
  })

  it('references a procedure file that exists', async () => {
    await retrieveCommand(['test'])

    const procedure = mockAgentService.start.mock.calls[0][1].procedure
    expect(existsSync(join(PROCEDURES_DIR, `${procedure}.md`))).toBe(true)
  })

  it('uses labels array with retrieve label', async () => {
    await retrieveCommand(['test'])

    const createParams = mockAgentService.start.mock.calls[0][1]
    expect(createParams.labels).toEqual(['retrieve'])
  })

  it('prints error and exits when agentService.start throws', async () => {
    const error = new Error('Agent failed')
    mockAgentService.start.mockRejectedValueOnce(error)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await retrieveCommand(['test'])

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to retrieve knowledge', error)
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })
})
