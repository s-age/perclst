import { join } from 'path'
import type { IKnowledgeSearchRepository } from './ports/knowledgeSearch'
import type { KnowledgeFileEntry } from '@src/types/knowledgeSearch'
import type { KnowledgeReaderInfra } from '@src/infrastructures/knowledgeReader'

export class KnowledgeSearchRepository implements IKnowledgeSearchRepository {
  constructor(
    private reader: KnowledgeReaderInfra,
    private readonly knowledgeDir: string
  ) {}

  loadAll(includeDraft: boolean): KnowledgeFileEntry[] {
    const files = this.reader.listFilesRecursive(this.knowledgeDir, '.md')
    return files
      .filter((entry) => includeDraft || !entry.absolute.includes(`${this.knowledgeDir}/draft`))
      .map((entry) => ({
        relativePath: entry.relative,
        content: this.reader.readTextFile(entry.absolute)
      }))
  }

  hasDraftEntries(): boolean {
    return this.reader.listFilesRecursive(join(this.knowledgeDir, 'draft'), '.md').length > 0
  }
}
