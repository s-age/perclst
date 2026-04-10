import Anthropic from '@anthropic-ai/sdk'
import { AgentRequest, AgentResponse } from './types.js'
import { APIError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

export class ClaudeClient {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async call(request: AgentRequest): Promise<AgentResponse> {
    try {
      logger.debug('Calling Claude API', {
        model: request.config.model,
        messages: request.messages.length
      })

      const response = await this.client.messages.create({
        model: request.config.model,
        max_tokens: request.config.max_tokens,
        temperature: request.config.temperature,
        system: request.system,
        messages: request.messages
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new APIError('Unexpected response type from Claude API')
      }

      logger.info('Claude API response received', {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      })

      return {
        content: content.text,
        model: response.model,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens
        }
      }
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new APIError(
          `Claude API error: ${error.message}`,
          error.status
        )
      }
      throw error
    }
  }
}
