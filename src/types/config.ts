export type DisplayConfig = {
  /** Header color in #RRGGBB format (default: Claude orange #D97757) */
  header_color?: string
  /** Disable all color output (also honored via NO_COLOR env var) */
  no_color?: boolean
}

export type AgentLimitsConfig = {
  /** Maximum message count before graceful termination. -1 = disabled. */
  max_turns?: number
  /** Maximum context window tokens before graceful termination. -1 = disabled. */
  max_context_tokens?: number
}

export type Config = {
  sessions_dir?: string
  logs_dir?: string
  model?: string
  api_key_env?: string
  display?: DisplayConfig
  limits?: AgentLimitsConfig
}
