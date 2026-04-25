import { describe, it, expect } from 'vitest'
import { computeScrollView, computeNextScrollOffset } from '../scrollBuffer.js'

describe('scrollBuffer', () => {
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
})
