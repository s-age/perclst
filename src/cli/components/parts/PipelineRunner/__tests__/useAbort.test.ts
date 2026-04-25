import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useInput } from 'ink'
import { isAbortKey, useAbort } from '../useAbort'

vi.mock('ink', () => ({
  useInput: vi.fn()
}))

const mockUseInput = vi.mocked(useInput)

// Helper to extract the handler captured by the mocked useInput
type InputHandler = (input: string, key: { ctrl: boolean }) => void
function capturedHandler(): InputHandler {
  return mockUseInput.mock.calls[0][0] as InputHandler
}

// ─── isAbortKey ──────────────────────────────────────────────────────────────

describe('isAbortKey', () => {
  it('returns true when ctrl is held and input is q', () => {
    expect(isAbortKey('q', { ctrl: true })).toBe(true)
  })

  it.each([
    ['ctrl not held, input is q', 'q', { ctrl: false }],
    ['ctrl held, input is not q', 'c', { ctrl: true }],
    ['ctrl not held and input is not q', 'x', { ctrl: false }]
  ] as const)('returns false when %s', (_label, input, key) => {
    expect(isAbortKey(input, key)).toBe(false)
  })
})

// ─── useAbort ────────────────────────────────────────────────────────────────

describe('useAbort', () => {
  let onAbort: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    onAbort = vi.fn()
  })

  it('registers a useInput handler with isActive: true', () => {
    useAbort({ onAbort, isActive: true })

    expect(mockUseInput).toHaveBeenCalledWith(expect.any(Function), { isActive: true })
  })

  it('registers a useInput handler with isActive: false', () => {
    useAbort({ onAbort, isActive: false })

    expect(mockUseInput).toHaveBeenCalledWith(expect.any(Function), { isActive: false })
  })

  it('calls onAbort when ctrl+q is pressed', () => {
    useAbort({ onAbort, isActive: true })
    capturedHandler()('q', { ctrl: true })

    expect(onAbort).toHaveBeenCalledOnce()
  })

  it('does not call onAbort when a non-abort key is pressed', () => {
    useAbort({ onAbort, isActive: true })
    capturedHandler()('c', { ctrl: true })

    expect(onAbort).not.toHaveBeenCalled()
  })

  it('does not call onAbort when ctrl is not held even if input is q', () => {
    useAbort({ onAbort, isActive: true })
    capturedHandler()('q', { ctrl: false })

    expect(onAbort).not.toHaveBeenCalled()
  })
})
