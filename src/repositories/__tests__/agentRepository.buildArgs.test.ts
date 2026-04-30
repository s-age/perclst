import { describe, it, expect } from 'vitest'
import { buildArgs } from '../agentRepository'

describe('buildArgs', () => {
  // ── start action ──────────────────────────────────────────────────────────

  it('should include -p flag for a start action', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 'sess1',
      prompt: 'p',
      workingDir: '/w'
    })
    expect(result).toContain('-p')
  })

  it('should include --output-format flag for a start action', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 'sess1',
      prompt: 'p',
      workingDir: '/w'
    })
    expect(result).toContain('--output-format')
  })

  it('should include stream-json as output format value for a start action', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 'sess1',
      prompt: 'p',
      workingDir: '/w'
    })
    expect(result).toContain('stream-json')
  })

  it('should include --verbose flag for a start action', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 'sess1',
      prompt: 'p',
      workingDir: '/w'
    })
    expect(result).toContain('--verbose')
  })

  it('should include --session-id for a start action', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 'my-session',
      prompt: 'p',
      workingDir: '/w'
    })

    const idx = result.indexOf('--session-id')
    expect(result[idx + 1]).toBe('my-session')
  })

  it('should include --model when model is provided', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 's1',
      prompt: 'p',
      workingDir: '/w',
      model: 'claude-opus'
    })

    const idx = result.indexOf('--model')
    expect(result[idx + 1]).toBe('claude-opus')
  })

  it('should include --effort when effort is provided', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 's1',
      prompt: 'p',
      workingDir: '/w',
      effort: 'low'
    })

    const idx = result.indexOf('--effort')
    expect(result[idx + 1]).toBe('low')
  })

  it('should not include --effort when effort is not provided', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 's1',
      prompt: 'p',
      workingDir: '/w'
    })
    expect(result).not.toContain('--effort')
  })

  it('should include --system-prompt when system is set on a start action', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 's1',
      prompt: 'p',
      workingDir: '/w',
      system: 'You are helpful'
    })

    const idx = result.indexOf('--system-prompt')
    expect(result[idx + 1]).toBe('You are helpful')
  })

  // ── allowedTools ──────────────────────────────────────────────────────────

  it('should include --allowedTools flag when allowedTools is non-empty', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 's1',
      prompt: 'p',
      workingDir: '/w',
      allowedTools: ['Bash', 'Read']
    })
    expect(result).toContain('--allowedTools')
  })

  it('should include Bash in args when Bash is in allowedTools', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 's1',
      prompt: 'p',
      workingDir: '/w',
      allowedTools: ['Bash', 'Read']
    })
    expect(result).toContain('Bash')
  })

  it('should include Read in args when Read is in allowedTools', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 's1',
      prompt: 'p',
      workingDir: '/w',
      allowedTools: ['Bash', 'Read']
    })
    expect(result).toContain('Read')
  })

  it('should not include --allowedTools when allowedTools is not provided', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 's1',
      prompt: 'p',
      workingDir: '/w'
    })
    expect(result).not.toContain('--allowedTools')
  })

  // ── disallowedTools ───────────────────────────────────────────────────────

  it('should include --disallowedTools flag when disallowedTools is non-empty', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 's1',
      prompt: 'p',
      workingDir: '/w',
      disallowedTools: ['Write']
    })
    expect(result).toContain('--disallowedTools')
  })

  it('should include each disallowed tool name when disallowedTools is non-empty', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 's1',
      prompt: 'p',
      workingDir: '/w',
      disallowedTools: ['Write']
    })
    expect(result).toContain('Write')
  })

  it('should not include --disallowedTools when disallowedTools is not provided', () => {
    const result = buildArgs({
      type: 'start',
      sessionId: 's1',
      prompt: 'p',
      workingDir: '/w'
    })
    expect(result).not.toContain('--disallowedTools')
  })

  // ── resume action ─────────────────────────────────────────────────────────

  it('should use --resume with sessionId for a resume action', () => {
    const result = buildArgs({
      type: 'resume',
      sessionId: 'resume-sess',
      prompt: 'p',
      workingDir: '/w'
    })

    const idx = result.indexOf('--resume')
    expect(result[idx + 1]).toBe('resume-sess')
  })

  it('should not include --session-id for a resume action', () => {
    const result = buildArgs({
      type: 'resume',
      sessionId: 'r1',
      prompt: 'p',
      workingDir: '/w'
    })
    expect(result).not.toContain('--session-id')
  })

  // ── fork action ───────────────────────────────────────────────────────────

  it('should use originalClaudeSessionId as the --resume value for a fork action', () => {
    const result = buildArgs({
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
    const result = buildArgs({
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
    const result = buildArgs({
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
    const result = buildArgs({
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
    const result = buildArgs({
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
