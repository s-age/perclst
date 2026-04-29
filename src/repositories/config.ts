import { join } from 'path'
import type { Config } from '@src/types/config'
import { DEFAULT_CONFIG, CONFIG_DIR_NAME } from '@src/constants/config'
import type { FsInfra } from '@src/infrastructures/fs'

function loadFromPath(fs: FsInfra, path: string): Partial<Config> {
  if (!fs.fileExists(path)) return {}
  try {
    return fs.readJson<Partial<Config>>(path)
  } catch (error) {
    console.warn(`Failed to load config from ${path}:`, error)
    return {}
  }
}

function resolvePath(fs: FsInfra, path: string): string {
  if (path.startsWith('/')) return path
  if (path.startsWith('~')) return path.replace('~', fs.homeDir())
  return join(fs.currentWorkingDir(), path)
}

export function loadConfig(fs: FsInfra): Config {
  const localConfig = loadFromPath(fs, join(`./${CONFIG_DIR_NAME}`, 'config.json'))
  const globalConfig = loadFromPath(fs, join(fs.homeDir(), CONFIG_DIR_NAME, 'config.json'))
  return { ...DEFAULT_CONFIG, ...globalConfig, ...localConfig }
}

export function resolveSessionsDir(fs: FsInfra, config: Config): string {
  return resolvePath(fs, config.sessions_dir || DEFAULT_CONFIG.sessions_dir!)
}

export function resolveKnowledgeDir(fs: FsInfra): string {
  return join(fs.currentWorkingDir(), 'knowledge')
}
