export interface Config {
  sessions_dir?: string
  logs_dir?: string
  model?: string
  max_tokens?: number
  temperature?: number
  api_key_env?: string
}

export const DEFAULT_CONFIG: Config = {
  sessions_dir: '.cloader/sessions',
  logs_dir: '.cloader/logs',
  model: 'claude-sonnet-4-5',
  max_tokens: 8000,
  temperature: 0.7,
  api_key_env: 'ANTHROPIC_API_KEY'
}
