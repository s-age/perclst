import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { IPermissionPipeRepository } from '@src/repositories/ports/permissionPipe.js'
import type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe.js'
import { PermissionPipeDomain } from '../permissionPipe.js'

describe('PermissionPipeDomain', () => {
  let mockRepo: IPermissionPipeRepository
  let domain: PermissionPipeDomain

  beforeEach(() => {
    mockRepo = {
      pollRequest: vi.fn(),
      respond: vi.fn(),
      askPermission: vi.fn()
    }
    domain = new PermissionPipeDomain(mockRepo)
  })

  describe('pollRequest', () => {
    it('should return a PermissionRequest from repo when available', () => {
      const request: PermissionRequest = {
        tool_name: 'TestTool',
        input: { key: 'value' }
      }
      vi.mocked(mockRepo.pollRequest).mockReturnValue(request)

      const result = domain.pollRequest()

      expect(result).toEqual(request)
      expect(mockRepo.pollRequest).toHaveBeenCalledOnce()
      expect(mockRepo.pollRequest).toHaveBeenCalledWith()
    })

    it('should return null when no request is pending', () => {
      vi.mocked(mockRepo.pollRequest).mockReturnValue(null)

      const result = domain.pollRequest()

      expect(result).toBeNull()
      expect(mockRepo.pollRequest).toHaveBeenCalledOnce()
    })

    it('should return PermissionRequest with complex input object', () => {
      const request: PermissionRequest = {
        tool_name: 'ComplexTool',
        input: {
          nested: { obj: true },
          arr: [1, 2, 3],
          str: 'test'
        }
      }
      vi.mocked(mockRepo.pollRequest).mockReturnValue(request)

      const result = domain.pollRequest()

      expect(result).toEqual(request)
    })
  })

  describe('respond', () => {
    it('should call repo.respond with allow result', () => {
      const result: PermissionResult = {
        behavior: 'allow',
        updatedInput: { modified: true }
      }

      domain.respond(result)

      expect(mockRepo.respond).toHaveBeenCalledOnce()
      expect(mockRepo.respond).toHaveBeenCalledWith(result)
    })

    it('should call repo.respond with deny result', () => {
      const result: PermissionResult = {
        behavior: 'deny',
        message: 'Permission denied for security reasons'
      }

      domain.respond(result)

      expect(mockRepo.respond).toHaveBeenCalledOnce()
      expect(mockRepo.respond).toHaveBeenCalledWith(result)
    })

    it('should call repo.respond with empty updatedInput on allow', () => {
      const result: PermissionResult = {
        behavior: 'allow',
        updatedInput: {}
      }

      domain.respond(result)

      expect(mockRepo.respond).toHaveBeenCalledWith(result)
    })
  })

  describe('askPermission', () => {
    it('should return allow result from repo', async () => {
      const args = {
        tool_name: 'WebFetch',
        input: { url: 'https://example.com' },
        tool_use_id: 'use-123'
      }
      const expectedResult: PermissionResult = {
        behavior: 'allow',
        updatedInput: { url: 'https://example.com' }
      }
      vi.mocked(mockRepo.askPermission).mockResolvedValue(expectedResult)

      const result = await domain.askPermission(args)

      expect(result).toEqual(expectedResult)
      expect(mockRepo.askPermission).toHaveBeenCalledOnce()
      expect(mockRepo.askPermission).toHaveBeenCalledWith(args)
    })

    it('should return deny result from repo', async () => {
      const args = {
        tool_name: 'Bash',
        input: { command: 'rm -rf /' }
      }
      const expectedResult: PermissionResult = {
        behavior: 'deny',
        message: 'Dangerous command blocked'
      }
      vi.mocked(mockRepo.askPermission).mockResolvedValue(expectedResult)

      const result = await domain.askPermission(args)

      expect(result).toEqual(expectedResult)
      expect(mockRepo.askPermission).toHaveBeenCalledWith(args)
    })

    it('should pass through args without tool_use_id', async () => {
      const args = {
        tool_name: 'Read',
        input: { file_path: '/etc/passwd' }
      }
      const expectedResult: PermissionResult = {
        behavior: 'allow',
        updatedInput: { file_path: '/etc/passwd' }
      }
      vi.mocked(mockRepo.askPermission).mockResolvedValue(expectedResult)

      const result = await domain.askPermission(args)

      expect(result).toEqual(expectedResult)
      expect(mockRepo.askPermission).toHaveBeenCalledWith(args)
    })

    it('should preserve complex input in args', async () => {
      const args = {
        tool_name: 'ComplexTool',
        input: {
          nested: { deep: { value: 42 } },
          arr: [1, 2, 3]
        },
        tool_use_id: 'use-456'
      }
      const expectedResult: PermissionResult = {
        behavior: 'allow',
        updatedInput: args.input
      }
      vi.mocked(mockRepo.askPermission).mockResolvedValue(expectedResult)

      const result = await domain.askPermission(args)

      expect(result).toEqual(expectedResult)
      expect(mockRepo.askPermission).toHaveBeenCalledWith(args)
    })

    it('should handle rejection from repo', async () => {
      const args = {
        tool_name: 'FailTool',
        input: {}
      }
      const error = new Error('Repository error')
      vi.mocked(mockRepo.askPermission).mockRejectedValue(error)

      await expect(domain.askPermission(args)).rejects.toThrow(error)
      expect(mockRepo.askPermission).toHaveBeenCalledWith(args)
    })
  })
})
