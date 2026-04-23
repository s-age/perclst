import { spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { homedir, tmpdir } from 'os'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { ClaudeAction } from '@src/types/claudeCode'
import { APIError } from '@src/errors/apiError'
import { RawExitError } from '@src/errors/rawExitError'
import { APP_NAME, MCP_SERVER_NAME } from '@src/constants/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MCP_SERVER_PATH = resolve(__dirname, '../mcp/server.js')

// Internal infrastructure adapter — consumed exclusively by ClaudeCodeRepository in agentRepository.ts
export class ClaudeCodeInfra {
  resolveJsonlPath(sessionId: string, workingDir: string): string {
    const encoded = workingDir.replace(/\//g, '-')
    return join(homedir(), '.claude', 'projects', encoded, `${sessionId}.jsonl`)
  }

  countJsonlLines(path: string): number {
    if (!existsSync(path)) return 0
    return readFileSync(path, 'utf-8')
      .split('\n')
      .filter((l) => l.trim()).length
  }

  buildArgs(action: ClaudeAction): string[] {
    const args: string[] = ['-p', '--output-format', 'stream-json', '--verbose']
    if (action.model) args.push('--model', action.model)
    if (action.type === 'resume') {
      args.push('--resume', action.sessionId)
    } else if (action.type === 'fork') {
      args.push('--resume', action.originalClaudeSessionId)
      args.push('--fork-session')
      args.push('--session-id', action.sessionId)
      if (action.resumeSessionAt) args.push('--resume-session-at', action.resumeSessionAt)
    } else {
      args.push('--session-id', action.sessionId)
      if (action.system) args.push('--system-prompt', action.system)
    }
    if (action.allowedTools?.length) args.push('--allowedTools', ...action.allowedTools)
    if (action.disallowedTools?.length) args.push('--disallowedTools', ...action.disallowedTools)
    return args
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
    let stderr = ''
    let spawnError: Error | null = null
    const closePromise = new Promise<number | null>((res) => {
      child.on('close', (code) => res(code))
    })
    child.on('error', (err) => {
      spawnError = new APIError(`Failed to spawn claude: ${err.message}`)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

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
    if (spawnError) throw spawnError
    const exitCode = await closePromise
    if (exitCode !== 0) throw new RawExitError(exitCode, stderr)
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
