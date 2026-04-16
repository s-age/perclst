import type { IKnowledgeSearchDomain } from './ports/knowledgeSearch'
import type {
  IKnowledgeSearchRepository,
  KnowledgeFileEntry
} from '@src/repositories/ports/knowledgeSearch'
import type {
  KnowledgeMatch,
  KnowledgeSearchOptions,
  KnowledgeSearchResult
} from '@src/types/knowledgeSearch'

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------

/**
 * Parse a query string into OR groups of AND terms.
 *
 * Syntax:
 *   "foo bar"          → [["foo", "bar"]]          (AND)
 *   "foo OR bar"       → [["foo"], ["bar"]]         (OR)
 *   "foo bar OR baz"   → [["foo", "bar"], ["baz"]]  (AND within each OR group)
 *   "foo AND bar"      → [["foo", "bar"]]           (explicit AND, same as space)
 *
 * The word "OR" (case-insensitive) splits groups; "AND" is stripped.
 */
function parseQuery(query: string): string[][] {
  return query
    .split(/\bOR\b/i)
    .map((group) =>
      group
        .trim()
        .split(/\s+/)
        .filter((t) => t && t.toUpperCase() !== 'AND')
        .map((t) => t.toLowerCase())
    )
    .filter((group) => group.length > 0)
}

// ---------------------------------------------------------------------------
// Keyword extraction
// ---------------------------------------------------------------------------

/**
 * Extract keywords from the `**Keywords:** …` line at the end of a knowledge file.
 * Returns an empty array if no Keywords field is found.
 */
function extractKeywords(content: string): string[] {
  const match = content.match(/\*\*Keywords:\*\*\s*(.+)$/m)
  if (!match) return []
  return match[1]
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * Returns the matched AND terms from the first OR group that fully matches,
 * or null if no group matches.
 *
 * Matching priority:
 *   1. **Keywords:** field (if present)
 *   2. Full file content (fallback for files without a Keywords field)
 */
function matchFile(file: KnowledgeFileEntry, orGroups: string[][]): string[] | null {
  const keywords = extractKeywords(file.content)
  const searchTarget = keywords.length > 0 ? keywords.join(' ') : file.content.toLowerCase()

  for (const andTerms of orGroups) {
    if (andTerms.every((term) => searchTarget.includes(term))) {
      return andTerms
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Title / excerpt helpers
// ---------------------------------------------------------------------------

function extractTitle(content: string, relativePath: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) return headingMatch[1].trim()
  const parts = relativePath.split('/')
  return (parts[parts.length - 1] ?? relativePath).replace(/\.md$/, '')
}

function extractExcerpt(content: string, matchedTerms: string[]): string {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase()
    if (matchedTerms.some((t) => lineLower.includes(t))) {
      const start = Math.max(0, i - 1)
      const end = Math.min(lines.length, i + 4)
      return lines.slice(start, end).join('\n').trim().slice(0, 300)
    }
  }
  return content.slice(0, 200).trim()
}

// ---------------------------------------------------------------------------
// Domain class
// ---------------------------------------------------------------------------

export class KnowledgeSearchDomain implements IKnowledgeSearchDomain {
  constructor(private readonly repo: IKnowledgeSearchRepository) {}

  search(options: KnowledgeSearchOptions): KnowledgeSearchResult {
    const { query, include_draft } = options
    const orGroups = parseQuery(query)

    if (orGroups.length === 0) {
      return { query, results: [], total: 0 }
    }

    const files = this.repo.loadAll(include_draft)
    const results: KnowledgeMatch[] = []

    for (const file of files) {
      const matchedTerms = matchFile(file, orGroups)
      if (matchedTerms === null) continue
      results.push({
        file_path: file.relativePath,
        title: extractTitle(file.content, file.relativePath),
        excerpt: extractExcerpt(file.content, matchedTerms),
        matched_terms: matchedTerms
      })
    }

    return { query, results, total: results.length }
  }
}
