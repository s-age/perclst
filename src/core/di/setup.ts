import { container } from './container'
import { TOKENS } from './identifiers'
import { setupInfrastructures, type Infras } from './setupInfrastructures'
import { setupRepositories, type Repos } from './setupRepositories'
import { setupDomains, type Domains } from './setupDomains'
import { setupServices, type Services } from './setupServices'
import { loadConfig, resolveSessionsDir, resolveKnowledgeDir } from '@src/repositories/config'
import { FsInfra } from '@src/infrastructures/fs'
import { DEFAULT_MODEL, DEFAULT_EFFORT } from '@src/constants/config'
import type { Config } from '@src/types/config'

export type { Infras, Repos, Domains, Services }

export type ContainerOverrides = {
  config?: Config
  infras?: Partial<Infras>
  repos?: Partial<Repos>
  domains?: Partial<Domains>
  services?: Partial<Services>
}

export function setupContainer(overrides?: ContainerOverrides): void {
  const bootstrapFs = new FsInfra()
  const config = overrides?.config ?? loadConfig(bootstrapFs)
  const sessionsDir = resolveSessionsDir(bootstrapFs, config)
  const knowledgeDir = resolveKnowledgeDir(bootstrapFs)
  const model = config.model ?? DEFAULT_MODEL
  const effort = config.effort ?? DEFAULT_EFFORT

  container.register(TOKENS.Config, config)

  const infras = setupInfrastructures(overrides?.infras)
  const repos = setupRepositories(infras, { sessionsDir, knowledgeDir }, overrides?.repos)
  const domains = setupDomains(model, effort, repos, overrides?.domains)
  setupServices(config, domains, repos, overrides?.services)
}
