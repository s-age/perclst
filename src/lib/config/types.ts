export interface DisplayConfig {
  /** Header color in #RRGGBB format (default: Claude orange #D97757) */
  header_color?: string
  /** Disable all color output (also honored via NO_COLOR env var) */
  no_color?: boolean
}

/** ANSI escape codes used across display modules */
export const ANSI = {
  RESET: '\x1b[0m',
  DIM: '\x1b[2m',
  BG_GREY: '\x1b[48;5;238m',
  FG_ON_GREY: '\x1b[97m',
} as const

export interface Config {
  sessions_dir?: string
  logs_dir?: string
  model?: string
  max_tokens?: number
  temperature?: number
  api_key_env?: string
  display?: DisplayConfig
}

