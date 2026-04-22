import { vi, describe, it, expect, beforeEach } from 'vitest'
import { analyzeCommand } from '../../analyze'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout } from '@src/utils/output'
import { parseAnalyzeSession } from '@src/validators/cli/analyzeSession'
import type { Session } from '@src/types/session'
import type { AnalysisSummary } from '@src/types/analysis'

vi.mock('@src/utils/output')
vi.mock('@src/core/di/container')
vi.mock('@src/validators/cli/analyzeSession')

type MockSessionService = {
  resolveId: ReturnType<typeof vi.fn>
}

type MockAnalyzeService = {
  analyze: ReturnType<typeof vi.fn>
}

// Helper to create a mock session
function createMockSession(overrides?: Partial<Session>): Session {
  return {
    id: 'test-session-123',
    claude_session_id: 'claude-123',
    working_dir: '/home/user/project',
    procedure: undefined,
    metadata: { status: 'completed', tags: [] },
    injected_skills: [],
    turns: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

// Helper to create a mock analysis summary
function createMockAnalysisSummary(overrides?: Partial<AnalysisSummary>): AnalysisSummary {
  return {
    turnsBreakdown: {
      userInstructions: 2,
      thinking: 1,
      toolCalls: 3,
      toolResults: 3,
      assistantResponse: 2,
      total: 11
    },
    toolUses: [],
    tokens: {
      totalInput: 1000,
      totalOutput: 500,
      totalCacheRead: 0,
      totalCacheCreation: 0
    },
    turns: [],
    ...overrides
  }
}

describe('analyzeCommand - happy path', () => {
  let mockSessionService: MockSessionService
  let mockAnalyzeService: MockAnalyzeService

  beforeEach(() => {
    vi.clearAllMocks()

    mockSessionService = {
      resolveId: vi.fn()
    }
    mockAnalyzeService = {
      analyze: vi.fn()
    }

    vi.mocked(container.resolve).mockImplementation((token) => {
      if (token === TOKENS.SessionService) {
        return mockSessionService
      }
      if (token === TOKENS.AnalyzeService) {
        return mockAnalyzeService
      }
    })

    vi.mocked(parseAnalyzeSession).mockImplementation((input) => ({
      sessionId: input.sessionId,
      format: input.format,
      printDetail: input.printDetail ?? false
    }))
  })

  it('calls parseAnalyzeSession with input options', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary()

    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { format: 'json', printDetail: true })

    expect(vi.mocked(parseAnalyzeSession)).toHaveBeenCalledWith({
      sessionId: 'test-123',
      format: 'json',
      printDetail: true
    })
  })

  it('resolves session id via service', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary()

    mockSessionService.resolveId.mockResolvedValue('resolved-abc-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('abc', {})

    expect(mockSessionService.resolveId).toHaveBeenCalledWith('abc')
    expect(mockAnalyzeService.analyze).toHaveBeenCalledWith('resolved-abc-123')
  })

  it('prints json output with full details when format is json and printDetail is true', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary()

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: 'json',
      printDetail: true
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { format: 'json', printDetail: true })

    const printCall = vi.mocked(stdout.print).mock.calls[0]?.[0]
    expect(typeof printCall).toBe('string')
    const output = JSON.parse(printCall as string)
    expect(output.session).toEqual(session)
    expect(output.summary).toEqual(summary)
  })

  it('prints json output with summary when format is json and printDetail is false', async () => {
    const session = createMockSession({ procedure: 'test-proc' })
    const summary = createMockAnalysisSummary({
      toolUses: [
        { name: 'Bash', input: { command: 'ls' }, isError: false },
        { name: 'Read', input: { file_path: '/tmp/test' }, isError: true }
      ]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: 'json',
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { format: 'json' })

    const printCall = vi.mocked(stdout.print).mock.calls[0]?.[0]
    const output = JSON.parse(printCall as string)
    expect(output.session_id).toBe(session.id)
    expect(output.working_dir).toBe(session.working_dir)
    expect(output.procedure).toBe('test-proc')
    expect(output.status).toBe('completed')
    expect(output.tool_uses).toHaveLength(2)
  })

  it('prints text summary when format is not json', async () => {
    const session = createMockSession({ id: 'sess-abc' })
    const summary = createMockAnalysisSummary()

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', {})

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('sess-abc'))).toBe(true)
  })

  it('includes procedure in text output when present', async () => {
    const session = createMockSession({ procedure: 'meta-curate' })
    const summary = createMockAnalysisSummary()

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', {})

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('Procedure'))).toBe(true)
  })

  it('omits procedure from text output when undefined', async () => {
    const session = createMockSession({ procedure: undefined })
    const summary = createMockAnalysisSummary()

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', {})

    const printCalls = vi.mocked(stdout.print).mock.calls
    const procedureCalls = printCalls.filter((call) => call[0].toString().includes('Procedure:'))
    expect(procedureCalls).toHaveLength(0)
  })

  it('prints detailed turns when printDetail is true with text format', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      turns: [
        {
          userMessage: 'Analyze this',
          thinkingBlocks: [],
          toolCalls: [],
          assistantText: undefined
        }
      ]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: true
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { printDetail: true })

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('Analyze this'))).toBe(true)
  })

  it('does not print detailed turns when printDetail is false', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      turns: [
        {
          userMessage: 'Secret message',
          thinkingBlocks: [],
          toolCalls: [],
          assistantText: undefined
        }
      ]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', {})

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('Secret message'))).toBe(false)
  })

  it('prints tool uses in text format when present', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      toolUses: [
        { name: 'Bash', input: { command: 'npm test' }, isError: false },
        { name: 'Read', input: { file_path: '/src/main.ts' }, isError: false }
      ]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', {})

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('npm test'))).toBe(true)
    expect(printCalls.some((call) => call[0].toString().includes('/src/main.ts'))).toBe(true)
  })

  it('shows tool error indicator in text output when tool call failed', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      toolUses: [{ name: 'Bash', input: { command: 'false' }, isError: true }]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', {})

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('✗'))).toBe(true)
  })

  it('includes cache tokens in text output when cache read > 0', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      tokens: {
        totalInput: 1000,
        totalOutput: 500,
        totalCacheRead: 200,
        totalCacheCreation: 0
      }
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', {})

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('Cache read'))).toBe(true)
  })

  it('includes cache creation tokens in text output when cache creation > 0', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      tokens: {
        totalInput: 1000,
        totalOutput: 500,
        totalCacheRead: 0,
        totalCacheCreation: 150
      }
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', {})

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('Cache created'))).toBe(true)
  })

  it('prints tool call results in detailed view', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      turns: [
        {
          userMessage: undefined,
          thinkingBlocks: [],
          toolCalls: [
            { name: 'Bash', input: { command: 'ls' }, result: 'file1.txt\nfile2.txt' },
            { name: 'Read', input: { file_path: '/tmp/test' }, result: 'content here' }
          ],
          assistantText: undefined
        }
      ]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: true
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { printDetail: true })

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('file1.txt'))).toBe(true)
    expect(printCalls.some((call) => call[0].toString().includes('content here'))).toBe(true)
  })

  it('prints tool calls without results in detailed view as (no result)', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      turns: [
        {
          userMessage: undefined,
          thinkingBlocks: [],
          toolCalls: [{ name: 'Bash', input: { command: 'sleep 10' }, result: null }],
          assistantText: undefined
        }
      ]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: true
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { printDetail: true })

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('(no result)'))).toBe(true)
  })

  it('prints thinking blocks in detailed view', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      turns: [
        {
          userMessage: undefined,
          thinkingBlocks: ['Analyzing the problem', 'Formulating approach'],
          toolCalls: [],
          assistantText: undefined
        }
      ]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: true
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { printDetail: true })

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('Analyzing the problem'))).toBe(
      true
    )
  })

  it('prints assistant text in detailed view', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      turns: [
        {
          userMessage: undefined,
          thinkingBlocks: [],
          toolCalls: [],
          assistantText: 'Here is my response'
        }
      ]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: undefined,
      printDetail: true
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { printDetail: true })

    const printCalls = vi.mocked(stdout.print).mock.calls
    expect(printCalls.some((call) => call[0].toString().includes('Here is my response'))).toBe(true)
  })

  it('handles json output with zero tool uses', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({ toolUses: [] })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: 'json',
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { format: 'json' })

    const printCall = vi.mocked(stdout.print).mock.calls[0]?.[0]
    const output = JSON.parse(printCall as string)
    expect(output.tool_uses).toHaveLength(0)
  })

  it('formats tool input with command in json output', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      toolUses: [{ name: 'Bash', input: { command: 'npm run build' }, isError: false }]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: 'json',
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { format: 'json' })

    const printCall = vi.mocked(stdout.print).mock.calls[0]?.[0]
    const output = JSON.parse(printCall as string)
    expect(output.tool_uses[0].label).toBe('Bash(npm run build)')
  })

  it('formats tool input with file_path in json output', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      toolUses: [{ name: 'Read', input: { file_path: '/src/index.ts' }, isError: false }]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: 'json',
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { format: 'json' })

    const printCall = vi.mocked(stdout.print).mock.calls[0]?.[0]
    const output = JSON.parse(printCall as string)
    expect(output.tool_uses[0].label).toBe('Read(/src/index.ts)')
  })

  it('formats tool input with url in json output', async () => {
    const session = createMockSession()
    const summary = createMockAnalysisSummary({
      toolUses: [
        {
          name: 'WebFetch',
          input: { url: 'https://example.com', prompt: 'extract' },
          isError: false
        }
      ]
    })

    vi.mocked(parseAnalyzeSession).mockReturnValue({
      sessionId: 'test-123',
      format: 'json',
      printDetail: false
    })
    mockSessionService.resolveId.mockResolvedValue('resolved-123')
    mockAnalyzeService.analyze.mockResolvedValue({ session, summary })

    await analyzeCommand('test-123', { format: 'json' })

    const printCall = vi.mocked(stdout.print).mock.calls[0]?.[0]
    const output = JSON.parse(printCall as string)
    expect(output.tool_uses[0].label).toBe('WebFetch(https://example.com)')
  })
})
