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

