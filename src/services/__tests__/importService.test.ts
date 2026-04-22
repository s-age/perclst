import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ISessionDomain, IImportDomain } from '@src/domains/ports/session'
import { ImportService, type ImportOptions } from '../importService'

// Mock dependencies
vi.mock('@src/utils/uuid', () => ({
  generateId: vi.fn()
}))

vi.mock('@src/utils/date', () => ({
  toISO: vi.fn()
}))

vi.mock('@src/utils/output', () => ({
  debug: { print: vi.fn() },
  stdout: { print: vi.fn() },
  stderr: { print: vi.fn() }
}))

import { generateId } from '@src/utils/uuid'
import { toISO } from '@src/utils/date'
import { debug } from '@src/utils/output'

describe('ImportService', () => {
  let importService: ImportService
  let mockSessionDomain: ISessionDomain
  let mockImportDomain: IImportDomain

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock domain implementations
    mockSessionDomain = {
      save: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      list: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn()
    } as unknown as ISessionDomain

    mockImportDomain = {
      resolveWorkingDir: vi.fn().mockReturnValue('/default/working/dir'),
      validateSession: vi.fn()
    } as unknown as IImportDomain

    importService = new ImportService(mockSessionDomain, mockImportDomain)

    // Mock utility functions with predictable values
    vi.mocked(generateId).mockReturnValue('test-session-id-123')
    vi.mocked(toISO).mockReturnValue('2024-01-15T10:30:00Z')
  })

  describe('import', () => {
    it('should import session with resolved working directory when cwd not provided', async () => {
      const claudeSessionId = 'claude-session-abc'
      const options: ImportOptions = {}

      const result = await importService.import(claudeSessionId, options)

      expect(mockImportDomain.resolveWorkingDir).toHaveBeenCalledWith(claudeSessionId)
      expect(mockImportDomain.validateSession).not.toHaveBeenCalled()
      expect(result.id).toBe('test-session-id-123')
      expect(result.claude_session_id).toBe(claudeSessionId)
      expect(result.working_dir).toBe('/default/working/dir')
      expect(result.created_at).toBe('2024-01-15T10:30:00Z')
      expect(result.updated_at).toBe('2024-01-15T10:30:00Z')
      expect(result.metadata.status).toBe('completed')
      expect(result.metadata.labels).toEqual([])
    })

    it('should validate session and use provided cwd', async () => {
      const claudeSessionId = 'claude-session-xyz'
      const customCwd = '/custom/path'
      const options: ImportOptions = { cwd: customCwd }

      const result = await importService.import(claudeSessionId, options)

      expect(mockImportDomain.resolveWorkingDir).not.toHaveBeenCalled()
      expect(mockImportDomain.validateSession).toHaveBeenCalledWith(claudeSessionId, customCwd)
      expect(result.working_dir).toBe(customCwd)
    })

    it('should include name in session when provided', async () => {
      const claudeSessionId = 'claude-session-def'
      const sessionName = 'My Important Session'
      const options: ImportOptions = { name: sessionName }

      const result = await importService.import(claudeSessionId, options)

      expect(result.name).toBe(sessionName)
    })

    it('should not include name property when not provided', async () => {
      const claudeSessionId = 'claude-session-ghi'
      const options: ImportOptions = {}

      const result = await importService.import(claudeSessionId, options)

      expect(result).not.toHaveProperty('name')
    })

    it('should save session via domain', async () => {
      const claudeSessionId = 'claude-session-jkl'

      await importService.import(claudeSessionId)

      expect(mockSessionDomain.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-session-id-123',
          claude_session_id: claudeSessionId,
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          metadata: {
            labels: [],
            status: 'completed'
          }
        })
      )
    })

    it('should log session import with session and claude session ids', async () => {
      const claudeSessionId = 'claude-session-mno'

      await importService.import(claudeSessionId)

      expect(debug.print).toHaveBeenCalledWith(
        'Session imported',
        expect.objectContaining({
          session_id: 'test-session-id-123',
          claude_session_id: claudeSessionId
        })
      )
    })

    it('should handle both name and cwd options together', async () => {
      const claudeSessionId = 'claude-session-pqr'
      const customCwd = '/custom/working/dir'
      const sessionName = 'Custom Session'
      const options: ImportOptions = { cwd: customCwd, name: sessionName }

      const result = await importService.import(claudeSessionId, options)

      expect(mockImportDomain.validateSession).toHaveBeenCalledWith(claudeSessionId, customCwd)
      expect(result.working_dir).toBe(customCwd)
      expect(result.name).toBe(sessionName)
      expect(result.id).toBe('test-session-id-123')
      expect(result.claude_session_id).toBe(claudeSessionId)
    })

    it('should return created session object with all required fields', async () => {
      const claudeSessionId = 'claude-session-stu'
      const options: ImportOptions = { name: 'Test Session' }

      const result = await importService.import(claudeSessionId, options)

      expect(result).toMatchObject({
        id: expect.any(String),
        name: 'Test Session',
        created_at: expect.any(String),
        updated_at: expect.any(String),
        claude_session_id: claudeSessionId,
        working_dir: expect.any(String),
        metadata: {
          labels: expect.any(Array),
          status: expect.any(String)
        }
      })
    })

    it('should use same timestamp for both created_at and updated_at', async () => {
      const claudeSessionId = 'claude-session-vwx'

      const result = await importService.import(claudeSessionId)

      expect(result.created_at).toBe(result.updated_at)
      expect(result.created_at).toBe('2024-01-15T10:30:00Z')
    })

    it('should generate unique session id via generateId utility', async () => {
      const claudeSessionId = 'claude-session-yz1'

      await importService.import(claudeSessionId)

      expect(generateId).toHaveBeenCalled()
    })

    it('should handle empty string name option', async () => {
      const claudeSessionId = 'claude-session-yz2'
      const options: ImportOptions = { name: '' }

      const result = await importService.import(claudeSessionId, options)

      // Empty string is defined, so name property should be included
      expect(result.name).toBe('')
    })

    it('should call toISO exactly once to get current timestamp', async () => {
      const claudeSessionId = 'claude-session-yz3'

      await importService.import(claudeSessionId)

      expect(toISO).toHaveBeenCalledTimes(1)
      expect(toISO).toHaveBeenCalledWith()
    })

    it('should set metadata labels to empty array', async () => {
      const claudeSessionId = 'claude-session-yz4'

      const result = await importService.import(claudeSessionId)

      expect(result.metadata.labels).toEqual([])
    })

    it('should set metadata status to completed', async () => {
      const claudeSessionId = 'claude-session-yz5'

      const result = await importService.import(claudeSessionId)

      expect(result.metadata.status).toBe('completed')
    })

    it('should propagate error when validateSession throws', async () => {
      const claudeSessionId = 'claude-session-error'
      const customCwd = '/custom/path'
      const error = new Error('Validation failed')

      vi.mocked(mockImportDomain.validateSession).mockImplementationOnce(() => {
        throw error
      })

      await expect(importService.import(claudeSessionId, { cwd: customCwd })).rejects.toThrow(
        'Validation failed'
      )
    })

    it('should propagate error when save throws', async () => {
      const claudeSessionId = 'claude-session-error2'
      const error = new Error('Save failed')

      vi.mocked(mockSessionDomain.save).mockRejectedValueOnce(error)

      await expect(importService.import(claudeSessionId)).rejects.toThrow('Save failed')
    })

    it('should validate session before saving', async () => {
      const claudeSessionId = 'claude-session-order'
      const customCwd = '/custom/path'
      const callOrder: string[] = []

      vi.mocked(mockImportDomain.validateSession).mockImplementationOnce(() => {
        callOrder.push('validate')
      })
      vi.mocked(mockSessionDomain.save).mockImplementationOnce(async () => {
        callOrder.push('save')
      })

      await importService.import(claudeSessionId, { cwd: customCwd })

      expect(callOrder).toEqual(['validate', 'save'])
    })
  })
})
