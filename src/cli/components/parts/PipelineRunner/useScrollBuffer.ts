import { useState } from 'react'
import { useInput } from 'ink'
import type { PermissionRequest } from './types.js'

type UseScrollBufferOptions = {
  allLines: string[]
  streamCapacity: number
  permRequest: PermissionRequest | null
  onAbort: () => void
}

type UseScrollBufferResult = {
  scrollMode: boolean
  visibleLines: string[]
  lineOffset: number
}

export function useScrollBuffer({
  allLines,
  streamCapacity,
  permRequest,
  onAbort
}: UseScrollBufferOptions): UseScrollBufferResult {
  const [scrollMode, setScrollMode] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [frozenLines, setFrozenLines] = useState<string[]>([])

  useInput(
    (input, key) => {
      if (key.ctrl && input === 'q') {
        onAbort()
        return
      }
      if (key.ctrl && input === 'o') {
        if (!scrollMode) {
          setFrozenLines([...allLines])
          setScrollOffset(0)
          setScrollMode(true)
        } else {
          setScrollMode(false)
          setScrollOffset(0)
        }
        return
      }
      if (!scrollMode) return
      const maxOffset = Math.max(0, frozenLines.length - streamCapacity)
      if (key.upArrow) setScrollOffset((prev) => Math.min(prev + 1, maxOffset))
      else if (key.downArrow) setScrollOffset((prev) => Math.max(0, prev - 1))
      else if (key.pageUp)
        setScrollOffset((prev) => Math.min(prev + Math.floor(streamCapacity / 2), maxOffset))
      else if (key.pageDown)
        setScrollOffset((prev) => Math.max(0, prev - Math.floor(streamCapacity / 2)))
    },
    { isActive: !permRequest }
  )

  const displayLines = scrollMode ? frozenLines : allLines
  const viewEnd = Math.max(0, displayLines.length - scrollOffset)
  const lineOffset = Math.max(0, viewEnd - streamCapacity)
  const visibleLines = displayLines.slice(lineOffset, viewEnd)

  return { scrollMode, visibleLines, lineOffset }
}
