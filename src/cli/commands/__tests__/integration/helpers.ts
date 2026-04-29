import { vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { stringify } from 'yaml'
import { FsInfra } from '@src/infrastructures/fs'
import type { Infras } from '@src/core/di/setupInfrastructures'
export { makeTmpDir, buildTestConfig } from '@src/__tests__/helpers'

/** Minimal JSONL fixture — 2 lines where RawOutput.content = text */
export function makeResultLines(text: string): string[] {
  return [
    JSON.stringify({
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text }],
        usage: { input_tokens: 10, output_tokens: 5 }
      }
    }),
    JSON.stringify({
      type: 'result',
      result: text,
      usage: { input_tokens: 10, output_tokens: 5 }
    })
  ]
}

/** 4 line fixture with tool_use → tool_result → text → result */
export function makeToolResultLines(
  tool: { id: string; name: string; input: unknown; result: string },
  finalText: string
): string[] {
  return [
    JSON.stringify({
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'tool_use', id: tool.id, name: tool.name, input: tool.input }],
        usage: { input_tokens: 10, output_tokens: 5 }
      }
    }),
    JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: tool.id, content: tool.result }]
      }
    }),
    ...makeResultLines(finalText)
  ]
}

/**
 * Stub for ClaudeCodeInfra.
 * Only replaces `runClaude`, rest are minimal no-ops.
 * Wrapped with vi.fn() so call arguments can be verified.
 */
export function buildClaudeCodeStub(lines: string[]): Infras['claudeCodeInfra'] {
  const runClaude = vi.fn(async function* (): AsyncGenerator<string> {
    for (const line of lines) yield line
  })

  return {
    resolveJsonlPath: vi.fn(() => '/dev/null'),
    readJsonlContent: vi.fn(() => ''),
    buildArgs: vi.fn(() => ['-p']),
    runClaude,
    spawnInteractive: vi.fn(),
    writeStderr: vi.fn()
  } as unknown as Infras['claudeCodeInfra']
}

/**
 * Stub for KnowledgeReaderInfra.
 * When hasDraft=true, behaves as if files exist in the draft directory.
 */
export function buildKnowledgeReaderStub(hasDraft: boolean): Infras['knowledgeReaderInfra'] {
  return {
    listFilesRecursive: vi.fn((dir: string) =>
      hasDraft && dir.endsWith('/draft')
        ? [{ absolute: `${dir}/entry.md`, relative: 'entry.md' }]
        : []
    ),
    readTextFile: vi.fn(() => '# Stub entry\n\nstub content')
  } as unknown as Infras['knowledgeReaderInfra']
}

/**
 * Stub for GitInfra.
 * Switches return values based on execGitSync argument patterns.
 * Stubbed at the infra layer (not service layer) to let real code in
 * GitRepository / PipelineFileDomain / PipelineFileService pass through.
 */
export function buildGitInfraStub(opts?: {
  diff?: string | null
  diffStat?: string | null
  head?: string | null | (string | null)[]
  diffSummary?: string | null
}): Infras['gitInfra'] {
  let headCallCount = 0
  const headValues = Array.isArray(opts?.head) ? opts.head : [opts?.head ?? null]

  return {
    execGitSync: vi.fn((args: string[]) => {
      const sub = args[0]
      if (sub === 'diff' && args.includes('--stat') && !args.some((a) => a.includes('...'))) {
        return opts?.diffStat ?? ''
      }
      if (sub === 'rev-parse') {
        return headValues[headCallCount++ % headValues.length] ?? ''
      }
      if (sub === 'diff' && args.includes('--stat')) return opts?.diffSummary ?? ''
      if (sub === 'diff') return opts?.diff ?? ''
      return ''
    }),
    spawnGitSync: vi.fn(() => '')
  } as unknown as Infras['gitInfra']
}

export function buildFileMoveInfraStub(): Infras['fileMoveInfra'] {
  return { moveFile: vi.fn() } as unknown as Infras['fileMoveInfra']
}

export function buildFsInfraWithHome(fakeHome: string): Infras['fsInfra'] {
  const real = new FsInfra()
  const proxy = Object.create(real) as Infras['fsInfra']
  proxy.homeDir = (): string => fakeHome
  return proxy
}

export function buildFsInfraWithCwd(fakeCwd: string): Infras['fsInfra'] {
  const real = new FsInfra()
  const proxy = Object.create(real) as Infras['fsInfra']
  proxy.currentWorkingDir = (): string => fakeCwd
  return proxy
}

export function makeClaudeSessionJsonl(opts?: {
  text?: string
  uuid?: string
  inputTokens?: number
  outputTokens?: number
}): string {
  return JSON.stringify({
    type: 'assistant',
    uuid: opts?.uuid ?? 'test-uuid-1',
    message: {
      content: [{ type: 'text', text: opts?.text ?? 'assistant response' }],
      usage: {
        input_tokens: opts?.inputTokens ?? 100,
        output_tokens: opts?.outputTokens ?? 50
      }
    }
  })
}

export function setupClaudeSessionFixture(
  fakeHome: string,
  claudeSessionId: string,
  workingDir: string,
  jsonlContent: string
): void {
  const sanitized = workingDir.replace(/[^a-zA-Z0-9]/g, '-')
  const projectDir = join(fakeHome, '.claude', 'projects', sanitized)
  mkdirSync(projectDir, { recursive: true })
  writeFileSync(join(projectDir, `${claudeSessionId}.jsonl`), jsonlContent, 'utf-8')
}

export function writePipelineFixture(dir: string, raw: unknown): string {
  const filePath = join(dir, 'pipeline.yaml')
  writeFileSync(filePath, stringify(raw), 'utf-8')
  return filePath
}

export function writeYamlFixture(filePath: string, raw: unknown): void {
  mkdirSync(join(filePath, '..'), { recursive: true })
  writeFileSync(filePath, stringify(raw), 'utf-8')
}

export function buildShellInfraStub(result?: {
  exitCode?: number
  stdout?: string
  stderr?: string
}): Infras['shellInfra'] {
  return {
    execShell: vi.fn(async () => ({
      exitCode: result?.exitCode ?? 0,
      stdout: result?.stdout ?? '',
      stderr: result?.stderr ?? ''
    }))
  } as unknown as Infras['shellInfra']
}

export function buildCommandRunnerInfraStub(result?: {
  exitCode?: number
  stdout?: string
  stderr?: string
}): Infras['commandRunnerInfra'] {
  return {
    runCommand: vi.fn(async () => ({
      exitCode: result?.exitCode ?? 0,
      stdout: result?.stdout ?? '',
      stderr: result?.stderr ?? ''
    }))
  } as unknown as Infras['commandRunnerInfra']
}
