import { useInput } from 'ink'

type UseAbortOptions = {
  onAbort: () => void
  isActive: boolean
}

export function useAbort({ onAbort, isActive }: UseAbortOptions): void {
  useInput(
    (input, key) => {
      if (key.ctrl && input === 'q') onAbort()
    },
    { isActive }
  )
}
