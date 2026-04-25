import { useState } from 'react'
import { useInput } from 'ink'
import type { PermissionRequest } from './types.js'
import { computeScrollView, computeNextScrollOffset, type ScrollDirection } from './scrollBuffer.js'

type UseScrollBufferOptions = {
  allLines: string[]
  streamCapacity: number
  permRequest: PermissionRequest | null
}

type UseScrollBufferResult = {
  scrollMode: boolean
  visibleLines: string[]
  lineOffset: number
}

export function useScrollBuffer({
  allLines,
  streamCapacity,
  permRequest
}: UseScrollBufferOptions): UseScrollBufferResult {
  const [scrollMode, setScrollMode] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [frozenLines, setFrozenLines] = useState<string[]>([])

  useInput(
    (input, key) => {
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
      const direction: ScrollDirection | null = key.upArrow
        ? 'up'
        : key.downArrow
          ? 'down'
          : key.pageUp
            ? 'pageUp'
            : key.pageDown
              ? 'pageDown'
              : null
      if (direction) {
        setScrollOffset((prev) =>
          computeNextScrollOffset(direction, prev, frozenLines.length, streamCapacity)
        )
      }
    },
    { isActive: !permRequest }
  )

  const { visibleLines, lineOffset } = computeScrollView({
    allLines,
    frozenLines,
    scrollMode,
    scrollOffset,
    streamCapacity
  })

  return { scrollMode, visibleLines, lineOffset }
}
