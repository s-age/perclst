import type { Config } from '@src/types/config'

export const APP_NAME = 'perclst'

/** Directory name used for local/global config files (.perclst/config.json) */
export const CONFIG_DIR_NAME = '.perclst'

/** MCP server name registered in the perclst permission server */
export const MCP_SERVER_NAME = 'perclst'

// --- Default config values ---

export const DEFAULT_MODEL = 'claude-sonnet-4-6'
export const DEFAULT_MAX_TOKENS = 8000
export const DEFAULT_TEMPERATURE = 0.7
export const DEFAULT_SESSIONS_DIR = '~/.perclst/sessions'
export const DEFAULT_LOGS_DIR = '~/.perclst/logs'
export const DEFAULT_HEADER_COLOR = '#D97757'
export const DEFAULT_API_KEY_ENV = 'ANTHROPIC_API_KEY'
export const CONTEXT_WINDOW_SIZE = 200_000

export const DEFAULT_CONFIG: Config = {
  sessions_dir: DEFAULT_SESSIONS_DIR,
  logs_dir: DEFAULT_LOGS_DIR,
  model: DEFAULT_MODEL,
  max_tokens: DEFAULT_MAX_TOKENS,
  temperature: DEFAULT_TEMPERATURE,
  api_key_env: DEFAULT_API_KEY_ENV,
  display: {
    header_color: DEFAULT_HEADER_COLOR,
    no_color: false
  }
}
