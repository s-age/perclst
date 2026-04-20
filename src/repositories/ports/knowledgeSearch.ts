import type { KnowledgeFileEntry } from '@src/types/knowledgeSearch'

export type IKnowledgeSearchRepository = {
  loadAll(includeDraft: boolean): KnowledgeFileEntry[]
  hasDraftEntries(): boolean
}
