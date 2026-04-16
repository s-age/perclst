export type KnowledgeFileEntry = {
  relativePath: string
  content: string
}

export type IKnowledgeSearchRepository = {
  loadAll(includeDraft: boolean): KnowledgeFileEntry[]
}
