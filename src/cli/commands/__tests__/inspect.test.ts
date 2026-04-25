import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { inspectCommand } from '../inspect'
import { PROCEDURES_DIR } from './helper'
import { parseInspectSession } from '@src/validators/cli/inspectSession'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr } from '@src/utils/output'
import { ValidationError } from '@src/errors/validationError'
import { printResponse } from '@src/cli/display'

vi.mock('@src/validators/cli/inspectSession')
vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')
vi.mock('@src/cli/display')

const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called')
})

describe('inspectCommand', () => {
  const mockGetDiff = vi.fn()
  const mockAgentService = { start: vi.fn() }
  const mockConfig = { display: {} }

  beforeEach(() => {
    vi.clearAllMocks()
    processExitSpy.mockClear()
    vi.mocked(container.resolve).mockImplementation((token) => {
      if (token === TOKENS.PipelineFileService) return { getDiff: mockGetDiff }
      if (token === TOKENS.AgentService) return mockAgentService
      if (token === TOKENS.Config) return mockConfig
      throw new Error(`Unexpected token: ${String(token)}`)
    })
    mockAgentService.start.mockResolvedValue({
      sessionId: 'session-1',
      response: { content: 'ok' }
    })
  })

  it('should call parseInspectSession with oldRef and newRef', async () => {
    const oldRef = 'abc123'
    const newRef = 'def456'
    vi.mocked(parseInspectSession).mockReturnValue({ old: oldRef, new: newRef })
    mockGetDiff.mockReturnValue(null)

    await inspectCommand(oldRef, newRef)

    expect(vi.mocked(parseInspectSession)).toHaveBeenCalledWith({ old: oldRef, new: newRef })
  })

  it('should call agentService.start with formatted diff when differences exist', async () => {
    const oldRef = 'abc123'
    const newRef = 'def456'
    const testDiff = 'diff --git a/file.ts b/file.ts\n+added line'
    vi.mocked(parseInspectSession).mockReturnValue({ old: oldRef, new: newRef })
    mockGetDiff.mockReturnValue(testDiff)

    await inspectCommand(oldRef, newRef)

    expect(mockAgentService.start).toHaveBeenCalledWith(
      `Inspect the following git diff and produce a code inspection report:\n\n${testDiff}`,
      expect.objectContaining({ procedure: 'code-inspect/inspect', labels: ['inspect'] }),
      expect.objectContaining({ allowedTools: ['Skill', 'mcp__perclst__knowledge_search'] })
    )
  })

  it('references a procedure file that exists', async () => {
    vi.mocked(parseInspectSession).mockReturnValue({ old: 'a', new: 'b' })
    mockGetDiff.mockReturnValue('diff content')

    await inspectCommand('a', 'b')

    const procedure = mockAgentService.start.mock.calls[0][1].procedure
    expect(existsSync(join(PROCEDURES_DIR, `${procedure}.md`))).toBe(true)
  })

  it('should print message to stdout when no diff is found', async () => {
    vi.mocked(parseInspectSession).mockReturnValue({ old: 'abc123', new: 'abc123' })
    mockGetDiff.mockReturnValue(null)

    await inspectCommand('abc123', 'abc123')

    expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
      'No differences found between the specified refs.'
    )
  })

  it('should not call agentService.start when getDiff returns null', async () => {
    vi.mocked(parseInspectSession).mockReturnValue({ old: 'abc123', new: 'def456' })
    mockGetDiff.mockReturnValue(null)

    await inspectCommand('abc123', 'def456')

    expect(mockAgentService.start).not.toHaveBeenCalled()
  })

  it('should print validation error and exit when parseInspectSession throws ValidationError', async () => {
    const validationError = new ValidationError('Invalid ref format')
    vi.mocked(parseInspectSession).mockImplementation(() => {
      throw validationError
    })

    await expect(inspectCommand('invalid', 'invalid')).rejects.toThrow('process.exit called')

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: Invalid ref format')
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should print generic error message and exit when getDiff throws non-ValidationError', async () => {
    const genericError = new Error('Service unavailable')
    vi.mocked(parseInspectSession).mockReturnValue({ old: 'abc123', new: 'def456' })
    mockGetDiff.mockImplementation(() => {
      throw genericError
    })

    await expect(inspectCommand('abc123', 'def456')).rejects.toThrow('process.exit called')

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to run inspect', genericError)
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should handle error from agentService.start and print to stderr', async () => {
    const testDiff = 'diff content'
    const agentError = new Error('Agent failed to start')
    vi.mocked(parseInspectSession).mockReturnValue({ old: 'abc123', new: 'def456' })
    mockGetDiff.mockReturnValue(testDiff)
    mockAgentService.start.mockRejectedValue(agentError)

    await expect(inspectCommand('abc123', 'def456')).rejects.toThrow('process.exit called')

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to run inspect', agentError)
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should resolve PipelineFileService from container using TOKENS.PipelineFileService', async () => {
    vi.mocked(parseInspectSession).mockReturnValue({ old: 'abc123', new: 'def456' })
    mockGetDiff.mockReturnValue(null)

    await inspectCommand('abc123', 'def456')

    expect(vi.mocked(container.resolve)).toHaveBeenCalledWith(TOKENS.PipelineFileService)
  })

  it('should call getDiff with old and new refs from parsed input', async () => {
    const oldRef = 'abc123'
    const newRef = 'def456'
    vi.mocked(parseInspectSession).mockReturnValue({ old: oldRef, new: newRef })
    mockGetDiff.mockReturnValue(null)

    await inspectCommand(oldRef, newRef)

    expect(mockGetDiff).toHaveBeenCalledWith(oldRef, newRef)
  })

  it('should call printResponse when a diff is found', async () => {
    vi.mocked(parseInspectSession).mockReturnValue({ old: 'abc123', new: 'def456' })
    mockGetDiff.mockReturnValue('some diff')

    await inspectCommand('abc123', 'def456')

    expect(vi.mocked(printResponse)).toHaveBeenCalled()
  })
})
