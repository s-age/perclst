import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as readline from 'readline'
import { handleWorkingDirMismatch, confirmIfDuplicateName } from '@src/cli/prompt'
import { UserCancelledError } from '@src/errors/userCancelledError'

vi.mock('@src/utils/output')
vi.mock('readline')

function mockReadlineAnswer(answer: string): void {
  vi.mocked(readline.createInterface).mockReturnValue({
    question: (_prompt: string, cb: (answer: string) => void): void => cb(answer),
    close: vi.fn()
  } as unknown as readline.Interface)
}

describe('confirmIfDuplicateName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves without prompting when findByName returns null', async () => {
    const findByName = vi.fn().mockResolvedValue(null)
    await expect(confirmIfDuplicateName('my-session', findByName)).resolves.toBeUndefined()
  })

  it('resolves without prompting when non-interactive', async () => {
    const findByName = vi.fn().mockResolvedValue({ id: 'existing-id' })
    await expect(
      confirmIfDuplicateName('my-session', findByName, undefined, false)
    ).resolves.toBeUndefined()
    expect(findByName).not.toHaveBeenCalled()
  })

  it('resolves without prompting when existing session matches excludeId', async () => {
    const findByName = vi.fn().mockResolvedValue({ id: 'abc-123' })
    await expect(
      confirmIfDuplicateName('my-session', findByName, 'abc-123')
    ).resolves.toBeUndefined()
  })

  it('throws UserCancelledError when user declines on duplicate', async () => {
    const findByName = vi.fn().mockResolvedValue({ id: 'existing-id' })
    mockReadlineAnswer('n')
    await expect(confirmIfDuplicateName('my-session', findByName)).rejects.toThrow(
      UserCancelledError
    )
  })

  it('resolves when user confirms on duplicate', async () => {
    const findByName = vi.fn().mockResolvedValue({ id: 'existing-id' })
    mockReadlineAnswer('y')
    await expect(confirmIfDuplicateName('my-session', findByName)).resolves.toBeUndefined()
  })

  it('warns when duplicate is found with different excludeId', async () => {
    const findByName = vi.fn().mockResolvedValue({ id: 'existing-id' })
    mockReadlineAnswer('n')
    try {
      await confirmIfDuplicateName('my-session', findByName, 'other-id')
    } catch {
      // expected
    }
    const { stderr } = await import('@src/utils/output')
    expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
      expect.stringContaining('already exists (existing-id)')
    )
  })
})

describe('handleWorkingDirMismatch', () => {
  const originalCwd = process.cwd()
  let chdirSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    chdirSpy = vi.spyOn(process, 'chdir').mockImplementation(() => undefined)
  })

  afterEach(() => {
    chdirSpy.mockRestore()
  })

  it('does nothing when sessionDir matches cwd', async () => {
    await expect(handleWorkingDirMismatch(originalCwd)).resolves.toBeUndefined()
    expect(chdirSpy).not.toHaveBeenCalled()
  })

  it('does nothing when interactive is false', async () => {
    await expect(handleWorkingDirMismatch('/other/dir', false)).resolves.toBeUndefined()
    expect(chdirSpy).not.toHaveBeenCalled()
  })

  it('does nothing when sessionDir is empty', async () => {
    await expect(handleWorkingDirMismatch('')).resolves.toBeUndefined()
    expect(chdirSpy).not.toHaveBeenCalled()
  })

  it('throws UserCancelledError when user answers n', async () => {
    mockReadlineAnswer('n')
    await expect(handleWorkingDirMismatch('/other/dir')).rejects.toThrow(UserCancelledError)
    expect(chdirSpy).not.toHaveBeenCalled()
  })

  it('switches directory when user answers y', async () => {
    mockReadlineAnswer('y')
    await expect(handleWorkingDirMismatch('/other/dir')).resolves.toBeUndefined()
    expect(chdirSpy).toHaveBeenCalledWith('/other/dir')
  })

  it('switches directory when user presses Enter (default yes)', async () => {
    mockReadlineAnswer('')
    await expect(handleWorkingDirMismatch('/other/dir')).resolves.toBeUndefined()
    expect(chdirSpy).toHaveBeenCalledWith('/other/dir')
  })
})
