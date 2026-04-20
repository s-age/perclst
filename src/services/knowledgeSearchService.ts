import type { IKnowledgeSearchDomain } from '@src/domains/ports/knowledgeSearch'
import type { KnowledgeSearchOptions, KnowledgeSearchResult } from '@src/types/knowledgeSearch'

export class KnowledgeSearchService {
  constructor(private readonly domain: IKnowledgeSearchDomain) {}

  hasDraftEntries(): boolean {
    return this.domain.hasDraftEntries()
  }

  search(options: KnowledgeSearchOptions): KnowledgeSearchResult {
    return this.domain.search(options)
  }
}
