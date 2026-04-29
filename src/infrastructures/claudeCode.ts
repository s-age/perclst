import { spawn, spawnSync } from 'child_process'
import type { ChildProcess } from 'child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { APIError } from '@src/errors/apiError'
import { RawExitError } from '@src/errors/rawExitError'
import { APP_NAME, MCP_SERVER_NAME } from '@src/constants/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MCP_SERVER_PATH = resolve(__dirname, '../mcp/server.js')

export class ClaudeCodeInfra {
  readJsonlContent(path: string): string {
    if (!existsSync(path)) return ''
    return readFileSync(path, 'utf-8')
  }

  private writeMcpConfig(): string {
    const path = join(tmpdir(), `${APP_NAME}-mcp-${process.pid}.json`)
    writeFileSync(
      path,
      JSON.stringify({
        mcpServers: { [MCP_SERVER_NAME]: { command: 'node', args: [MCP_SERVER_PATH] } }
      }),
      'utf-8'
    )
    return path
  }

  // eslint-disable-next-line local/max-params
  async *runClaude(
    args: string[],
    prompt: string,
    workingDir: string,
    sessionFilePath?: string,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const mcpConfigPath = this.writeMcpConfig()
    const fullArgs = [
      ...args,
      '--mcp-config',
      mcpConfigPath,
      '--permission-prompt-tool',
      `mcp__${MCP_SERVER_NAME}__ask_permission`
    ]

    const env: NodeJS.ProcessEnv = { ...process.env }
    if (sessionFilePath) env.PERCLST_SESSION_FILE = sessionFilePath
    const child = spawn('claude', fullArgs, {
      env,
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    const { closePromise, errors } = this.attachChildHandlers(child)

    const onAbort = (): void => {
      if (!child.killed) child.kill('SIGTERM')
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    child.stdin.write(prompt, 'utf-8')
    child.stdin.end()
    try {
      yield* this.streamStdout(child.stdout)
    } finally {
      signal?.removeEventListener('abort', onAbort)
      if (child.exitCode === null && !child.killed) child.kill()
      try {
        unlinkSync(mcpConfigPath)
      } catch {
        /* ignore */
      }
    }

    if (signal?.aborted) return
    if (errors.spawnError) throw errors.spawnError
    const exitCode = await closePromise
    if (exitCode !== 0) throw new RawExitError(exitCode, errors.stderr)
  }

  private attachChildHandlers(child: ChildProcess): {
    closePromise: Promise<number | null>
    errors: { stderr: string; spawnError: Error | null }
  } {
    const errors = { stderr: '', spawnError: null as Error | null }
    const closePromise = new Promise<number | null>((res) => {
      child.on('close', (code) => res(code))
    })
    child.on('error', (err) => {
      errors.spawnError = new APIError(`Failed to spawn claude: ${err.message}`)
    })
    const STDERR_TAIL_MAX = 16 * 1024
    child.stderr!.on('data', (chunk: Buffer) => {
      errors.stderr += chunk.toString()
      if (errors.stderr.length > STDERR_TAIL_MAX * 2) {
        errors.stderr = errors.stderr.slice(-STDERR_TAIL_MAX)
      }
    })
    return { closePromise, errors }
  }

  spawnInteractive(args: string[]): void {
    spawnSync('claude', args, { stdio: 'inherit' })
  }

  writeStderr(data: string): void {
    process.stderr.write(data)
  }

  private async *streamStdout(stdout: NodeJS.ReadableStream): AsyncGenerator<string> {
    let buffer = ''
    for await (const chunk of stdout) {
      buffer += (chunk as Buffer).toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim()) yield line
      }
    }
    if (buffer.trim()) yield buffer
  }
}
