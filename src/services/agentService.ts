import type { AgentResponse } from '@src/types/agent'
import type { Session } from '@src/types/session'
import type { IAgentDomain, ExecuteOptions } from '@src/domains/agent'

export type { ExecuteOptions }

export class AgentService {
  constructor(private domain: IAgentDomain) {}

  async run(
    session: Session,
    instruction: string,
    isResume: boolean,
    options: ExecuteOptions = {}
  ): Promise<AgentResponse> {
    return this.domain.run(session, instruction, isResume, options)
  }
}
