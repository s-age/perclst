import type { AgentStreamEvent } from './agent.js'

export type PipelineRunOptions = {
  allowedTools?: string[]
  disallowedTools?: string[]
  model?: string
  maxTurns?: number
  maxContextTokens?: number
  onStreamEvent?: (event: AgentStreamEvent) => void
}

export type RejectedContext = {
  retry_count: number
  task: AgentPipelineTask
  feedback: string
}

export type AgentPipelineTask = {
  type: 'agent'
  name?: string
  task: string
  procedure?: string
  model?: string
  allowed_tools?: string[]
  disallowed_tools?: string[]
  max_turns?: number
  max_context_tokens?: number
  rejected?: ScriptRejectedConfig
}

export type ScriptRejectedConfig = {
  to: string
  max_retries?: number
}

export type ScriptPipelineTask = {
  type: 'script'
  command: string
  rejected?: ScriptRejectedConfig
}

export type NestedPipelineTask = {
  type: 'pipeline'
  name: string
  tasks: PipelineTask[]
}

export type PipelineTask = AgentPipelineTask | ScriptPipelineTask | NestedPipelineTask

export type Pipeline = {
  tasks: PipelineTask[]
}
