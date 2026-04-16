export type KnowledgeMatch = {
  file_path: string
  title: string
  excerpt: string
  matched_terms: string[]
}

export type KnowledgeSearchOptions = {
  query: string
  include_draft: boolean
}

export type KnowledgeSearchResult = {
  query: string
  results: KnowledgeMatch[]
  total: number
}
