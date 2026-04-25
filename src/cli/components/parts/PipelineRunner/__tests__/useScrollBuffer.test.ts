import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useState } from 'react'
import { useInput } from 'ink'
import { computeScrollView, computeNextScrollOffset } from '../scrollBuffer'
import { useScrollBuffer } from '../useScrollBuffer'
import type { PermissionRequest } from '@src/types/permissionPipe.js'

vi.mock('react', () => ({
  useState: vi.fn()
}))

vi.mock('ink', () => ({
  useInput: vi.fn()
}))

const mockUseInput = vi.mocked(useInput)

// ─── computeScrollView ───────────────────────────────────────────────────────

describe('computeScrollView', () => {
  it('returns all lines as visibleLines with lineOffset 0 when capacity covers all and scrollOffset is 0', () => {
    const result = computeScrollView({
      allLines: ['a', 'b', 'c'],
      frozenLines: [],
      scrollMode: false,
      scrollOffset: 0,
      streamCapacity: 10
    })
    expect(result).toEqual({ visibleLines: ['a', 'b', 'c'], lineOffset: 0 })
  })

  it('uses frozenLines instead of allLines when scrollMode is true', () => {
    const result = computeScrollView({
      allLines: ['live1', 'live2'],
      frozenLines: ['frozen1', 'frozen2', 'frozen3'],
      scrollMode: true,
      scrollOffset: 0,
      streamCapacity: 10
    })
    expect(result.visibleLines).toEqual(['frozen1', 'frozen2', 'frozen3'])
  })

  it('clips the beginning of the buffer when total lines exceed streamCapacity', () => {
    const result = computeScrollView({
      allLines: ['a', 'b', 'c', 'd', 'e'],
      frozenLines: [],
      scrollMode: false,
      scrollOffset: 0,
      streamCapacity: 3
    })
    expect(result).toEqual({ visibleLines: ['c', 'd', 'e'], lineOffset: 2 })
  })

  it('shifts the visible window upward when scrollOffset is greater than 0', () => {
    // allLines length=5, scrollOffset=2 → viewEnd=3, streamCapacity=3 → lineOffset=0
    const result = computeScrollView({
      allLines: ['a', 'b', 'c', 'd', 'e'],
      frozenLines: [],
      scrollMode: false,
      scrollOffset: 2,
      streamCapacity: 3
    })
    expect(result).toEqual({ visibleLines: ['a', 'b', 'c'], lineOffset: 0 })
  })

  it('returns empty visibleLines with lineOffset 0 when allLines is empty', () => {
    const result = computeScrollView({
      allLines: [],
      frozenLines: [],
      scrollMode: false,
      scrollOffset: 0,
      streamCapacity: 10
    })
    expect(result).toEqual({ visibleLines: [], lineOffset: 0 })
  })

  it('returns empty visibleLines when scrollOffset equals total line count', () => {
    // viewEnd = max(0, 3-3) = 0 → empty slice
    const result = computeScrollView({
      allLines: ['a', 'b', 'c'],
      frozenLines: [],
      scrollMode: false,
      scrollOffset: 3,
      streamCapacity: 10
    })
    expect(result).toEqual({ visibleLines: [], lineOffset: 0 })
  })

  it('does not use frozenLines when scrollMode is false even if frozenLines is populated', () => {
    const result = computeScrollView({
      allLines: ['current'],
      frozenLines: ['stale1', 'stale2'],
      scrollMode: false,
      scrollOffset: 0,
      streamCapacity: 10
    })
    expect(result.visibleLines).toEqual(['current'])
  })
})

// ─── computeNextScrollOffset ─────────────────────────────────────────────────

describe('computeNextScrollOffset', () => {
  // Happy path — all four directions

  it('increments offset by 1 for direction "up"', () => {
    expect(computeNextScrollOffset('up', 2, 20, 5)).toBe(3)
  })

  it('decrements offset by 1 for direction "down"', () => {
    expect(computeNextScrollOffset('down', 3, 20, 5)).toBe(2)
  })

  it('increments offset by floor(streamCapacity/2) for direction "pageUp"', () => {
    // pageStep = floor(10/2) = 5; 2+5 = 7, maxOffset = 20
    expect(computeNextScrollOffset('pageUp', 2, 30, 10)).toBe(7)
  })

  it('decrements offset by floor(streamCapacity/2) for direction "pageDown"', () => {
    // pageStep = floor(10/2) = 5; 8-5 = 3
    expect(computeNextScrollOffset('pageDown', 8, 30, 10)).toBe(3)
  })

  // Upper bound — clamp at maxOffset

  it('clamps "up" at maxOffset when offset is already at the ceiling', () => {
    // maxOffset = max(0, 10-5) = 5; current already 5
    expect(computeNextScrollOffset('up', 5, 10, 5)).toBe(5)
  })

  it('clamps "pageUp" at maxOffset when the step would overshoot the ceiling', () => {
    // maxOffset = 5; pageStep = floor(5/2)=2; current=4 → 4+2=6 → clamped to 5
    expect(computeNextScrollOffset('pageUp', 4, 10, 5)).toBe(5)
  })

  // Lower bound — clamp at 0

  it('clamps "down" at 0 when offset is already at the floor', () => {
    expect(computeNextScrollOffset('down', 0, 20, 5)).toBe(0)
  })

  it('clamps "pageDown" at 0 when the step would go below zero', () => {
    // pageStep = floor(10/2)=5; current=2 → 2-5=-3 → clamped to 0
    expect(computeNextScrollOffset('pageDown', 2, 20, 10)).toBe(0)
  })

  // Edge — maxOffset is 0 when streamCapacity >= totalLines

  it('returns 0 for "up" when streamCapacity covers all lines and maxOffset is 0', () => {
    // maxOffset = max(0, 5-10) = 0; min(0+1, 0) = 0
    expect(computeNextScrollOffset('up', 0, 5, 10)).toBe(0)
  })

  it('returns 0 for "pageUp" when streamCapacity covers all lines and maxOffset is 0', () => {
    expect(computeNextScrollOffset('pageUp', 0, 5, 10)).toBe(0)
  })
})

// ─── useScrollBuffer ─────────────────────────────────────────────────────────

describe('useScrollBuffer', () => {
  const mockSetScrollMode = vi.fn()
  const mockSetScrollOffset = vi.fn()
  const mockSetFrozenLines = vi.fn()

  type KeyArg = {
    ctrl?: boolean
    upArrow?: boolean
    downArrow?: boolean
    pageUp?: boolean
    pageDown?: boolean
  }

  type InputHandler = (input: string, key: Required<KeyArg>) => void

  function makeKey(overrides: KeyArg = {}): Required<KeyArg> {
    return {
      ctrl: false,
      upArrow: false,
      downArrow: false,
      pageUp: false,
      pageDown: false,
      ...overrides
    }
  }

  function capturedHandler(): InputHandler {
    return mockUseInput.mock.calls[0][0] as InputHandler
  }

  describe('when scrollMode is false (live mode)', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(useState)
        .mockReturnValueOnce([false, mockSetScrollMode] as never)
        .mockReturnValueOnce([0, mockSetScrollOffset] as never)
        .mockReturnValueOnce([[], mockSetFrozenLines] as never)
      mockUseInput.mockImplementation(() => {})
    })

    it('returns scrollMode=false on initial render', () => {
      expect(
        useScrollBuffer({ allLines: ['a'], streamCapacity: 10, permRequest: null }).scrollMode
      ).toBe(false)
    })

    it('returns visibleLines derived from allLines', () => {
      expect(
        useScrollBuffer({ allLines: ['a', 'b'], streamCapacity: 10, permRequest: null })
          .visibleLines
      ).toEqual(['a', 'b'])
    })

    it('returns lineOffset=0 when allLines length does not exceed streamCapacity', () => {
      expect(
        useScrollBuffer({ allLines: ['a', 'b'], streamCapacity: 10, permRequest: null }).lineOffset
      ).toBe(0)
    })

    it('registers useInput with isActive: true when permRequest is null', () => {
      useScrollBuffer({ allLines: [], streamCapacity: 10, permRequest: null })
      expect(mockUseInput).toHaveBeenCalledWith(expect.any(Function), { isActive: true })
    })

    it('registers useInput with isActive: false when permRequest is set', () => {
      const permRequest: PermissionRequest = { tool_name: 'bash', input: {} }
      useScrollBuffer({ allLines: [], streamCapacity: 10, permRequest })
      expect(mockUseInput).toHaveBeenCalledWith(expect.any(Function), { isActive: false })
    })

    it('calls setFrozenLines with a snapshot of allLines when ctrl+o is pressed', () => {
      const allLines = ['line1', 'line2']
      useScrollBuffer({ allLines, streamCapacity: 10, permRequest: null })
      capturedHandler()('o', makeKey({ ctrl: true }))
      expect(mockSetFrozenLines).toHaveBeenCalledWith(['line1', 'line2'])
    })

    it('calls setScrollOffset(0) when ctrl+o is pressed', () => {
      useScrollBuffer({ allLines: ['x'], streamCapacity: 10, permRequest: null })
      capturedHandler()('o', makeKey({ ctrl: true }))
      expect(mockSetScrollOffset).toHaveBeenCalledWith(0)
    })

    it('calls setScrollMode(true) when ctrl+o is pressed', () => {
      useScrollBuffer({ allLines: [], streamCapacity: 10, permRequest: null })
      capturedHandler()('o', makeKey({ ctrl: true }))
      expect(mockSetScrollMode).toHaveBeenCalledWith(true)
    })

    it('does not call setScrollOffset when upArrow is pressed in live mode', () => {
      useScrollBuffer({ allLines: ['a'], streamCapacity: 10, permRequest: null })
      capturedHandler()('', makeKey({ upArrow: true }))
      expect(mockSetScrollOffset).not.toHaveBeenCalled()
    })
  })

  describe('when scrollMode is true (scroll mode)', () => {
    const frozenLines = ['f1', 'f2', 'f3', 'f4', 'f5']

    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(useState)
        .mockReturnValueOnce([true, mockSetScrollMode] as never)
        .mockReturnValueOnce([2, mockSetScrollOffset] as never)
        .mockReturnValueOnce([frozenLines, mockSetFrozenLines] as never)
      mockUseInput.mockImplementation(() => {})
    })

    it('calls setScrollMode(false) when ctrl+o is pressed', () => {
      useScrollBuffer({ allLines: ['live'], streamCapacity: 10, permRequest: null })
      capturedHandler()('o', makeKey({ ctrl: true }))
      expect(mockSetScrollMode).toHaveBeenCalledWith(false)
    })

    it('calls setScrollOffset(0) when ctrl+o is pressed', () => {
      useScrollBuffer({ allLines: ['live'], streamCapacity: 10, permRequest: null })
      capturedHandler()('o', makeKey({ ctrl: true }))
      expect(mockSetScrollOffset).toHaveBeenCalledWith(0)
    })

    it('does not call setFrozenLines when ctrl+o is pressed', () => {
      useScrollBuffer({ allLines: ['live'], streamCapacity: 10, permRequest: null })
      capturedHandler()('o', makeKey({ ctrl: true }))
      expect(mockSetFrozenLines).not.toHaveBeenCalled()
    })

    it('calls setScrollOffset updater for upArrow that increments offset', () => {
      useScrollBuffer({ allLines: [], streamCapacity: 10, permRequest: null })
      capturedHandler()('', makeKey({ upArrow: true }))
      const updater = vi.mocked(mockSetScrollOffset).mock.calls[0][0] as (prev: number) => number
      expect(updater(2)).toBe(computeNextScrollOffset('up', 2, frozenLines.length, 10))
    })

    it('calls setScrollOffset updater for downArrow that decrements offset', () => {
      useScrollBuffer({ allLines: [], streamCapacity: 10, permRequest: null })
      capturedHandler()('', makeKey({ downArrow: true }))
      const updater = vi.mocked(mockSetScrollOffset).mock.calls[0][0] as (prev: number) => number
      expect(updater(3)).toBe(computeNextScrollOffset('down', 3, frozenLines.length, 10))
    })

    it('calls setScrollOffset updater for pageUp that advances by half capacity', () => {
      useScrollBuffer({ allLines: [], streamCapacity: 10, permRequest: null })
      capturedHandler()('', makeKey({ pageUp: true }))
      const updater = vi.mocked(mockSetScrollOffset).mock.calls[0][0] as (prev: number) => number
      expect(updater(1)).toBe(computeNextScrollOffset('pageUp', 1, frozenLines.length, 10))
    })

    it('calls setScrollOffset updater for pageDown that retreats by half capacity', () => {
      useScrollBuffer({ allLines: [], streamCapacity: 10, permRequest: null })
      capturedHandler()('', makeKey({ pageDown: true }))
      const updater = vi.mocked(mockSetScrollOffset).mock.calls[0][0] as (prev: number) => number
      expect(updater(4)).toBe(computeNextScrollOffset('pageDown', 4, frozenLines.length, 10))
    })

    it('does not call setScrollOffset when no recognized key is pressed', () => {
      useScrollBuffer({ allLines: [], streamCapacity: 10, permRequest: null })
      capturedHandler()('x', makeKey())
      expect(mockSetScrollOffset).not.toHaveBeenCalled()
    })

    it('returns visibleLines from frozenLines when in scroll mode', () => {
      // scrollMode=true, frozenLines=5 lines, scrollOffset=2, streamCapacity=10
      // computeScrollView: viewEnd=max(0,5-2)=3, lineOffset=max(0,3-10)=0, slice(0,3)
      const result = useScrollBuffer({ allLines: ['live'], streamCapacity: 10, permRequest: null })
      expect(result.visibleLines).toEqual(['f1', 'f2', 'f3'])
    })
  })
})
