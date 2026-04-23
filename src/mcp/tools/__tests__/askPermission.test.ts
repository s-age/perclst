import { vi, describe, it, expect, beforeEach } from 'vitest'
import { executeAskPermission } from '../askPermission'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { PermissionPipeService } from '@src/services/permissionPipeService'

vi.mock('@src/core/di/container')
vi.mock('@src/core/di/identifiers')

describe('executeAskPermission', () => {
  let mockService: { askPermission: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockService = {
      askPermission: vi.fn()
    }
    vi.mocked(container.resolve).mockReturnValue(mockService as unknown as PermissionPipeService)
  })

  it('should resolve PermissionPipeService from container', async () => {
    const args = { tool_name: 'TestTool', input: {} }
    mockService.askPermission.mockResolvedValue({ status: 'granted' })

    await executeAskPermission(args)

    expect(container.resolve).toHaveBeenCalledWith(TOKENS.PermissionPipeService)
  })

  it('should call askPermission with the provided arguments', async () => {
    const args = {
      tool_name: 'TestTool',
      input: { key: 'value' },
      tool_use_id: 'test-id-123'
    }
    mockService.askPermission.mockResolvedValue({ status: 'granted' })

    await executeAskPermission(args)

    expect(mockService.askPermission).toHaveBeenCalledWith(args)
  })

  it('should return MCP response with stringified result', async () => {
    const serviceResult = { status: 'granted', message: 'Permission allowed' }
    mockService.askPermission.mockResolvedValue(serviceResult)
    const args = { tool_name: 'TestTool', input: {} }

    const result = await executeAskPermission(args)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(serviceResult)
        }
      ]
    })
  })

  it('should handle simple object results from service', async () => {
    const serviceResult = { allowed: true }
    mockService.askPermission.mockResolvedValue(serviceResult)
    const args = { tool_name: 'WebFetch', input: {} }

    const result = await executeAskPermission(args)

    expect(result.content[0].text).toBe(JSON.stringify(serviceResult))
  })

  it('should handle array results from service', async () => {
    const serviceResult = [{ id: 1 }, { id: 2 }]
    mockService.askPermission.mockResolvedValue(serviceResult)
    const args = { tool_name: 'Bash', input: {} }

    const result = await executeAskPermission(args)

    expect(result.content[0].text).toBe(JSON.stringify(serviceResult))
  })

  it('should handle string results from service', async () => {
    const serviceResult = 'permission denied'
    mockService.askPermission.mockResolvedValue(serviceResult)
    const args = { tool_name: 'TestTool', input: {} }

    const result = await executeAskPermission(args)

    expect(result.content[0].text).toBe(JSON.stringify(serviceResult))
  })

  it('should handle null results from service', async () => {
    mockService.askPermission.mockResolvedValue(null)
    const args = { tool_name: 'TestTool', input: {} }

    const result = await executeAskPermission(args)

    expect(result.content[0].text).toBe(JSON.stringify(null))
  })

  it('should work with optional tool_use_id omitted', async () => {
    const serviceResult = { status: 'ok' }
    mockService.askPermission.mockResolvedValue(serviceResult)
    const args = { tool_name: 'Bash', input: { command: 'ls' } }

    const result = await executeAskPermission(args)

    expect(mockService.askPermission).toHaveBeenCalledWith(args)
    expect(result.content[0].text).toBe(JSON.stringify(serviceResult))
  })

  it('should propagate errors from service', async () => {
    const error = new Error('Service failed')
    mockService.askPermission.mockRejectedValue(error)
    const args = { tool_name: 'TestTool', input: {} }

    await expect(executeAskPermission(args)).rejects.toThrow('Service failed')
  })

  it('should handle complex nested result objects', async () => {
    const serviceResult = {
      metadata: { version: 1, timestamp: '2024-01-01' },
      permissions: [{ resource: 'file', action: 'read', granted: true }],
      nested: { deep: { value: 42 } }
    }
    mockService.askPermission.mockResolvedValue(serviceResult)
    const args = { tool_name: 'TestTool', input: { some: 'input' } }

    const result = await executeAskPermission(args)

    expect(result.content[0].text).toBe(JSON.stringify(serviceResult))
    // Verify it's valid JSON
    expect(() => JSON.parse(result.content[0].text)).not.toThrow()
  })

  it('should always return response with exactly one text content item', async () => {
    mockService.askPermission.mockResolvedValue({ data: 'test' })
    const args = { tool_name: 'TestTool', input: {} }

    const result = await executeAskPermission(args)

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(typeof result.content[0].text).toBe('string')
  })
})
