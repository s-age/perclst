import { join } from 'path'
import type { IKnowledgeSearchRepository, KnowledgeFileEntry } from './ports/knowledgeSearch'
import { listFilesRecursive, readTextFile } from '@src/infrastructures/knowledgeReader'

export class KnowledgeSearchRepository implements IKnowledgeSearchRepository {
  constructor(private readonly knowledgeDir: string) {}

  loadAll(includeDraft: boolean): KnowledgeFileEntry[] {
    const files = listFilesRecursive(this.knowledgeDir, '.md')
    return files
      .filter((entry) => includeDraft || !entry.absolute.includes(`${this.knowledgeDir}/draft`))
      .map((entry) => ({
        relativePath: entry.relative,
        content: readTextFile(entry.absolute)
      }))
  }

  hasDraftEntries(): boolean {
    return listFilesRecursive(join(this.knowledgeDir, 'draft'), '.md').length > 0
  }
}
