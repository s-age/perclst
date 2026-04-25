import { useInput } from 'ink'

type UseAbortOptions = {
  onAbort: () => void
  isActive: boolean
}

export function isAbortKey(input: string, key: { ctrl: boolean }): boolean {
  return key.ctrl && input === 'q'
}

export function useAbort({ onAbort, isActive }: UseAbortOptions): void {
  useInput(
    (input, key) => {
      if (isAbortKey(input, key)) onAbort()
    },
    { isActive }
  )
}
