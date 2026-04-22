import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IRejectionFeedbackRepository } from '@src/repositories/ports/rejectionFeedback'
import type { AgentResponse } from '@src/types/agent'
import { debug } from '@src/utils/output'
import { PipelineDomain } from '../../pipeline'

// Mock module-level dependencies
vi.mock('@src/utils/output', () => ({
  debug: {
    print: vi.fn()
  }
}))

describe('PipelineDomain - token and turn limits', () => {
  let pipelineDomain: PipelineDomain
  let agentDomain: IAgentDomain
  let sessionDomain: ISessionDomain
  let rejectionFeedbackRepo: IRejectionFeedbackRepository

  beforeEach(() => {
    vi.clearAllMocks()

    agentDomain = {
      run: vi.fn()
    } as unknown as IAgentDomain

    sessionDomain = {
      create: vi.fn(),
      findByName: vi.fn(),
      getPath: vi.fn(),
      updateStatus: vi.fn()
    } as unknown as ISessionDomain

    rejectionFeedbackRepo = {
      getFeedback: vi.fn(),
      getCwd: vi.fn()
    } as unknown as IRejectionFeedbackRepository

    pipelineDomain = new PipelineDomain(agentDomain, sessionDomain, rejectionFeedbackRepo)
  })

  describe('getContextTokens', () => {
    it('returns zero when no usage data present', () => {
      const response: AgentResponse = {
        message_count: 1,
        last_assistant_usage: undefined
      } as AgentResponse

      // eslint-disable-next-line local/no-any
      const tokens = (pipelineDomain as any).getContextTokens(response)

      expect(tokens).toBe(0)
    })

    it('sums input tokens and cache tokens', () => {
      const response: AgentResponse = {
        message_count: 1,
        last_assistant_usage: {
          input_tokens: 1000,
          output_tokens: 200,
          cache_read_input_tokens: 300,
          cache_creation_input_tokens: 400
        }
      } as AgentResponse

      // eslint-disable-next-line local/no-any
      const tokens = (pipelineDomain as any).getContextTokens(response)

      expect(tokens).toBe(1700) // 1000 + 300 + 400
    })

    it('includes cache_read_input_tokens when present', () => {
      const response: AgentResponse = {
        message_count: 1,
        last_assistant_usage: {
          input_tokens: 500,
          output_tokens: 100,
          cache_read_input_tokens: 250,
          cache_creation_input_tokens: 0
        }
      } as AgentResponse

      // eslint-disable-next-line local/no-any
      const tokens = (pipelineDomain as any).getContextTokens(response)

      expect(tokens).toBe(750) // 500 + 250
    })

    it('handles missing cache token fields', () => {
      const response: AgentResponse = {
        message_count: 1,
        last_assistant_usage: {
          input_tokens: 600,
          output_tokens: 100
        }
      } as AgentResponse

      // eslint-disable-next-line local/no-any
      const tokens = (pipelineDomain as any).getContextTokens(response)

      expect(tokens).toBe(600)
    })
  })

  describe('isLimitExceeded', () => {
    it('returns false when neither limit exceeded', () => {
      const response: AgentResponse = {
        message_count: 2,
        last_assistant_usage: {
          input_tokens: 1000,
          output_tokens: 100,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0
        }
      } as AgentResponse

      // eslint-disable-next-line local/no-any
      const result = (pipelineDomain as any).isLimitExceeded(response, 5, 5000)

      expect(result).toBe(false)
    })

    it('returns true when turn limit exceeded', () => {
      const response: AgentResponse = {
        message_count: 6,
        last_assistant_usage: undefined
      } as AgentResponse

      // eslint-disable-next-line local/no-any
      const result = (pipelineDomain as any).isLimitExceeded(response, 5, -1)

      expect(result).toBe(true)
      expect(vi.mocked(debug.print)).toHaveBeenCalledWith('Turn limit reached: 6 >= 5')
    })

    it('returns true when context token limit exceeded', () => {
      const response: AgentResponse = {
        message_count: 2,
        last_assistant_usage: {
          input_tokens: 5500,
          output_tokens: 100,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0
        }
      } as AgentResponse

      // eslint-disable-next-line local/no-any
      const result = (pipelineDomain as any).isLimitExceeded(response, -1, 5000)

      expect(result).toBe(true)
      expect(vi.mocked(debug.print)).toHaveBeenCalledWith('Context token limit reached')
    })

    it('ignores limits when set to -1', () => {
      const response: AgentResponse = {
        message_count: 100,
        last_assistant_usage: {
          input_tokens: 10000,
          output_tokens: 100,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0
        }
      } as AgentResponse

      // eslint-disable-next-line local/no-any
      const result = (pipelineDomain as any).isLimitExceeded(response, -1, -1)

      expect(result).toBe(false)
    })

    it('uses equals comparison for turn limit (>=)', () => {
      const response: AgentResponse = {
        message_count: 5,
        last_assistant_usage: undefined
      } as AgentResponse

      // eslint-disable-next-line local/no-any
      const result = (pipelineDomain as any).isLimitExceeded(response, 5, -1)

      expect(result).toBe(true)
    })

    it('uses equals comparison for context token limit (>=)', () => {
      const response: AgentResponse = {
        message_count: 1,
        last_assistant_usage: {
          input_tokens: 5000,
          output_tokens: 0,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0
        }
      } as AgentResponse

      // eslint-disable-next-line local/no-any
      const result = (pipelineDomain as any).isLimitExceeded(response, -1, 5000)

      expect(result).toBe(true)
    })
  })
})
