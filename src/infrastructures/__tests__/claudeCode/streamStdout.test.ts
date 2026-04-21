import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mocks } = vi.hoisted(() => ({
  mocks: { tmpdir: vi.fn() }
}))

vi.mock('os', () => ({
  tmpdir: mocks.tmpdir
}))

import { ClaudeCodeInfra } from '../../claudeCode.js'

type InfraWithPrivate = { streamStdout(s: AsyncIterable<Buffer>): AsyncGenerator<string> }

describe('ClaudeCodeInfra', () => {
  let infra: ClaudeCodeInfra

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.tmpdir.mockReturnValue('/tmp')
    infra = new ClaudeCodeInfra()
  })

  describe('streamStdout', () => {
    async function collectStream(chunks: string[]): Promise<string[]> {
      async function* makeReadable(): AsyncGenerator<Buffer> {
        for (const chunk of chunks) yield Buffer.from(chunk)
      }
      const results: string[] = []
      for await (const line of (infra as unknown as InfraWithPrivate).streamStdout(
        makeReadable()
      )) {
        results.push(line)
      }
      return results
    }

    it('should yield nothing when stdout emits no chunks', async () => {
      expect(await collectStream([])).toEqual([])
    })

    it('should yield each newline-terminated line from a single chunk', async () => {
      expect(await collectStream(['foo\nbar\n'])).toEqual(['foo', 'bar'])
    })

    it('should reassemble a line split across two consecutive chunks', async () => {
      expect(await collectStream(['hel', 'lo\n'])).toEqual(['hello'])
    })

    it('should yield a trailing line that has no terminating newline', async () => {
      expect(await collectStream(['line1\nline2'])).toEqual(['line1', 'line2'])
    })

    it('should not yield whitespace-only lines', async () => {
      expect(await collectStream(['line1\n   \nline2\n'])).toEqual(['line1', 'line2'])
    })

    it('should not yield an empty trailing buffer when the last chunk ends with a newline', async () => {
      expect(await collectStream(['line1\n'])).toEqual(['line1'])
    })
  })
})
