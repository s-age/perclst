import type { Config } from './types.js'
import {
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_SESSIONS_DIR,
  DEFAULT_LOGS_DIR,
  DEFAULT_HEADER_COLOR,
  DEFAULT_API_KEY_ENV,
} from '../../constants/config.js'

export const DEFAULT_CONFIG: Config = {
  sessions_dir: DEFAULT_SESSIONS_DIR,
  logs_dir: DEFAULT_LOGS_DIR,
  model: DEFAULT_MODEL,
  max_tokens: DEFAULT_MAX_TOKENS,
  temperature: DEFAULT_TEMPERATURE,
  api_key_env: DEFAULT_API_KEY_ENV,
  display: {
    header_color: DEFAULT_HEADER_COLOR,
    no_color: false,
  }
}
