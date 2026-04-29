import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { ClaudeSessionRepository } from '../../claudeSessions'
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

    it('prefix マッチする既存ディレクトリがあるとき readSession が成功する', () => {
      const matchedDirName = `${prefix}-somehash`
      const projectDir = join(fakeHome, '.claude', 'projects', matchedDirName)
      mkdirSync(projectDir, { recursive: true })
      writeFileSync(join(projectDir, 'sess-1.jsonl'), makeMinimalJsonl(), 'utf-8')

      const result = repo.readSession('sess-1', longDir)

      expect(result.turns).toBeDefined()
    })

    it('prefix マッチなしで sanitizeProjectDir フォールバックを経由する', () => {
      mkdirSync(join(fakeHome, '.claude', 'projects', 'unrelated'), { recursive: true })

      expect(() => repo.readSession('sess-1', longDir)).toThrow(
        'Claude Code session file not found'
      )
    })
  })

  // ─── findEncodedDirBySessionId ──────────────────────────────────────────

  describe('findEncodedDirBySessionId', () => {
    it('projects ディレクトリが存在しないとき throw する', () => {
      expect(() => repo.findEncodedDirBySessionId('any-session')).toThrow(
        'Claude Code projects directory not found'
      )
    })

    it('同一セッション ID が複数ディレクトリに存在するとき throw する', () => {
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

    it('候補パスが存在しないとき { path: null, ambiguous: false } を返す', () => {
      expect(repo.decodeWorkingDir('-zzznonexistent')).toEqual({
        path: null,
        ambiguous: false
      })
    })

    it('複数候補パスが存在するとき { path: null, ambiguous: true } を返す', () => {
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
    it('JSONL ファイルが存在しないとき throw する', () => {
      expect(() => repo.readSession('nonexistent', '/work')).toThrow(
        'Claude Code session file not found'
      )
    })
  })

  // ─── scanSessionStats ─────────────────────────────────────────────────

  describe('scanSessionStats', () => {
    it('JSONL ファイルが存在しないとき throw する', () => {
      expect(() => repo.scanSessionStats('nonexistent', '/work')).toThrow(
        'Claude Code session file not found'
      )
    })

    it('有効な JSONL から stats を返す', () => {
      setupJsonlFixture(fakeHome, 'sess-1', '/work', makeMinimalJsonl())

      const stats = repo.scanSessionStats('sess-1', '/work')

      expect(stats.apiCalls).toBe(1)
      expect(stats.tokens.totalInput).toBe(10)
      expect(stats.tokens.totalOutput).toBe(5)
    })
  })

  // ─── getAssistantTurns ─────────────────────────────────────────────────

  describe('getAssistantTurns', () => {
    it('JSONL ファイルが存在しないとき throw する', () => {
      expect(() => repo.getAssistantTurns('nonexistent', '/work')).toThrow(
        'Claude Code session file not found'
      )
    })

    it('assistant エントリからテキストを抽出して返す', () => {
      setupJsonlFixture(fakeHome, 'sess-1', '/work', makeMinimalJsonl())

      const turns = repo.getAssistantTurns('sess-1', '/work')

      expect(turns).toEqual([{ uuid: 'test-uuid', text: 'hello' }])
    })
  })
})
