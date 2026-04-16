import type { KnowledgeSearchOptions, KnowledgeSearchResult } from '@src/types/knowledgeSearch'

export type IKnowledgeSearchDomain = {
  search(options: KnowledgeSearchOptions): KnowledgeSearchResult
}
