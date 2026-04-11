import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { Config } from './types.js'
import { DEFAULT_CONFIG } from './defaults.js'
import { CONFIG_DIR_NAME } from '../../constants/config.js'

export class ConfigResolver {
  /**
   * Load configuration with priority:
   * 1. ./.perclst/config.json (current directory)
   * 2. ~/.perclst/config.json (home directory)
   * 3. Default values
   */
  static load(): Config {
    const localConfig = this.loadFromPath(join(`./${CONFIG_DIR_NAME}`, 'config.json'))
    const globalConfig = this.loadFromPath(join(homedir(), CONFIG_DIR_NAME, 'config.json'))

    return {
      ...DEFAULT_CONFIG,
      ...globalConfig,
      ...localConfig
    }
  }

  /**
   * Resolve sessions directory path
   */
  static resolveSessionsDir(config: Config): string {
    return this.resolvePath(config.sessions_dir || DEFAULT_CONFIG.sessions_dir!)
  }

  /**
   * Resolve logs directory path
   */
  static resolveLogsDir(config: Config): string {
    return this.resolvePath(config.logs_dir || DEFAULT_CONFIG.logs_dir!)
  }

  private static resolvePath(path: string): string {
    // Absolute path
    if (path.startsWith('/')) {
      return path
    }

    // Home directory
    if (path.startsWith('~')) {
      return path.replace('~', homedir())
    }

    // Relative path (from current working directory)
    return join(process.cwd(), path)
  }

  private static loadFromPath(path: string): Partial<Config> {
    if (!existsSync(path)) {
      return {}
    }

    try {
      const content = readFileSync(path, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.warn(`Failed to load config from ${path}:`, error)
      return {}
    }
  }
}
