import type { Config } from '@src/types/config'

export interface IConfigProvider {
  load(): Config
  resolveSessionsDir(config: Config): string
  resolveLogsDir(config: Config): string
}
