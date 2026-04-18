import { describe, it, expect } from 'vitest'
import { parseRunOptions, parsePipeline } from '../runPipeline'
import { ValidationError } from '@src/errors/validationError'

describe('parseRunOptions', () => {
  const minimal = { pipelinePath: 'pipelines/my-pipeline.json' }

  it('should parse with only required pipelinePath', () => {
    const result = parseRunOptions(minimal)
    expect(result.pipelinePath).toBe('pipelines/my-pipeline.json')
  })

  it('should default format to text', () => {
    const result = parseRunOptions(minimal)
    expect(result.format).toBe('text')
  })

  it('should parse optional model when provided', () => {
    const result = parseRunOptions({ ...minimal, model: 'opus' })
    expect(result.model).toBe('opus')
  })

  it('should parse optional outputOnly when provided', () => {
    const result = parseRunOptions({ ...minimal, outputOnly: true })
    expect(result.outputOnly).toBe(true)
  })

  it('should parse format json when provided', () => {
    const result = parseRunOptions({ ...minimal, format: 'json' })
    expect(result.format).toBe('json')
  })

  it('should throw ValidationError when pipelinePath is missing', () => {
    expect(() => parseRunOptions({})).toThrow(ValidationError)
  })

  it('should throw ValidationError when pipelinePath is empty string', () => {
    expect(() => parseRunOptions({ pipelinePath: '' })).toThrow(ValidationError)
  })

  it('should throw ValidationError for invalid format value', () => {
    expect(() => parseRunOptions({ ...minimal, format: 'xml' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when outputOnly receives a string', () => {
    expect(() => parseRunOptions({ ...minimal, outputOnly: 'yes' })).toThrow(ValidationError)
  })
})

describe('parsePipeline', () => {
  const agentTask = { type: 'agent', task: 'do something' }
  const scriptTask = { type: 'script', command: 'echo hello' }

  describe('agent task', () => {
    it('should parse a minimal agent task', () => {
      const result = parsePipeline({ tasks: [agentTask] })
      expect(result.tasks[0]).toMatchObject({ type: 'agent', task: 'do something' })
    })

    it('should parse agent task with all optional fields', () => {
      const result = parsePipeline({
        tasks: [
          {
            type: 'agent',
            task: 'do something',
            name: 'my-agent',
            procedure: 'default',
            model: 'sonnet',
            allowed_tools: ['Bash', 'Read'],
            disallowed_tools: ['Write'],
            max_turns: 5,
            max_context_tokens: 10000
          }
        ]
      })
      const task = result.tasks[0]
      expect(task).toMatchObject({
        type: 'agent',
        name: 'my-agent',
        procedure: 'default',
        model: 'sonnet',
        allowed_tools: ['Bash', 'Read'],
        disallowed_tools: ['Write'],
        max_turns: 5,
        max_context_tokens: 10000
      })
    })

    it('should parse agent task with rejected config', () => {
      const result = parsePipeline({
        tasks: [{ ...agentTask, rejected: { to: 'fallback-task', max_retries: 3 } }]
      })
      const task = result.tasks[0] as { rejected?: { to: string; max_retries?: number } }
      expect(task.rejected).toMatchObject({ to: 'fallback-task', max_retries: 3 })
    })

    it('should parse agent task with rejected config without max_retries', () => {
      const result = parsePipeline({
        tasks: [{ ...agentTask, rejected: { to: 'fallback-task' } }]
      })
      const task = result.tasks[0] as { rejected?: { to: string; max_retries?: number } }
      expect(task.rejected?.to).toBe('fallback-task')
    })

    it('should throw ValidationError when agent task is missing task field', () => {
      expect(() => parsePipeline({ tasks: [{ type: 'agent' }] })).toThrow(ValidationError)
    })

    it('should throw ValidationError when agent task field is empty string', () => {
      expect(() => parsePipeline({ tasks: [{ type: 'agent', task: '' }] })).toThrow(ValidationError)
    })

    it('should throw ValidationError when rejected.to is empty string', () => {
      expect(() => parsePipeline({ tasks: [{ ...agentTask, rejected: { to: '' } }] })).toThrow(
        ValidationError
      )
    })

    it('should throw ValidationError when rejected.max_retries is less than 1', () => {
      expect(() =>
        parsePipeline({ tasks: [{ ...agentTask, rejected: { to: 'x', max_retries: 0 } }] })
      ).toThrow(ValidationError)
    })
  })

  describe('script task', () => {
    it('should parse a minimal script task', () => {
      const result = parsePipeline({ tasks: [scriptTask] })
      expect(result.tasks[0]).toMatchObject({ type: 'script', command: 'echo hello' })
    })

    it('should parse script task with rejected config', () => {
      const result = parsePipeline({
        tasks: [{ ...scriptTask, rejected: { to: 'on-fail', max_retries: 2 } }]
      })
      const task = result.tasks[0] as { rejected?: { to: string; max_retries?: number } }
      expect(task.rejected).toMatchObject({ to: 'on-fail', max_retries: 2 })
    })

    it('should throw ValidationError when script task is missing command', () => {
      expect(() => parsePipeline({ tasks: [{ type: 'script' }] })).toThrow(ValidationError)
    })

    it('should throw ValidationError when script command is empty string', () => {
      expect(() => parsePipeline({ tasks: [{ type: 'script', command: '' }] })).toThrow(
        ValidationError
      )
    })
  })

  describe('nested pipeline task', () => {
    it('should parse a nested pipeline task', () => {
      const result = parsePipeline({
        tasks: [{ type: 'pipeline', name: 'sub-pipeline', tasks: [agentTask] }]
      })
      expect(result.tasks[0]).toMatchObject({ type: 'pipeline', name: 'sub-pipeline' })
    })

    it('should parse deeply nested pipeline tasks', () => {
      const result = parsePipeline({
        tasks: [
          {
            type: 'pipeline',
            name: 'outer',
            tasks: [{ type: 'pipeline', name: 'inner', tasks: [scriptTask] }]
          }
        ]
      })
      const outer = result.tasks[0] as { tasks: unknown[] }
      expect(outer.tasks[0]).toMatchObject({ type: 'pipeline', name: 'inner' })
    })

    it('should throw ValidationError when nested pipeline name is missing', () => {
      expect(() => parsePipeline({ tasks: [{ type: 'pipeline', tasks: [agentTask] }] })).toThrow(
        ValidationError
      )
    })

    it('should throw ValidationError when nested pipeline name is empty string', () => {
      expect(() =>
        parsePipeline({ tasks: [{ type: 'pipeline', name: '', tasks: [agentTask] }] })
      ).toThrow(ValidationError)
    })

    it('should throw ValidationError when nested pipeline tasks is empty', () => {
      expect(() =>
        parsePipeline({ tasks: [{ type: 'pipeline', name: 'sub', tasks: [] }] })
      ).toThrow(ValidationError)
    })
  })

  describe('top-level pipeline', () => {
    it('should parse multiple tasks of mixed types', () => {
      const result = parsePipeline({ tasks: [agentTask, scriptTask] })
      expect(result.tasks).toHaveLength(2)
    })

    it('should throw ValidationError when tasks array is empty', () => {
      expect(() => parsePipeline({ tasks: [] })).toThrow(ValidationError)
    })

    it('should throw ValidationError when tasks field is missing', () => {
      expect(() => parsePipeline({})).toThrow(ValidationError)
    })

    it('should throw ValidationError for unknown task type', () => {
      expect(() => parsePipeline({ tasks: [{ type: 'unknown' }] })).toThrow(ValidationError)
    })

    it('should throw ValidationError when raw input is not an object', () => {
      expect(() => parsePipeline('not-an-object')).toThrow(ValidationError)
    })

    it('should throw ValidationError when raw input is null', () => {
      expect(() => parsePipeline(null)).toThrow(ValidationError)
    })
  })
})
