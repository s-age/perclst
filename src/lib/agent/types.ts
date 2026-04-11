export interface AgentConfig {
  model: string
  max_tokens: number
  temperature: number
  api_key: string
  /** List of Claude Code built-in tools to allow without prompting (e.g. ['WebFetch', 'WebSearch']) */
  allowedTools?: string[]
}

export interface AgentRequest {
  messages: Message[]
  system?: string
  config: AgentConfig
  sessionFilePath?: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
}

export interface ToolUseRecord {
  id: string
  name: string
  input: unknown
  result?: string
}

export interface AgentResponse {
  content: string
  model: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
  thoughts?: ThinkingBlock[]
  tool_history?: ToolUseRecord[]
}
