import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { curateCommand } from '../curate'
import { cwdPath } from '@src/utils/path'
import { PROCEDURES_DIR } from './helper'

// Mock the dependencies
vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')
vi.mock('../start')

import { container } from '@src/core/di/container'
import { stdout } from '@src/utils/output'
import { startCommand } from '../start'

describe('curateCommand', () => {
  let mockKnowledgeService: {
    hasDraftEntries: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock the knowledge service
    mockKnowledgeService = {
      hasDraftEntries: vi.fn()
    }

    // Mock container.resolve to return the mocked service
    vi.mocked(container).resolve = vi.fn().mockReturnValue(mockKnowledgeService)

    // Mock stdout.print
    vi.mocked(stdout).print = vi.fn()

    // Mock startCommand
    vi.mocked(startCommand).mockResolvedValue(undefined)
  })

  it('should call startCommand when draft entries exist', async () => {
    // Arrange
    mockKnowledgeService.hasDraftEntries.mockReturnValue(true)

    // Act
    await curateCommand()

    // Assert
    const knowledgeDir = cwdPath('knowledge')
    expect(vi.mocked(startCommand)).toHaveBeenCalledWith(
      `Promote all entries in ${knowledgeDir}/draft/ into structured ${knowledgeDir}/ files.`,
      {
        procedure: 'meta-librarian/curate',
        labels: ['curate'],
        allowedTools: ['Skill', 'Write', 'Read', 'Bash', 'Glob'],
        outputOnly: true
      }
    )
  })

  it('should not print message when draft entries exist', async () => {
    // Arrange
    mockKnowledgeService.hasDraftEntries.mockReturnValue(true)

    // Act
    await curateCommand()

    // Assert
    expect(vi.mocked(stdout).print).not.toHaveBeenCalled()
  })

  it('should print message when no draft entries exist', async () => {
    // Arrange
    mockKnowledgeService.hasDraftEntries.mockReturnValue(false)

    // Act
    await curateCommand()

    // Assert
    expect(vi.mocked(stdout).print).toHaveBeenCalledWith('No draft entries to curate.')
  })

  it('should not call startCommand when no draft entries exist', async () => {
    // Arrange
    mockKnowledgeService.hasDraftEntries.mockReturnValue(false)

    // Act
    await curateCommand()

    // Assert
    expect(vi.mocked(startCommand)).not.toHaveBeenCalled()
  })

  it('references a procedure file that exists', async () => {
    mockKnowledgeService.hasDraftEntries.mockReturnValue(true)
    await curateCommand()

    const procedure = vi.mocked(startCommand).mock.calls[0][1].procedure
    expect(existsSync(join(PROCEDURES_DIR, `${procedure}.md`))).toBe(true)
  })

  it('should resolve KnowledgeSearchService from container', async () => {
    // Arrange
    mockKnowledgeService.hasDraftEntries.mockReturnValue(false)

    // Act
    await curateCommand()

    // Assert
    expect(vi.mocked(container).resolve).toHaveBeenCalled()
  })
})
