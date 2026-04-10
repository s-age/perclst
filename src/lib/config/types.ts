export interface Config {
  sessions_dir?: string
  logs_dir?: string
  model?: string
  max_tokens?: number
  temperature?: number
  api_key_env?: string
}

export const DEFAULT_CONFIG: Config = {
  sessions_dir: 'sessions',
  logs_dir: 'logs',
  model: 'claude-sonnet-4-6', // or use aliases: sonnet, opus, haiku
  max_tokens: 8000,
  temperature: 0.7,
  api_key_env: 'ANTHROPIC_API_KEY'
}
