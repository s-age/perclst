import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { ClaudeSessionRepository } from '@src/repositories/claudeSessions'
import { FsInfra } from '@src/infrastructures/fs'

const MAX_SANITIZED_LENGTH = 200

function buildFsWithHome(fakeHome: string): InstanceType<typeof FsInfra> {
  const real = new FsInfra()
  const proxy = Object.create(real) as InstanceType<typeof FsInfra>
  proxy.homeDir = (): string => fakeHome
  return proxy
}

function makeMinimalJsonl(): string {
  return JSON.stringify({
    type: 'assistant',
    uuid: 'test-uuid',
    message: {
      content: [{ type: 'text', text: 'hello' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    }
  })
}

function setupJsonlFixture(
  fakeHome: string,
  sessionId: string,
  workingDir: string,
  jsonl: string
): void {
  const sanitized = workingDir.replace(/[^a-zA-Z0-9]/g, '-')
  const projectDir = join(fakeHome, '.claude', 'projects', sanitized)
  mkdirSync(projectDir, { recursive: true })
  writeFileSync(join(projectDir, `${sessionId}.jsonl`), jsonl, 'utf-8')
}

describe('ClaudeSessionRepository (integration)', () => {
  let fakeHome: string
  let repo: ClaudeSessionRepository

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'cs-int-'))
    repo = new ClaudeSessionRepository(buildFsWithHome(fakeHome))
  })

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true })
  })

  // ─── resolveProjectDir (long path) ─────────────────────────────────────

  describe('resolveProjectDir (long path via readSession)', () => {
    const longDir = '/' + 'a'.repeat(250)
    const sanitized = longDir.replace(/[^a-zA-Z0-9]/g, '-')
    const prefix = sanitized.slice(0, MAX_SANITIZED_LENGTH)

    it('readSession succeeds when a matching existing directory with prefix exists', async () => {
      const matchedDirName = `${prefix}-somehash`
      const projectDir = join(fakeHome, '.claude', 'projects', matchedDirName)
      mkdirSync(projectDir, { recursive: true })
      writeFileSync(join(projectDir, 'sess-1.jsonl'), makeMinimalJsonl(), 'utf-8')

      const result = await repo.readSession('sess-1', longDir)

      expect(result.turns).toBeDefined()
    })

    it('goes through sanitizeProjectDir fallback when no prefix match', async () => {
      mkdirSync(join(fakeHome, '.claude', 'projects', 'unrelated'), { recursive: true })

      await expect(repo.readSession('sess-1', longDir)).rejects.toThrow(
        'Claude Code session file not found'
      )
    })
  })

  // ─── findEncodedDirBySessionId ──────────────────────────────────────────

  describe('findEncodedDirBySessionId', () => {
    it('throws when projects directory does not exist', () => {
      expect(() => repo.findEncodedDirBySessionId('any-session')).toThrow(
        'Claude Code projects directory not found'
      )
    })

    it('throws when the same session ID exists in multiple directories', () => {
      const projectsDir = join(fakeHome, '.claude', 'projects')
      mkdirSync(join(projectsDir, 'project-a'), { recursive: true })
      mkdirSync(join(projectsDir, 'project-b'), { recursive: true })
      writeFileSync(join(projectsDir, 'project-a', 'sess-1.jsonl'), '', 'utf-8')
      writeFileSync(join(projectsDir, 'project-b', 'sess-1.jsonl'), '', 'utf-8')

      expect(() => repo.findEncodedDirBySessionId('sess-1')).toThrow('multiple project directories')
    })
  })

  // ─── decodeWorkingDir ──────────────────────────────────────────────────

  describe('decodeWorkingDir', () => {
    let ambigBase: string | undefined

    afterEach(() => {
      if (ambigBase) {
        rmSync(ambigBase, { recursive: true, force: true })
        ambigBase = undefined
      }
    })

    it('returns { path: null, ambiguous: false } when candidate path does not exist', () => {
      expect(repo.decodeWorkingDir('-zzznonexistent')).toEqual({
        path: null,
        ambiguous: false
      })
    })

    it('returns { path: null, ambiguous: true } when multiple candidate paths exist', () => {
      ambigBase = mkdtempSync('/tmp/ptambig')
      mkdirSync(join(ambigBase, 'a', 'b'), { recursive: true })
      mkdirSync(join(ambigBase, 'a-b'), { recursive: true })

      const baseName = ambigBase.split('/').pop()!
      const encoded = `-tmp-${baseName}-a-b`

      expect(repo.decodeWorkingDir(encoded)).toEqual({
        path: null,
        ambiguous: true
      })
    })
  })

  // ─── readSession ───────────────────────────────────────────────────────

  describe('readSession', () => {
    it('throws when JSONL file does not exist', async () => {
      await expect(repo.readSession('nonexistent', '/work')).rejects.toThrow(
        'Claude Code session file not found'
      )
    })
  })

  // ─── scanSessionStats ─────────────────────────────────────────────────

  describe('scanSessionStats', () => {
    it('throws when JSONL file does not exist', async () => {
      await expect(repo.scanSessionStats('nonexistent', '/work')).rejects.toThrow(
        'Claude Code session file not found'
      )
    })

    it('returns stats from valid JSONL', async () => {
      setupJsonlFixture(fakeHome, 'sess-1', '/work', makeMinimalJsonl())

      const stats = await repo.scanSessionStats('sess-1', '/work')

      expect(stats.apiCalls).toBe(1)
      expect(stats.tokens.totalInput).toBe(10)
      expect(stats.tokens.totalOutput).toBe(5)
    })
  })

  // ─── getAssistantTurns ─────────────────────────────────────────────────

  describe('getAssistantTurns', () => {
    it('throws when JSONL file does not exist', async () => {
      await expect(repo.getAssistantTurns('nonexistent', '/work')).rejects.toThrow(
        'Claude Code session file not found'
      )
    })

    it('extracts and returns text from assistant entries', async () => {
      setupJsonlFixture(fakeHome, 'sess-1', '/work', makeMinimalJsonl())

      const turns = await repo.getAssistantTurns('sess-1', '/work')

      expect(turns).toEqual([{ uuid: 'test-uuid', text: 'hello' }])
    })
  })
})
