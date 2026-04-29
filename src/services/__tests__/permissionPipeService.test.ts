import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { IPermissionPipeDomain } from '@src/domains/ports/permissionPipe'
import type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe'
import { PermissionPipeService } from '../permissionPipeService.js'

describe('PermissionPipeService', () => {
  let mockDomain: IPermissionPipeDomain
  let service: PermissionPipeService

  beforeEach(() => {
    mockDomain = {
      initPipePath: vi.fn(),
      pollRequest: vi.fn(),
      respond: vi.fn(),
      askPermission: vi.fn()
    }
    service = new PermissionPipeService(mockDomain)
  })

  describe('pollRequest', () => {
    it('returns null when domain.pollRequest returns null', () => {
      vi.mocked(mockDomain.pollRequest).mockReturnValue(null)

      const result = service.pollRequest()

      expect(result).toBeNull()
      expect(mockDomain.pollRequest).toHaveBeenCalledOnce()
    })

    it('returns a PermissionRequest when domain.pollRequest returns one', () => {
      const mockRequest: PermissionRequest = {
        tool_name: 'WebFetch',
        input: { url: 'https://example.com' }
      }
      vi.mocked(mockDomain.pollRequest).mockReturnValue(mockRequest)

      const result = service.pollRequest()

      expect(result).toEqual(mockRequest)
      expect(mockDomain.pollRequest).toHaveBeenCalledOnce()
    })

    it('calls domain.pollRequest with no arguments', () => {
      vi.mocked(mockDomain.pollRequest).mockReturnValue(null)

      service.pollRequest()

      expect(mockDomain.pollRequest).toHaveBeenCalledWith()
    })
  })

  describe('respond', () => {
    it('calls domain.respond with the provided PermissionResult', () => {
      const mockResult: PermissionResult = {
        behavior: 'allow',
        updatedInput: {}
      }

      service.respond(mockResult)

      expect(mockDomain.respond).toHaveBeenCalledWith(mockResult)
      expect(mockDomain.respond).toHaveBeenCalledOnce()
    })

    it('calls domain.respond with denied permission result', () => {
      const mockResult: PermissionResult = {
        behavior: 'deny',
        message: 'Permission denied'
      }

      service.respond(mockResult)

      expect(mockDomain.respond).toHaveBeenCalledWith(mockResult)
    })

    it('returns void', () => {
      const mockResult: PermissionResult = {
        behavior: 'allow',
        updatedInput: {}
      }

      const result = service.respond(mockResult)

      expect(result).toBeUndefined()
    })
  })

  describe('askPermission', () => {
    it('returns the promise from domain.askPermission', async () => {
      const mockResult: PermissionResult = {
        behavior: 'allow',
        updatedInput: {}
      }
      vi.mocked(mockDomain.askPermission).mockResolvedValue(mockResult)

      const args = {
        tool_name: 'Bash',
        input: { command: 'ls -la' },
        tool_use_id: 'tool-abc'
      }

      const result = await service.askPermission(args)

      expect(result).toEqual(mockResult)
    })

    it('calls domain.askPermission with the provided arguments', async () => {
      vi.mocked(mockDomain.askPermission).mockResolvedValue({
        behavior: 'deny',
        message: 'Not allowed'
      })

      const args = {
        tool_name: 'Read',
        input: { file_path: '/etc/passwd' },
        tool_use_id: 'tool-def'
      }

      await service.askPermission(args)

      expect(mockDomain.askPermission).toHaveBeenCalledWith(args)
      expect(mockDomain.askPermission).toHaveBeenCalledOnce()
    })

    it('handles arguments without tool_use_id', async () => {
      const mockResult: PermissionResult = {
        behavior: 'allow',
        updatedInput: {}
      }
      vi.mocked(mockDomain.askPermission).mockResolvedValue(mockResult)

      const args = {
        tool_name: 'WebFetch',
        input: { url: 'https://example.com' }
      }

      const result = await service.askPermission(args)

      expect(result).toEqual(mockResult)
      expect(mockDomain.askPermission).toHaveBeenCalledWith(args)
    })

    it('propagates rejection from domain.askPermission', async () => {
      const testError = new Error('Permission denied by user')
      vi.mocked(mockDomain.askPermission).mockRejectedValue(testError)

      const args = {
        tool_name: 'Bash',
        input: { command: 'rm -rf /' }
      }

      await expect(service.askPermission(args)).rejects.toThrow(testError)
    })

    it('allows complex input objects', async () => {
      const mockResult: PermissionResult = {
        behavior: 'allow',
        updatedInput: {}
      }
      vi.mocked(mockDomain.askPermission).mockResolvedValue(mockResult)

      const complexInput: Record<string, unknown> = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        boolean: true,
        null: null
      }

      const args = {
        tool_name: 'CustomTool',
        input: complexInput
      }

      const result = await service.askPermission(args)

      expect(result).toEqual(mockResult)
      expect(mockDomain.askPermission).toHaveBeenCalledWith(args)
    })
  })
})
