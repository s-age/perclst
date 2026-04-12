import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { Config } from '@src/types/config'
import type { IConfigProvider } from '@src/types/config'
import { DEFAULT_CONFIG } from '@src/constants/config'
import { CONFIG_DIR_NAME } from '@src/constants/config'

export class FileConfigProvider implements IConfigProvider {
  load(): Config {
    const localConfig = this.loadFromPath(join(`./${CONFIG_DIR_NAME}`, 'config.json'))
    const globalConfig = this.loadFromPath(join(homedir(), CONFIG_DIR_NAME, 'config.json'))

    return {
      ...DEFAULT_CONFIG,
      ...globalConfig,
      ...localConfig
    }
  }

  resolveSessionsDir(config: Config): string {
    return this.resolvePath(config.sessions_dir || DEFAULT_CONFIG.sessions_dir!)
  }

  resolveLogsDir(config: Config): string {
    return this.resolvePath(config.logs_dir || DEFAULT_CONFIG.logs_dir!)
  }

  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path
    }
    if (path.startsWith('~')) {
      return path.replace('~', homedir())
    }
    return join(process.cwd(), path)
  }

  private loadFromPath(path: string): Partial<Config> {
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
