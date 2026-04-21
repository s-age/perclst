import { vi, describe, it, expect, beforeEach } from 'vitest'
import { join } from 'path'
import { APIError } from '@src/errors/apiError'
import { RawExitError } from '@src/errors/rawExitError'
import { APP_NAME, MCP_SERVER_NAME } from '@src/constants/config'

// ---------------------------------------------------------------------------
// Hoisted mocks — available before any vi.mock() factory runs
// ---------------------------------------------------------------------------
const { mocks } = vi.hoisted(() => ({
  mocks: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    homedir: vi.fn(),
    tmpdir: vi.fn(),
    spawn: vi.fn()
  }
}))

vi.mock('fs', () => ({
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync,
  writeFileSync: mocks.writeFileSync,
  unlinkSync: mocks.unlinkSync
}))

vi.mock('os', () => ({
  homedir: mocks.homedir,
  tmpdir: mocks.tmpdir
}))

vi.mock('child_process', () => ({
  spawn: mocks.spawn
}))

import { ClaudeCodeInfra } from '../claudeCode.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Drain an async generator into an array. */
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

/**
 * Builds a minimal mock child-process that satisfies the parts of ChildProcess
 * used by ClaudeCodeInfra.runClaude.
 *
 * Event handler strategy:
 *  - 'close' handler is fired synchronously when registered so closePromise
 *    resolves immediately — by the time runClaude does `await closePromise`
 *    it is already settled.
 *  - 'error' handler is fired synchronously when registered so spawnError is
 *    set before the `if (spawnError) throw spawnError` check.
 */
function makeChild(options: ChildOptions = {}) {
  const { stdoutChunks = [], exitCode = 0, triggerError, stderrData } = options

  return {
    stdin: { write: vi.fn(), end: vi.fn() },
    stdout: (async function* () {
      for (const chunk of stdoutChunks) yield Buffer.from(chunk)
    })(),
    stderr: {
      on: vi.fn().mockImplementation((event: string, handler: (chunk: Buffer) => void) => {
        if (event === 'data' && stderrData) handler(Buffer.from(stderrData))
      })
    },
    on: vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'close') handler(exitCode)
      if (event === 'error' && triggerError) handler(triggerError)
    }),
    exitCode,
    killed: false,
    kill: vi.fn()
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClaudeCodeInfra', () => {
  let infra: ClaudeCodeInfra

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.tmpdir.mockReturnValue('/tmp')
    infra = new ClaudeCodeInfra()
  })

  // -------------------------------------------------------------------------
  describe('resolveJsonlPath', () => {
    it('should build the correct JSONL path by encoding forward-slashes in workingDir', () => {
      mocks.homedir.mockReturnValue('/home/testuser')

      const result = infra.resolveJsonlPath('abc123', '/work/my-project')

      const expected = join(
        '/home/testuser',
        '.claude',
        'projects',
        '-work-my-project',
        'abc123.jsonl'
      )
      expect(result).toBe(expected)
    })
  })

  // -------------------------------------------------------------------------
  describe('countJsonlLines', () => {
    it('should return 0 when the file does not exist', () => {
      mocks.existsSync.mockReturnValue(false)

      expect(infra.countJsonlLines('/sessions/missing.jsonl')).toBe(0)
    })

    it('should return the count of non-empty lines when the file exists', () => {
      mocks.existsSync.mockReturnValue(true)
      mocks.readFileSync.mockReturnValue('line1\nline2\n\nline3\n')

      expect(infra.countJsonlLines('/sessions/sess.jsonl')).toBe(3)
    })
  })

  // -------------------------------------------------------------------------
  describe('buildArgs', () => {
    it('should include -p flag for a start action', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 'sess1',
        prompt: 'p',
        workingDir: '/w'
      })
      expect(result).toContain('-p')
    })

    it('should include --output-format flag for a start action', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 'sess1',
        prompt: 'p',
        workingDir: '/w'
      })
      expect(result).toContain('--output-format')
    })

    it('should include stream-json as output format value for a start action', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 'sess1',
        prompt: 'p',
        workingDir: '/w'
      })
      expect(result).toContain('stream-json')
    })

    it('should include --verbose flag for a start action', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 'sess1',
        prompt: 'p',
        workingDir: '/w'
      })
      expect(result).toContain('--verbose')
    })

    it('should include --session-id for a start action', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 'my-session',
        prompt: 'p',
        workingDir: '/w'
      })

      const idx = result.indexOf('--session-id')
      expect(result[idx + 1]).toBe('my-session')
    })

    it('should include --model when model is provided', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 's1',
        prompt: 'p',
        workingDir: '/w',
        model: 'claude-opus'
      })

      const idx = result.indexOf('--model')
      expect(result[idx + 1]).toBe('claude-opus')
    })

    it('should include --system-prompt when system is set on a start action', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 's1',
        prompt: 'p',
        workingDir: '/w',
        system: 'You are helpful'
      })

      const idx = result.indexOf('--system-prompt')
      expect(result[idx + 1]).toBe('You are helpful')
    })

    it('should include --allowedTools flag when allowedTools is non-empty', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 's1',
        prompt: 'p',
        workingDir: '/w',
        allowedTools: ['Bash', 'Read']
      })
      expect(result).toContain('--allowedTools')
    })

    it('should include Bash in args when Bash is in allowedTools', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 's1',
        prompt: 'p',
        workingDir: '/w',
        allowedTools: ['Bash', 'Read']
      })
      expect(result).toContain('Bash')
    })

    it('should include Read in args when Read is in allowedTools', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 's1',
        prompt: 'p',
        workingDir: '/w',
        allowedTools: ['Bash', 'Read']
      })
      expect(result).toContain('Read')
    })

    it('should not include --allowedTools when allowedTools is not provided', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 's1',
        prompt: 'p',
        workingDir: '/w'
      })
      expect(result).not.toContain('--allowedTools')
    })

    it('should include --disallowedTools flag when disallowedTools is non-empty', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 's1',
        prompt: 'p',
        workingDir: '/w',
        disallowedTools: ['Write']
      })
      expect(result).toContain('--disallowedTools')
    })

    it('should include each disallowed tool name when disallowedTools is non-empty', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 's1',
        prompt: 'p',
        workingDir: '/w',
        disallowedTools: ['Write']
      })
      expect(result).toContain('Write')
    })

    it('should not include --disallowedTools when disallowedTools is not provided', () => {
      const result = infra.buildArgs({
        type: 'start',
        sessionId: 's1',
        prompt: 'p',
        workingDir: '/w'
      })
      expect(result).not.toContain('--disallowedTools')
    })

    it('should use --resume with sessionId for a resume action', () => {
      const result = infra.buildArgs({
        type: 'resume',
        sessionId: 'resume-sess',
        prompt: 'p',
        workingDir: '/w'
      })

      const idx = result.indexOf('--resume')
      expect(result[idx + 1]).toBe('resume-sess')
    })

    it('should not include --session-id for a resume action', () => {
      const result = infra.buildArgs({
        type: 'resume',
        sessionId: 'r1',
        prompt: 'p',
        workingDir: '/w'
      })

      expect(result).not.toContain('--session-id')
    })

    it('should use originalClaudeSessionId as the --resume value for a fork action', () => {
      const result = infra.buildArgs({
        type: 'fork',
        originalClaudeSessionId: 'orig-sess',
        originalWorkingDir: '/orig',
        sessionId: 'fork-sess',
        prompt: 'p',
        workingDir: '/w'
      })

      const idx = result.indexOf('--resume')
      expect(result[idx + 1]).toBe('orig-sess')
    })

    it('should include --fork-session flag for a fork action', () => {
      const result = infra.buildArgs({
        type: 'fork',
        originalClaudeSessionId: 'orig-sess',
        originalWorkingDir: '/orig',
        sessionId: 'fork-sess',
        prompt: 'p',
        workingDir: '/w'
      })

      expect(result).toContain('--fork-session')
    })

    it('should include --session-id with the fork sessionId for a fork action', () => {
      const result = infra.buildArgs({
        type: 'fork',
        originalClaudeSessionId: 'orig',
        originalWorkingDir: '/orig',
        sessionId: 'fork-sess',
        prompt: 'p',
        workingDir: '/w'
      })

      const idx = result.indexOf('--session-id')
      expect(result[idx + 1]).toBe('fork-sess')
    })

    it('should include --resume-session-at when resumeSessionAt is set on a fork action', () => {
      const result = infra.buildArgs({
        type: 'fork',
        originalClaudeSessionId: 'orig',
        originalWorkingDir: '/orig',
        sessionId: 'fork',
        prompt: 'p',
        workingDir: '/w',
        resumeSessionAt: 'turn-5'
      })

      const idx = result.indexOf('--resume-session-at')
      expect(result[idx + 1]).toBe('turn-5')
    })

    it('should not include --resume-session-at when resumeSessionAt is absent on a fork action', () => {
      const result = infra.buildArgs({
        type: 'fork',
        originalClaudeSessionId: 'orig',
        originalWorkingDir: '/orig',
        sessionId: 'fork',
        prompt: 'p',
        workingDir: '/w'
      })

      expect(result).not.toContain('--resume-session-at')
    })
  })

  // -------------------------------------------------------------------------
  describe('runClaude', () => {
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
      const config = JSON.parse(written) as {
        mcpServers: Record<string, { command: string }>
      }
      expect(config.mcpServers[MCP_SERVER_NAME].command).toBe('node')
    })

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

    it('should filter out whitespace-only lines from stdout', async () => {
      const child = makeChild({ stdoutChunks: ['line1\n   \nline2\n'] })
      mocks.spawn.mockReturnValue(child)

      const results = await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      expect(results).toEqual(['line1', 'line2'])
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

    it('should set PERCLST_SESSION_FILE env var when sessionFilePath is provided', async () => {
      const child = makeChild()
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p'], 'prompt', '/work', '/sessions/sess.json'))

      const spawnEnv = mocks.spawn.mock.calls[0][2].env as NodeJS.ProcessEnv
      expect(spawnEnv['PERCLST_SESSION_FILE']).toBe('/sessions/sess.json')
    })

    it('should not set PERCLST_SESSION_FILE when sessionFilePath is omitted', async () => {
      // Clear any ambient value so the spread does not accidentally include it
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

    it('should call unlinkSync to clean up the MCP config file', async () => {
      const child = makeChild()
      mocks.spawn.mockReturnValue(child)

      await collectAll(infra.runClaude(['-p'], 'prompt', '/work'))

      expect(mocks.unlinkSync).toHaveBeenCalledWith(expect.stringMatching(/perclst-mcp-\d+\.json$/))
    })

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

    it('should still call unlinkSync when the process throws an error', async () => {
      const child = makeChild({
        triggerError: new Error('spawn error'),
        exitCode: null
      })
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

  // -------------------------------------------------------------------------
  describe('writeStderr', () => {
    it('should write the data string to process.stderr', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)

      infra.writeStderr('error output')

      expect(writeSpy).toHaveBeenCalledWith('error output')
      writeSpy.mockRestore()
    })
  })

  // -------------------------------------------------------------------------
  describe('writeMcpConfig', () => {
    it('should return a path located under the system temp directory', () => {
      mocks.tmpdir.mockReturnValue('/tmp')

      const result = (infra as unknown as { writeMcpConfig(): string }).writeMcpConfig()

      expect(result.startsWith('/tmp')).toBe(true)
    })

    it('should embed the current process pid in the returned filename', () => {
      mocks.tmpdir.mockReturnValue('/tmp')

      const result = (infra as unknown as { writeMcpConfig(): string }).writeMcpConfig()

      expect(result).toContain(String(process.pid))
    })

    it('should embed APP_NAME in the returned filename', () => {
      mocks.tmpdir.mockReturnValue('/tmp')

      const result = (infra as unknown as { writeMcpConfig(): string }).writeMcpConfig()

      expect(result).toContain(APP_NAME)
    })

    it('should call writeFileSync with the returned path', () => {
      mocks.tmpdir.mockReturnValue('/tmp')

      const result = (infra as unknown as { writeMcpConfig(): string }).writeMcpConfig()

      expect(mocks.writeFileSync).toHaveBeenCalledWith(result, expect.any(String), 'utf-8')
    })

    it('should write valid JSON to the config file', () => {
      mocks.tmpdir.mockReturnValue('/tmp')
      ;(infra as unknown as { writeMcpConfig(): string }).writeMcpConfig()

      const written = mocks.writeFileSync.mock.calls[0][1] as string
      expect(() => JSON.parse(written)).not.toThrow()
    })

    it('should include the MCP server name as a key under mcpServers in the written JSON', () => {
      mocks.tmpdir.mockReturnValue('/tmp')
      ;(infra as unknown as { writeMcpConfig(): string }).writeMcpConfig()

      const written = mocks.writeFileSync.mock.calls[0][1] as string
      const config = JSON.parse(written) as { mcpServers: Record<string, unknown> }
      expect(config.mcpServers).toHaveProperty(MCP_SERVER_NAME)
    })

    it('should set the MCP server command to "node" in the written config', () => {
      mocks.tmpdir.mockReturnValue('/tmp')
      ;(infra as unknown as { writeMcpConfig(): string }).writeMcpConfig()

      const written = mocks.writeFileSync.mock.calls[0][1] as string
      const config = JSON.parse(written) as {
        mcpServers: Record<string, { command: string }>
      }
      expect(config.mcpServers[MCP_SERVER_NAME].command).toBe('node')
    })
  })

  // -------------------------------------------------------------------------
  describe('streamStdout', () => {
    /** Helper: collect all yielded lines from streamStdout given raw string chunks. */
    async function collectStream(chunks: string[]): Promise<string[]> {
      async function* makeReadable(): AsyncGenerator<Buffer> {
        for (const chunk of chunks) yield Buffer.from(chunk)
      }
      const results: string[] = []
      const gen = (
        infra as unknown as { streamStdout(s: AsyncIterable<Buffer>): AsyncGenerator<string> }
      ).streamStdout(makeReadable())
      for await (const line of gen) results.push(line)
      return results
    }

    it('should yield nothing when stdout emits no chunks', async () => {
      const results = await collectStream([])

      expect(results).toEqual([])
    })

    it('should yield each newline-terminated line from a single chunk', async () => {
      const results = await collectStream(['foo\nbar\n'])

      expect(results).toEqual(['foo', 'bar'])
    })

    it('should reassemble a line split across two consecutive chunks', async () => {
      const results = await collectStream(['hel', 'lo\n'])

      expect(results).toEqual(['hello'])
    })

    it('should yield a trailing line that has no terminating newline', async () => {
      const results = await collectStream(['line1\nline2'])

      expect(results).toEqual(['line1', 'line2'])
    })

    it('should not yield whitespace-only lines', async () => {
      const results = await collectStream(['line1\n   \nline2\n'])

      expect(results).toEqual(['line1', 'line2'])
    })

    it('should not yield an empty trailing buffer when the last chunk ends with a newline', async () => {
      const results = await collectStream(['line1\n'])

      expect(results).toEqual(['line1'])
    })
  })
})
