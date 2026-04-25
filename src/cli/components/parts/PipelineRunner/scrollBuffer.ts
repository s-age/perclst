export type ScrollViewParams = {
  allLines: string[]
  frozenLines: string[]
  scrollMode: boolean
  scrollOffset: number
  streamCapacity: number
}

export type ScrollView = {
  visibleLines: string[]
  lineOffset: number
}

export function computeScrollView({
  allLines,
  frozenLines,
  scrollMode,
  scrollOffset,
  streamCapacity
}: ScrollViewParams): ScrollView {
  const displayLines = scrollMode ? frozenLines : allLines
  const viewEnd = Math.max(0, displayLines.length - scrollOffset)
  const lineOffset = Math.max(0, viewEnd - streamCapacity)
  const visibleLines = displayLines.slice(lineOffset, viewEnd)
  return { visibleLines, lineOffset }
}

export type ScrollDirection = 'up' | 'down' | 'pageUp' | 'pageDown'

export function computeNextScrollOffset(
  direction: ScrollDirection,
  current: number,
  totalLines: number,
  streamCapacity: number
): number {
  const maxOffset = Math.max(0, totalLines - streamCapacity)
  const pageStep = Math.floor(streamCapacity / 2)
  switch (direction) {
    case 'up':
      return Math.min(current + 1, maxOffset)
    case 'down':
      return Math.max(0, current - 1)
    case 'pageUp':
      return Math.min(current + pageStep, maxOffset)
    case 'pageDown':
      return Math.max(0, current - pageStep)
  }
}
