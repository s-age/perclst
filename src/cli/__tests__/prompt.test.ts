import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as readline from 'readline'
import { handleWorkingDirMismatch } from '@src/cli/prompt'
import { UserCancelledError } from '@src/errors/userCancelledError'

vi.mock('@src/utils/output')
vi.mock('readline')

function mockReadlineAnswer(answer: string): void {
  vi.mocked(readline.createInterface).mockReturnValue({
    question: (_prompt: string, cb: (answer: string) => void): void => cb(answer),
    close: vi.fn()
  } as unknown as readline.Interface)
}

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
