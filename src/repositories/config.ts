import { join } from 'path'
import { homedir } from 'os'
import type { Config } from '@src/types/config'
import { DEFAULT_CONFIG, CONFIG_DIR_NAME } from '@src/constants/config'
import { readJson, fileExists } from '@src/infrastructures/fs'

function loadFromPath(path: string): Partial<Config> {
  if (!fileExists(path)) return {}
  try {
    return readJson<Partial<Config>>(path)
  } catch (error) {
    console.warn(`Failed to load config from ${path}:`, error)
    return {}
  }
}

function resolvePath(path: string): string {
  if (path.startsWith('/')) return path
  if (path.startsWith('~')) return path.replace('~', homedir())
  return join(process.cwd(), path)
}

export function loadConfig(): Config {
  const localConfig = loadFromPath(join(`./${CONFIG_DIR_NAME}`, 'config.json'))
  const globalConfig = loadFromPath(join(homedir(), CONFIG_DIR_NAME, 'config.json'))
  return { ...DEFAULT_CONFIG, ...globalConfig, ...localConfig }
}

export function resolveSessionsDir(config: Config): string {
  return resolvePath(config.sessions_dir || DEFAULT_CONFIG.sessions_dir!)
}

export function resolveLogsDir(config: Config): string {
  return resolvePath(config.logs_dir || DEFAULT_CONFIG.logs_dir!)
}
