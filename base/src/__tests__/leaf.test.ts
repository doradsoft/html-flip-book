import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FlipDirection } from '../flip-direction'
import { FLIPPED, type FlipPosition, Leaf, NOT_FLIPPED } from '../leaf'

describe('Leaf', () => {
  let mockPage1: HTMLElement
  let mockPage2: HTMLElement
  let onTurnedMock: ReturnType<typeof vi.fn>

  const defaultBookProperties = {
    isLTR: true,
    pagesCount: 10,
    leavesCount: 5,
  }

  beforeEach(() => {
    // Create mock page elements
    mockPage1 = document.createElement('div')
    mockPage1.dataset.pageIndex = '0'
    mockPage2 = document.createElement('div')
    mockPage2.dataset.pageIndex = '1'

    onTurnedMock = vi.fn()

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(() => cb(performance.now()), 0)
      return 0
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create a leaf with NOT_FLIPPED state', () => {
      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      expect(leaf.index).toBe(0)
      expect(leaf.flipPosition).toBe(0)
      expect(leaf.isTurned).toBe(false)
      expect(leaf.isTurning).toBe(false)
    })

    it('should create a leaf with FLIPPED state', () => {
      const leaf = new Leaf(0, [mockPage1, mockPage2], FLIPPED, defaultBookProperties, onTurnedMock)

      expect(leaf.flipPosition).toBe(1)
      expect(leaf.isTurned).toBe(true)
    })
  })

  describe('properties', () => {
    it('should identify first leaf', () => {
      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      expect(leaf.isFirst).toBe(true)
      expect(leaf.isLast).toBe(false)
      expect(leaf.isCover).toBe(true)
    })

    it('should identify last leaf', () => {
      const leaf = new Leaf(
        4, // index 4 is last when leavesCount is 5
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      expect(leaf.isFirst).toBe(false)
      expect(leaf.isLast).toBe(true)
      expect(leaf.isCover).toBe(true)
    })

    it('should identify middle leaf as not cover', () => {
      const leaf = new Leaf(
        2,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      expect(leaf.isFirst).toBe(false)
      expect(leaf.isLast).toBe(false)
      expect(leaf.isCover).toBe(false)
    })
  })

  describe('flipPosition', () => {
    it('should clamp flip position to 0-1 range', () => {
      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      leaf.flipPosition = -0.5
      expect(leaf.flipPosition).toBe(0)

      leaf.flipPosition = 1.5
      expect(leaf.flipPosition).toBe(1)

      leaf.flipPosition = 0.5
      expect(leaf.flipPosition).toBe(0.5)
    })

    it('should report isTurning when flip position is not 0', () => {
      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      expect(leaf.isTurning).toBe(false)

      leaf.flipPosition = 0.3
      expect(leaf.isTurning).toBe(true)

      leaf.flipPosition = 1
      expect(leaf.isTurning).toBe(true)
      expect(leaf.isTurned).toBe(true)
    })
  })

  describe('flipToPosition', () => {
    it('should resolve immediately if already at target position', async () => {
      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      const result = await leaf.flipToPosition(0 as FlipPosition)
      expect(result).toBeUndefined()
    })

    it('should animate flip from 0 to 1', async () => {
      vi.useFakeTimers()

      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      // Use fast velocity for quick test
      const promise = leaf.flipToPosition(1 as FlipPosition, 10000 as never)

      // Fast forward through animation
      await vi.runAllTimersAsync()
      await promise

      expect(leaf.flipPosition).toBe(1)
      expect(leaf.isTurned).toBe(true)
      expect(onTurnedMock).toHaveBeenCalledWith(FlipDirection.Forward)

      vi.useRealTimers()
    })

    it('should return same promise when target is already in progress', async () => {
      vi.useFakeTimers()

      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      const promise1 = leaf.flipToPosition(1 as FlipPosition, 10000 as never)
      const firstAnimation = (leaf as any).currentAnimation
      const promise2 = leaf.flipToPosition(1 as FlipPosition, 10000 as never)
      const secondAnimation = (leaf as any).currentAnimation

      expect(secondAnimation).toBe(firstAnimation)
      expect(promise2).toBeInstanceOf(Promise)

      await vi.runAllTimersAsync()
      await promise1
      await promise2

      vi.useRealTimers()
    })

    it('should return current animation when target matches', async () => {
      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      ;(leaf as any).currentAnimation = null
      ;(leaf as any).targetFlipPosition = 1

      const result = await leaf.flipToPosition(1 as FlipPosition)

      expect(result).toBeUndefined()
    })

    it('should update transforms for LTR across midpoints', async () => {
      const timestamps = [250, 750, 1000]
      vi.spyOn(performance, 'now').mockReturnValue(0)
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        const ts = timestamps.shift() ?? 1000
        setTimeout(() => cb(ts), 0)
        return 0
      })

      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        { ...defaultBookProperties, isLTR: true },
        onTurnedMock
      )

      const promise = leaf.flipToPosition(1 as FlipPosition, 180 as never)
      await new Promise((resolve) => setTimeout(resolve, 5))
      await promise

      expect(mockPage1.style.transform).toContain('rotateY')
      expect(mockPage2.style.transform).toContain('rotateY')
    })

    it('should update transforms for RTL across midpoints', async () => {
      const timestamps = [250, 750, 1000]
      vi.spyOn(performance, 'now').mockReturnValue(0)
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        const ts = timestamps.shift() ?? 1000
        setTimeout(() => cb(ts), 0)
        return 0
      })

      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        { ...defaultBookProperties, isLTR: false },
        onTurnedMock
      )

      const promise = leaf.flipToPosition(1 as FlipPosition, 180 as never)
      await new Promise((resolve) => setTimeout(resolve, 5))
      await promise

      expect(mockPage1.style.transformOrigin).toBeTruthy()
      expect(mockPage2.style.transformOrigin).toBeTruthy()
    })

    it('should skip transform when page is undefined', async () => {
      const timestamps = [500, 1000]
      vi.spyOn(performance, 'now').mockReturnValue(0)
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        const ts = timestamps.shift() ?? 1000
        setTimeout(() => cb(ts), 0)
        return 0
      })

      const leaf = new Leaf(
        0,
        [mockPage1, undefined],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      const promise = leaf.flipToPosition(1 as FlipPosition, 180 as never)
      await new Promise((resolve) => setTimeout(resolve, 5))
      await promise

      expect(mockPage1.style.transform).toContain('rotateY')
    })
    it('should call onTurned with Backward when flipping to 0', async () => {
      vi.useFakeTimers()

      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      const forwardPromise = leaf.flipToPosition(1 as FlipPosition, 10000 as never)
      await vi.runAllTimersAsync()
      await forwardPromise

      onTurnedMock.mockClear()

      const backwardPromise = leaf.flipToPosition(0 as FlipPosition, 10000 as never)
      await vi.runAllTimersAsync()
      await backwardPromise

      expect(onTurnedMock).toHaveBeenCalledWith(FlipDirection.Backward)

      vi.useRealTimers()
    })

    it('should retry frame when elapsed is negative', async () => {
      const timestamps = [50, 200]
      vi.spyOn(performance, 'now').mockReturnValue(100)
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        const ts = timestamps.shift() ?? 200
        setTimeout(() => cb(ts), 0)
        return 0
      })

      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      const promise = leaf.flipToPosition(1 as FlipPosition, 10000 as never)
      await new Promise((resolve) => setTimeout(resolve, 5))
      await promise

      expect(leaf.flipPosition).toBe(1)
    })
  })

  describe('efficientFlipToPosition', () => {
    it('should call flipToPosition through throttle', async () => {
      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      const spy = vi.spyOn(leaf, 'flipToPosition').mockResolvedValue(undefined)

      await leaf.efficientFlipToPosition(1 as FlipPosition)

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('pages', () => {
    it('should expose pages array', () => {
      const leaf = new Leaf(
        0,
        [mockPage1, mockPage2],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      expect(leaf.pages).toHaveLength(2)
      expect(leaf.pages[0]).toBe(mockPage1)
      expect(leaf.pages[1]).toBe(mockPage2)
    })

    it('should handle undefined second page', () => {
      const leaf = new Leaf(
        0,
        [mockPage1, undefined],
        NOT_FLIPPED,
        defaultBookProperties,
        onTurnedMock
      )

      expect(leaf.pages[0]).toBe(mockPage1)
      expect(leaf.pages[1]).toBeUndefined()
    })
  })
})
