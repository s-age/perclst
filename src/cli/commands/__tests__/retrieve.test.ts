import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { retrieveCommand } from '../retrieve'
import { PROCEDURES_DIR } from './helper'

vi.mock('../start', () => ({
  startCommand: vi.fn()
}))

import { startCommand } from '../start'

describe('retrieveCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls startCommand with single keyword', async () => {
    await retrieveCommand(['session'])

    expect(startCommand).toHaveBeenCalledWith(
      'Search the knowledge base for the following keywords and return a structured summary of findings: session',
      {
        procedure: 'meta-knowledge-concierge/retrieve',
        labels: ['retrieve'],
        outputOnly: true
      }
    )
    expect(startCommand).toHaveBeenCalledTimes(1)
  })

  it('calls startCommand with multiple keywords joined by commas', async () => {
    await retrieveCommand(['fork', 'session', 'resume'])

    expect(startCommand).toHaveBeenCalledWith(
      'Search the knowledge base for the following keywords and return a structured summary of findings: fork, session, resume',
      {
        procedure: 'meta-knowledge-concierge/retrieve',
        labels: ['retrieve'],
        outputOnly: true
      }
    )
  })

  it('calls startCommand with empty keywords array', async () => {
    await retrieveCommand([])

    expect(startCommand).toHaveBeenCalledWith(
      'Search the knowledge base for the following keywords and return a structured summary of findings: ',
      {
        procedure: 'meta-knowledge-concierge/retrieve',
        labels: ['retrieve'],
        outputOnly: true
      }
    )
  })

  it('calls startCommand with keywords containing special characters', async () => {
    await retrieveCommand(['--flag', 'test-case', 'node.js'])

    expect(startCommand).toHaveBeenCalledWith(
      'Search the knowledge base for the following keywords and return a structured summary of findings: --flag, test-case, node.js',
      {
        procedure: 'meta-knowledge-concierge/retrieve',
        labels: ['retrieve'],
        outputOnly: true
      }
    )
  })

  it('passes outputOnly as true in options', async () => {
    await retrieveCommand(['test'])

    const callArgs = vi.mocked(startCommand).mock.calls[0]
    expect(callArgs[1].outputOnly).toBe(true)
  })

  it('passes procedure as meta-knowledge-concierge/retrieve', async () => {
    await retrieveCommand(['test'])

    const callArgs = vi.mocked(startCommand).mock.calls[0]
    expect(callArgs[1].procedure).toBe('meta-knowledge-concierge/retrieve')
  })

  it('references a procedure file that exists', async () => {
    await retrieveCommand(['test'])

    const procedure = vi.mocked(startCommand).mock.calls[0][1].procedure
    expect(existsSync(join(PROCEDURES_DIR, `${procedure}.md`))).toBe(true)
  })

  it('passes labels array with retrieve label', async () => {
    await retrieveCommand(['test'])

    const callArgs = vi.mocked(startCommand).mock.calls[0]
    expect(callArgs[1].labels).toEqual(['retrieve'])
  })

  it('propagates errors from startCommand', async () => {
    const error = new Error('startCommand failed')
    vi.mocked(startCommand).mockRejectedValueOnce(error)

    await expect(retrieveCommand(['test'])).rejects.toThrow('startCommand failed')
  })
})
