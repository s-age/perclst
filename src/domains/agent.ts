import type { AgentResponse, ExecuteOptions } from '@src/types/agent'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { IProcedureRepository } from '@src/repositories/ports/agent'
import type { Session } from '@src/types/session'
import type { IClaudeCodeRepository } from '@src/types/claudeCode'
import { logger } from '@src/utils/logger'
import { APIError } from '@src/errors/apiError'

export class AgentDomain implements IAgentDomain {
  constructor(
    private model: string,
    private claudeCodeRepo: IClaudeCodeRepository,
    private procedureRepo: IProcedureRepository
  ) {}

  async run(
    session: Session,
    instruction: string,
    isResume: boolean,
    options: ExecuteOptions = {}
  ): Promise<AgentResponse> {
    let systemPrompt: string | undefined
    if (session.procedure) {
      systemPrompt = this.procedureRepo.load(session.procedure)
      logger.debug('Loaded procedure', { procedure: session.procedure })
    }

    const baseArgs = {
      sessionId: session.claude_session_id,
      prompt: instruction,
      model: options.model ?? this.model,
      allowedTools: options.allowedTools,
      disallowedTools: options.disallowedTools,
      workingDir: session.working_dir,
      sessionFilePath: options.sessionFilePath
    }

    const raw = await this.claudeCodeRepo.dispatch(
      isResume
        ? { type: 'resume', ...baseArgs }
        : { type: 'start', system: systemPrompt, ...baseArgs }
    )

    if (!raw.content) {
      throw new APIError('Empty response from Claude CLI')
    }

    return {
      content: raw.content,
      model: 'claude-cli',
      usage: raw.usage,
      last_assistant_usage: raw.last_assistant_usage,
      message_count: raw.message_count,
      thoughts: raw.thoughts.length > 0 ? raw.thoughts : undefined,
      tool_history: raw.tool_history.length > 0 ? raw.tool_history : undefined
    }
  }

  async fork(
    originalSession: Session,
    newSession: Session,
    instruction: string,
    options: ExecuteOptions = {}
  ): Promise<AgentResponse> {
    const raw = await this.claudeCodeRepo.dispatch({
      type: 'fork',
      originalClaudeSessionId: originalSession.claude_session_id,
      originalWorkingDir: originalSession.working_dir,
      sessionId: newSession.claude_session_id,
      prompt: instruction,
      resumeSessionAt: options.resumeSessionAt,
      model: options.model ?? this.model,
      allowedTools: options.allowedTools,
      disallowedTools: options.disallowedTools,
      workingDir: newSession.working_dir,
      sessionFilePath: options.sessionFilePath
    })

    if (!raw.content) {
      throw new APIError('Empty response from Claude CLI')
    }

    return {
      content: raw.content,
      model: 'claude-cli',
      usage: raw.usage,
      last_assistant_usage: raw.last_assistant_usage,
      message_count: raw.message_count,
      thoughts: raw.thoughts.length > 0 ? raw.thoughts : undefined,
      tool_history: raw.tool_history.length > 0 ? raw.tool_history : undefined
    }
  }
}
