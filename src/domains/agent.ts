import type { AgentResponse } from '@src/types/agent'
import type { Session } from '@src/types/session'
import { logger } from '@src/utils/logger'
import { loadProcedure } from '@src/repositories/procedures'
import { dispatch } from '@src/infrastructures/claudeCode'
import { APIError } from '@src/errors/apiError'

export type ExecuteOptions = {
  allowedTools?: string[]
  model?: string
  sessionFilePath?: string
}

export type IAgentDomain = {
  run(
    session: Session,
    instruction: string,
    isResume: boolean,
    options?: ExecuteOptions
  ): Promise<AgentResponse>
}

export class AgentDomain implements IAgentDomain {
  constructor(private model: string) {}

  async run(
    session: Session,
    instruction: string,
    isResume: boolean,
    options: ExecuteOptions = {}
  ): Promise<AgentResponse> {
    let systemPrompt: string | undefined
    if (session.procedure) {
      systemPrompt = loadProcedure(session.procedure)
      logger.debug('Loaded procedure', { procedure: session.procedure })
    }

    const baseArgs = {
      sessionId: session.claude_session_id,
      prompt: instruction,
      model: options.model ?? this.model,
      allowedTools: options.allowedTools,
      workingDir: session.working_dir,
      sessionFilePath: options.sessionFilePath
    }

    const raw = await dispatch(
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
      thoughts: raw.thoughts.length > 0 ? raw.thoughts : undefined,
      tool_history: raw.tool_history.length > 0 ? raw.tool_history : undefined
    }
  }
}
