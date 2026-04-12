import { IConfigProvider } from '@src/application/ports/config-provider'
import { Config } from '@src/types/config'

export class InMemoryConfigProvider implements IConfigProvider {
  public config: Config = {
    sessions_dir: 'sessions',
    logs_dir: 'logs',
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8192,
    temperature: 0
  }

  load(): Config {
    return this.config
  }

  resolveSessionsDir(config: Config): string {
    return config.sessions_dir || 'sessions'
  }

  resolveLogsDir(config: Config): string {
    return config.logs_dir || 'logs'
  }
}
