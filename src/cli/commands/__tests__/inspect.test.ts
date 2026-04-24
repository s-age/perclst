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
import { startCommand } from '../start'

// Mock all dependencies
vi.mock('@src/validators/cli/inspectSession')
vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')
vi.mock('../start')

// Mock process.exit to prevent actual exit
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called')
})

describe('inspectCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    processExitSpy.mockClear()
  })

  it('should call parseInspectSession with oldRef and newRef', async () => {
    // Arrange
    const oldRef = 'abc123'
    const newRef = 'def456'
    const parsedInput = { old: oldRef, new: newRef }

    vi.mocked(parseInspectSession).mockReturnValue(parsedInput)
    const mockGetDiff = vi.fn().mockReturnValue(null)
    vi.mocked(container).resolve.mockReturnValue({ getDiff: mockGetDiff })

    // Act
    await inspectCommand(oldRef, newRef)

    // Assert
    expect(vi.mocked(parseInspectSession)).toHaveBeenCalledWith({ old: oldRef, new: newRef })
  })

  it('should call startCommand with formatted diff when differences exist', async () => {
    // Arrange
    const oldRef = 'abc123'
    const newRef = 'def456'
    const parsedInput = { old: oldRef, new: newRef }
    const testDiff = 'diff --git a/file.ts b/file.ts\n+added line'

    vi.mocked(parseInspectSession).mockReturnValue(parsedInput)
    const mockGetDiff = vi.fn().mockReturnValue(testDiff)
    vi.mocked(container).resolve.mockReturnValue({ getDiff: mockGetDiff })
    vi.mocked(startCommand).mockResolvedValue(undefined)

    // Act
    await inspectCommand(oldRef, newRef)

    // Assert
    expect(vi.mocked(startCommand)).toHaveBeenCalledWith(
      `Inspect the following git diff and produce a code inspection report:\n\n${testDiff}`,
      {
        procedure: 'code-inspect/inspect',
        labels: ['inspect'],
        model: 'sonnet',
        allowedTools: ['Skill', 'mcp__perclst__knowledge_search'],
        outputOnly: true
      }
    )
  })

  it('references a procedure file that exists', async () => {
    const parsedInput = { old: 'a', new: 'b' }
    vi.mocked(parseInspectSession).mockReturnValue(parsedInput)
    vi.mocked(container).resolve.mockReturnValue({ getDiff: vi.fn().mockReturnValue('diff') })
    vi.mocked(startCommand).mockResolvedValue(undefined)

    await inspectCommand('a', 'b')

    const procedure = vi.mocked(startCommand).mock.calls[0][1].procedure
    expect(existsSync(join(PROCEDURES_DIR, `${procedure}.md`))).toBe(true)
  })

  it('should print message to stdout when no diff is found', async () => {
    // Arrange
    const oldRef = 'abc123'
    const newRef = 'abc123'
    const parsedInput = { old: oldRef, new: newRef }

    vi.mocked(parseInspectSession).mockReturnValue(parsedInput)
    const mockGetDiff = vi.fn().mockReturnValue(null)
    vi.mocked(container).resolve.mockReturnValue({ getDiff: mockGetDiff })

    // Act
    await inspectCommand(oldRef, newRef)

    // Assert
    expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
      'No differences found between the specified refs.'
    )
  })

  it('should not call startCommand when getDiff returns null', async () => {
    // Arrange
    const oldRef = 'abc123'
    const newRef = 'def456'
    const parsedInput = { old: oldRef, new: newRef }

    vi.mocked(parseInspectSession).mockReturnValue(parsedInput)
    const mockGetDiff = vi.fn().mockReturnValue(null)
    vi.mocked(container).resolve.mockReturnValue({ getDiff: mockGetDiff })

    // Act
    await inspectCommand(oldRef, newRef)

    // Assert
    expect(vi.mocked(startCommand)).not.toHaveBeenCalled()
  })

  it('should print validation error and exit when parseInspectSession throws ValidationError', async () => {
    // Arrange
    const oldRef = 'invalid'
    const newRef = 'invalid'
    const validationError = new ValidationError('Invalid ref format')

    vi.mocked(parseInspectSession).mockImplementation(() => {
      throw validationError
    })

    // Act & Assert
    await expect(inspectCommand(oldRef, newRef)).rejects.toThrow('process.exit called')

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: Invalid ref format')
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should print generic error message and exit when getDiff throws non-ValidationError', async () => {
    // Arrange
    const oldRef = 'abc123'
    const newRef = 'def456'
    const parsedInput = { old: oldRef, new: newRef }
    const genericError = new Error('Service unavailable')

    vi.mocked(parseInspectSession).mockReturnValue(parsedInput)
    const mockGetDiff = vi.fn().mockImplementation(() => {
      throw genericError
    })
    vi.mocked(container).resolve.mockReturnValue({ getDiff: mockGetDiff })

    // Act & Assert
    await expect(inspectCommand(oldRef, newRef)).rejects.toThrow('process.exit called')

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to run inspect', genericError)
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should handle error thrown by startCommand and print to stderr', async () => {
    // Arrange
    const oldRef = 'abc123'
    const newRef = 'def456'
    const parsedInput = { old: oldRef, new: newRef }
    const testDiff = 'diff content'
    const startError = new Error('Agent failed to start')

    vi.mocked(parseInspectSession).mockReturnValue(parsedInput)
    const mockGetDiff = vi.fn().mockReturnValue(testDiff)
    vi.mocked(container).resolve.mockReturnValue({ getDiff: mockGetDiff })
    vi.mocked(startCommand).mockRejectedValue(startError)

    // Act & Assert
    await expect(inspectCommand(oldRef, newRef)).rejects.toThrow('process.exit called')

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to run inspect', startError)
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should resolve PipelineFileService from container using TOKENS.PipelineFileService', async () => {
    // Arrange
    const oldRef = 'abc123'
    const newRef = 'def456'
    const parsedInput = { old: oldRef, new: newRef }

    vi.mocked(parseInspectSession).mockReturnValue(parsedInput)
    const mockGetDiff = vi.fn().mockReturnValue(null)
    vi.mocked(container).resolve.mockReturnValue({ getDiff: mockGetDiff })

    // Act
    await inspectCommand(oldRef, newRef)

    // Assert
    expect(vi.mocked(container).resolve).toHaveBeenCalledWith(TOKENS.PipelineFileService)
  })

  it('should call getDiff with old and new refs from parsed input', async () => {
    // Arrange
    const oldRef = 'abc123'
    const newRef = 'def456'
    const parsedInput = { old: oldRef, new: newRef }

    vi.mocked(parseInspectSession).mockReturnValue(parsedInput)
    const mockGetDiff = vi.fn().mockReturnValue(null)
    vi.mocked(container).resolve.mockReturnValue({ getDiff: mockGetDiff })

    // Act
    await inspectCommand(oldRef, newRef)

    // Assert
    expect(mockGetDiff).toHaveBeenCalledWith(oldRef, newRef)
  })
})
