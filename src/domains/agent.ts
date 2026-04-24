import type { AgentResponse, ExecuteOptions, AgentRunOptions } from '@src/types/agent'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { IProcedureRepository, IClaudeCodeRepository } from '@src/repositories/ports/agent'
import type { Session } from '@src/types/session'
import { debug } from '@src/utils/output'
import { APIError } from '@src/errors/apiError'

export const HEADLESS_SKILL_NOTE = [
  'The Skill tool is not available in this environment.',
  'To load a skill, use the Read tool to read `.claude/skills/<skill-name>/SKILL.md` directly.'
].join(' ')

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
    let systemPrompt: string = HEADLESS_SKILL_NOTE
    if (session.procedure) {
      const procedure = this.procedureRepo.load(session.procedure, session.working_dir)
      systemPrompt = `${HEADLESS_SKILL_NOTE}\n\n${procedure}`
      debug.print('Loaded procedure', { procedure: session.procedure })
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
        : { type: 'start', system: systemPrompt, ...baseArgs },
      options.onStreamEvent,
      options.signal
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

  private getContextTokens(response: AgentResponse): number {
    const u = response.last_assistant_usage
    if (!u) return 0
    return u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
  }

  isLimitExceeded(response: AgentResponse, options: AgentRunOptions): boolean {
    const maxTurns = options.maxTurns ?? -1
    if (maxTurns > 0) {
      const messageCount = response.message_count ?? 0
      if (messageCount >= maxTurns) {
        debug.print(`Turn limit reached: ${messageCount} >= ${maxTurns}`)
        return true
      }
    }

    const maxContextTokens = options.maxContextTokens ?? -1
    if (maxContextTokens > 0) {
      const contextTokens = this.getContextTokens(response)
      if (contextTokens >= maxContextTokens) {
        debug.print(`Context token limit reached: ${contextTokens} >= ${maxContextTokens}`)
        return true
      }
    }

    return false
  }

  async resume(
    session: Session,
    instruction: string,
    options: ExecuteOptions = {}
  ): Promise<AgentResponse> {
    if (session.rewind_source_claude_session_id) {
      const pseudoOriginal: Session = {
        ...session,
        claude_session_id: session.rewind_source_claude_session_id
      }
      const response = await this.fork(pseudoOriginal, session, instruction, {
        ...options,
        resumeSessionAt: session.rewind_to_message_id
      })
      session.rewind_source_claude_session_id = undefined
      session.rewind_to_message_id = undefined
      return response
    }

    return this.run(session, instruction, true, options)
  }

  async fork(
    originalSession: Session,
    newSession: Session,
    instruction: string,
    options: ExecuteOptions = {}
  ): Promise<AgentResponse> {
    const raw = await this.claudeCodeRepo.dispatch(
      {
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
      },
      options.onStreamEvent,
      options.signal
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
}
