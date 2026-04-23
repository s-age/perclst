import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { askPermissionParams } from '../askPermission'

describe('askPermissionParams', () => {
  const schema = z.object(askPermissionParams)

  describe('valid inputs', () => {
    it('should accept valid input with all fields', () => {
      const input = {
        tool_name: 'WebFetch',
        input: { url: 'https://example.com' },
        tool_use_id: 'req-123'
      }
      expect(schema.parse(input)).toEqual(input)
    })

    it('should accept valid input without optional tool_use_id', () => {
      const input = {
        tool_name: 'Bash',
        input: { command: 'ls -la' }
      }
      expect(schema.parse(input)).toEqual(input)
    })

    it('should accept empty record for input field', () => {
      const input = {
        tool_name: 'Read',
        input: {}
      }
      expect(schema.parse(input)).toEqual(input)
    })

    it('should accept input record with mixed value types', () => {
      const input = {
        tool_name: 'Agent',
        input: {
          stringValue: 'text',
          numberValue: 42,
          booleanValue: true,
          nullValue: null,
          arrayValue: [1, 2, 3],
          objectValue: { nested: 'data' }
        }
      }
      expect(schema.parse(input)).toEqual(input)
    })

    it('should accept tool_use_id as empty string', () => {
      const input = {
        tool_name: 'Monitor',
        input: { timeout: 30000 },
        tool_use_id: ''
      }
      expect(schema.parse(input)).toEqual(input)
    })
  })

  describe('tool_name field validation', () => {
    it.each([
      ['null', null],
      ['number', 123],
      ['boolean', true],
      ['object', {}],
      ['array', []],
      ['undefined', undefined]
    ] as const)('should reject tool_name when it is %s', (_label, value) => {
      expect(() =>
        schema.parse({
          tool_name: value,
          input: {}
        })
      ).toThrow()
    })

    it('should reject empty string for tool_name', () => {
      expect(() =>
        schema.parse({
          tool_name: '',
          input: {}
        })
      ).not.toThrow()
    })
  })

  describe('input field validation', () => {
    it.each([
      ['null', null],
      ['string', 'not an object'],
      ['number', 42],
      ['boolean', false],
      ['array', []],
      ['undefined', undefined]
    ] as const)('should reject input field when it is %s', (_label, value) => {
      expect(() =>
        schema.parse({
          tool_name: 'TestTool',
          input: value
        })
      ).toThrow()
    })

    it('should accept input as plain object with string keys', () => {
      const input = {
        tool_name: 'Tool',
        input: { key1: 'value1', key2: 'value2' }
      }
      expect(schema.parse(input)).toEqual(input)
    })
  })

  describe('tool_use_id field validation', () => {
    it('should accept undefined tool_use_id', () => {
      const input = {
        tool_name: 'Tool',
        input: {},
        tool_use_id: undefined
      }
      expect(schema.parse(input)).toEqual({
        tool_name: 'Tool',
        input: {}
      })
    })

    it.each([
      ['number', 123],
      ['boolean', true],
      ['object', {}],
      ['array', []],
      ['null', null]
    ] as const)('should reject tool_use_id when it is %s', (_label, value) => {
      expect(() =>
        schema.parse({
          tool_name: 'Tool',
          input: {},
          tool_use_id: value
        })
      ).toThrow()
    })
  })

  describe('schema structure', () => {
    it('should have exactly three fields', () => {
      expect(Object.keys(askPermissionParams)).toHaveLength(3)
    })

    it('should have tool_name, input, and tool_use_id fields', () => {
      const keys = Object.keys(askPermissionParams).sort()
      expect(keys).toEqual(['input', 'tool_name', 'tool_use_id'])
    })

    it('should have descriptions for all fields', () => {
      const toolNameSchema = askPermissionParams.tool_name as z.ZodString
      const inputSchema = askPermissionParams.input as z.ZodRecord<z.ZodString, z.ZodUnknown>
      const toolUseIdSchema = askPermissionParams.tool_use_id as z.ZodOptional<z.ZodString>

      expect(toolNameSchema.description).toBeDefined()
      expect(inputSchema.description).toBeDefined()
      expect(toolUseIdSchema.description).toBeDefined()
    })
  })
})
