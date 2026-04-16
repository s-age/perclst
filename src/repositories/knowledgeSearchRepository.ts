import { join, relative, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { IKnowledgeSearchRepository, KnowledgeFileEntry } from './ports/knowledgeSearch'
import { listMarkdownFilesRecursive, readTextFile } from '@src/infrastructures/knowledgeReader'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DEFAULT_KNOWLEDGE_DIR = join(__dirname, '../../../knowledge')

export class KnowledgeSearchRepository implements IKnowledgeSearchRepository {
  constructor(private readonly knowledgeDir: string = DEFAULT_KNOWLEDGE_DIR) {}

  loadAll(includeDraft: boolean): KnowledgeFileEntry[] {
    const files = listMarkdownFilesRecursive(this.knowledgeDir)
    return files
      .filter((abs) => includeDraft || !abs.includes(`${this.knowledgeDir}/draft`))
      .map((abs) => ({
        relativePath: relative(this.knowledgeDir, abs),
        content: readTextFile(abs)
      }))
  }
}
