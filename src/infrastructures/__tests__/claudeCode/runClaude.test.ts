import { vi, describe, it, expect, beforeEach } from 'vitest'
import { APIError } from '@src/errors/apiError'
import { RawExitError } from '@src/errors/rawExitError'
import { MCP_SERVER_NAME } from '@src/constants/config'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    tmpdir: vi.fn(),
    spawn: vi.fn()
  }
}))

vi.mock('fs', () => ({
  writeFileSync: mocks.writeFileSync,
  unlinkSync: mocks.unlinkSync
}))

vi.mock('os', () => ({
  tmpdir: mocks.tmpdir
}))

vi.mock('child_process', () => ({
  spawn: mocks.spawn
}))

import { ClaudeCodeInfra } from '../../claudeCode.js'

async function collectAll(gen: AsyncGenerator<string>): Promise<string[]> {
  const results: string[] = []
  for await (const val of gen) results.push(val)
  return results
}

type ChildOptions = {
  stdoutChunks?: string[]
  exitCode?: number | null
  triggerError?: Error
  stderrData?: string
}

// 'close' and 'error' handlers fire synchronously so closePromise/spawnError
// are settled before runClaude's await.
function makeChild(options: ChildOptions = {}): {
  stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }
  stdout: AsyncGenerator<Buffer, void, unknown>
  stderr: { on: ReturnType<typeof vi.fn> }
  on: ReturnType<typeof vi.fn>
  exitCode: number | null
  killed: boolean
  kill: ReturnType<typeof vi.fn>
} {
  const { stdoutChunks = [], exitCode = 0, triggerError, stderrData } = options

  return {
    stdin: { write: vi.fn(), end: vi.fn() },
    stdout: (async function* (): AsyncGenerator<Buffer, void, unknown> {
      for (const chunk of stdoutChunks) yield Buffer.from(chunk)
    })(),
    stderr: {
      on: vi.fn().mockImplementation((event: string, handler: (chunk: Buffer) => void): void => {
        if (event === 'data' && stderrData) handler(Buffer.from(stderrData))
      })
    },
    on: vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void): void => {
      if (event === 'close') handler(exitCode)
      if (event === 'error' && triggerError) handler(triggerError)
    }),
    exitCode,
    killed: false,
    kill: vi.fn()
  }
}

describe('ClaudeCodeInfra', () => {
  let infra: ClaudeCodeInfra

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.tmpdir.mockReturnValue('/tmp')
    infra = new ClaudeCodeInfra()
  })

  describe('runClaude', () => {
    // ── stdout streaming ──────────────────────────────────────────────────────

    it('should yield lines parsed from stdout', async () => {
      const child = makeChild({ stdoutChunks: ['hello\nworld\n'] })
      mocks.spawn.mockReturnValue(child)

      const results = await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      expect(results).toEqual(['hello', 'world'])
    })

    it('should reassemble lines that are split across multiple stdout chunks', async () => {
      const child = makeChild({ stdoutChunks: ['par', 'tial\ncomplete\n'] })
      mocks.spawn.mockReturnValue(child)

      const results = await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      expect(results).toEqual(['partial', 'complete'])
    })

    it('should yield a trailing line that has no terminating newline', async () => {
      const child = makeChild({ stdoutChunks: ['line1\nline2'] })
      mocks.spawn.mockReturnValue(child)

      const results = await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      expect(results).toEqual(['line1', 'line2'])
    })

    it('should filter out whitespace-only lines from stdout', async () => {
      const child = makeChild({ stdoutChunks: ['line1\n   \nline2\n'] })
      mocks.spawn.mockReturnValue(child)

      const results = await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      expect(results).toEqual(['line1', 'line2'])
    })

    // ── stdin ─────────────────────────────────────────────────────────────────

    it('should write the prompt to child stdin', async () => {
      const child = makeChild()
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p'], 'my prompt', '/work'))

      expect(child.stdin.write).toHaveBeenCalledWith('my prompt', 'utf-8')
    })

    it('should close child stdin after writing the prompt', async () => {
      const child = makeChild()
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      expect(child.stdin.end).toHaveBeenCalledTimes(1)
    })

    // ── MCP config ────────────────────────────────────────────────────────────

    it('should write the MCP config JSON to a temp file before spawning', async () => {
      const child = makeChild()
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      expect(mocks.writeFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/perclst-mcp-\d+\.json$/),
        expect.stringContaining('"mcpServers"'),
        'utf-8'
      )
    })

    it('should include the MCP server name as the key in the written config', async () => {
      const child = makeChild()
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      const written = mocks.writeFileSync.mock.calls[0][1] as string
      const config = JSON.parse(written) as { mcpServers: Record<string, unknown> }
      expect(config.mcpServers).toHaveProperty(MCP_SERVER_NAME)
    })

    it('should set the MCP server command to "node" in the written config', async () => {
      const child = makeChild()
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      const written = mocks.writeFileSync.mock.calls[0][1] as string
      const config = JSON.parse(written) as { mcpServers: Record<string, { command: string }> }
      expect(config.mcpServers[MCP_SERVER_NAME].command).toBe('node')
    })

    // ── spawn call ────────────────────────────────────────────────────────────

    it('should spawn claude with the provided args and MCP config args', async () => {
      const child = makeChild()
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p', '--session-id', 'abc'], 'prompt', '/work'))

      expect(mocks.spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['-p', '--session-id', 'abc', '--mcp-config', expect.any(String)]),
        expect.objectContaining({ cwd: '/work' })
      )
    })

    it('should pass --permission-prompt-tool to spawn', async () => {
      const child = makeChild()
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      expect(mocks.spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining([
          '--permission-prompt-tool',
          expect.stringContaining('__ask_permission')
        ]),
        expect.anything()
      )
    })

    // ── PERCLST_SESSION_FILE ──────────────────────────────────────────────────

    it('should set PERCLST_SESSION_FILE env var when sessionFilePath is provided', async () => {
      const child = makeChild()
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p'], 'prompt', '/work', '/sessions/sess.json'))

      const spawnEnv = mocks.spawn.mock.calls[0][2].env as NodeJS.ProcessEnv
      expect(spawnEnv['PERCLST_SESSION_FILE']).toBe('/sessions/sess.json')
    })

    it('should not set PERCLST_SESSION_FILE when sessionFilePath is omitted', async () => {
      const saved = process.env['PERCLST_SESSION_FILE']
      delete process.env['PERCLST_SESSION_FILE']
      try {
        const child = makeChild()
        mocks.spawn.mockReturnValue(child)

        await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

        const spawnEnv = mocks.spawn.mock.calls[0][2].env as NodeJS.ProcessEnv
        expect(spawnEnv['PERCLST_SESSION_FILE']).toBeUndefined()
      } finally {
        if (saved !== undefined) process.env['PERCLST_SESSION_FILE'] = saved
      }
    })

    // ── cleanup ───────────────────────────────────────────────────────────────

    it('should call unlinkSync to clean up the MCP config file', async () => {
      const child = makeChild()
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      expect(mocks.unlinkSync).toHaveBeenCalledWith(expect.stringMatching(/perclst-mcp-\d+\.json$/))
    })

    it('should still call unlinkSync when the process throws an error', async () => {
      const child = makeChild({ triggerError: new Error('spawn error'), exitCode: null })
      mocks.spawn.mockReturnValue(child)

      await expect(collectAll(infra.runClaude(['-p'], 'prompt', '/work'))).rejects.toThrow()

      expect(mocks.unlinkSync).toHaveBeenCalledTimes(1)
    })

    it('should kill the child process when it has not yet exited', async () => {
      const child = makeChild({ triggerError: new Error('spawn error'), exitCode: null })
      mocks.spawn.mockReturnValue(child)

      await expect(collectAll(infra.runClaude(['-p'], 'prompt', '/work'))).rejects.toThrow()

      expect(child.kill).toHaveBeenCalledTimes(1)
    })

    it('should not kill the child process when it has already exited cleanly', async () => {
      const child = makeChild({ exitCode: 0 })
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      expect(child.kill).not.toHaveBeenCalled()
    })

    // ── error handling ────────────────────────────────────────────────────────

    it('should throw RawExitError when the process exits with a non-zero code', async () => {
      const child = makeChild({ exitCode: 1 })
      mocks.spawn.mockReturnValue(child)

      await expect(collectAll(infra.runClaude(['-p'], 'prompt', '/work'))).rejects.toThrow(
        RawExitError
      )
    })

    it('should include the exit code in the RawExitError', async () => {
      const child = makeChild({ exitCode: 42 })
      mocks.spawn.mockReturnValue(child)

      await expect(collectAll(infra.runClaude(['-p'], 'prompt', '/work'))).rejects.toThrow(
        'claude exited with code 42'
      )
    })

    it('should throw APIError when the child process fails to spawn', async () => {
      const child = makeChild({
        triggerError: new Error('ENOENT: no such file or directory'),
        exitCode: null
      })
      mocks.spawn.mockReturnValue(child)

      await expect(collectAll(infra.runClaude(['-p'], 'prompt', '/work'))).rejects.toThrow(APIError)
    })

    it('should pass captured stderr to the RawExitError stderr property', async () => {
      const child = makeChild({ exitCode: 1, stderrData: 'something went wrong' })
      mocks.spawn.mockReturnValue(child)

      let caught: unknown
      try {
        await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))
      } catch (err) {
        caught = err
      }
      expect(caught).toBeInstanceOf(RawExitError)
      expect((caught as RawExitError).stderr).toBe('something went wrong')
    })
  })
})
