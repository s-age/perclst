import { container } from './container'
import { TOKENS } from './identifiers'
import { setupInfrastructures, type Infras } from './setupInfrastructures'
import { setupRepositories, type Repos } from './setupRepositories'
import { setupDomains, type Domains } from './setupDomains'
import { setupServices, type Services } from './setupServices'
import { loadConfig, resolveSessionsDir, resolveKnowledgeDir } from '@src/repositories/config'
import { DEFAULT_MODEL } from '@src/constants/config'

export type { Infras, Repos, Domains, Services }

export type ContainerOverrides = {
  infras?: Partial<Infras>
  repos?: Partial<Repos>
  domains?: Partial<Domains>
  services?: Partial<Services>
}

export function setupContainer(overrides?: ContainerOverrides): void {
  const config = loadConfig()
  const sessionsDir = resolveSessionsDir(config)
  const knowledgeDir = resolveKnowledgeDir()
  const model = config.model ?? DEFAULT_MODEL

  container.register(TOKENS.Config, config)

  const infras = setupInfrastructures(overrides?.infras)
  const repos = setupRepositories(infras, { sessionsDir, knowledgeDir }, overrides?.repos)
  const domains = setupDomains(model, repos, overrides?.domains)
  setupServices(config, domains, repos, overrides?.services)
}
