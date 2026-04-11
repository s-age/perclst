export interface DisplayConfig {
  /** Header color in #RRGGBB format (default: Claude orange #D97757) */
  header_color?: string
  /** Disable all color output (also honored via NO_COLOR env var) */
  no_color?: boolean
}

export interface Config {
  sessions_dir?: string
  logs_dir?: string
  model?: string
  max_tokens?: number
  temperature?: number
  api_key_env?: string
  display?: DisplayConfig
}

export const DEFAULT_CONFIG: Config = {
  sessions_dir: 'sessions',
  logs_dir: 'logs',
  model: 'claude-sonnet-4-6', // or use aliases: sonnet, opus, haiku
  max_tokens: 8000,
  temperature: 0.7,
  api_key_env: 'ANTHROPIC_API_KEY',
  display: {
    header_color: '#D97757',
    no_color: false,
  }
}
