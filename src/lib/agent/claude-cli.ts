import { exec } from 'child_process'
import { promisify } from 'util'
import { AgentRequest, AgentResponse } from './types.js'
import { APIError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

const execAsync = promisify(exec)

export class ClaudeCLI {
  async call(request: AgentRequest): Promise<AgentResponse> {
    try {
      // Build prompt from conversation history
      let fullPrompt = ''

      // Add system prompt if exists
      if (request.system) {
        fullPrompt += `System: ${request.system}\n\n`
      }

      // Add conversation history
      for (const msg of request.messages) {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`
      }

      logger.debug('Calling claude CLI', {
        prompt_length: fullPrompt.length
      })

      // Build claude command with model option
      const modelArg = request.config.model ? `--model ${request.config.model}` : ''
      const command = `claude -p ${JSON.stringify(fullPrompt)} ${modelArg}`.trim()

      logger.debug('Executing claude command', { model: request.config.model })

      // Execute claude -p command
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 120000 // 2 minutes timeout
      })

      if (stderr) {
        logger.warn('Claude CLI stderr', { stderr })
      }

      const content = stdout.trim()

      if (!content) {
        throw new APIError('Empty response from Claude CLI')
      }

      logger.info('Claude CLI response received', {
        response_length: content.length
      })

      // Note: claude CLI doesn't provide token usage info
      return {
        content,
        model: 'claude-cli',
        usage: {
          input_tokens: 0,
          output_tokens: 0
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new APIError(`Claude CLI error: ${error.message}`)
      }
      throw error
    }
  }
}
