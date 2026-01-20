import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FlipDirection } from '../flip-direction'
import { FlipBook } from '../flipbook'
import { getFlipBookInternals, setFlipBookInternals } from './test-utils'

// Mock HammerJS - must be hoisted
vi.mock('hammerjs', () => {
  // Create a proper constructor function for Hammer
  function MockHammer() {
    return {
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
    }
  }
  return { default: MockHammer }
})

describe('FlipBook', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    // Create container with pages
    container = document.createElement('div')
    container.className = 'flipbook-container'
    Object.defineProperty(container, 'clientWidth', {
      value: 800,
      configurable: true,
    })
    Object.defineProperty(container, 'clientHeight', {
      value: 600,
      configurable: true,
    })
    document.body.appendChild(container)

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(() => cb(performance.now()), 0)
      return 0
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  function createPages(count: number): HTMLElement[] {
    const pages: HTMLElement[] = []
    for (let i = 0; i < count; i++) {
      const page = document.createElement('div')
      page.className = 'page'
      container.appendChild(page)
      pages.push(page)
    }
    return pages
  }

  describe('constructor', () => {
    it('should create a FlipBook with default options', () => {
      const flipBook = new FlipBook({ pagesCount: 4 })
      expect(flipBook).toBeDefined()
      expect(flipBook.bookElement).toBeUndefined()
    })

    it('should accept custom aspect ratios', () => {
      const flipBook = new FlipBook({
        pagesCount: 4,
        leafAspectRatio: { width: 3, height: 4 },
        coverAspectRatio: { width: 3.2, height: 4.2 },
      })
      expect(flipBook).toBeDefined()
    })

    it('should accept direction option', () => {
      const flipBookLTR = new FlipBook({ pagesCount: 4, direction: 'ltr' })
      const flipBookRTL = new FlipBook({ pagesCount: 4, direction: 'rtl' })
      expect(flipBookLTR).toBeDefined()
      expect(flipBookRTL).toBeDefined()
    })

    it('should accept onPageChanged callback', () => {
      const onPageChanged = vi.fn()
      const flipBook = new FlipBook({ pagesCount: 4, onPageChanged })
      expect(flipBook).toBeDefined()
    })

    it('should accept pageSemantics option', () => {
      const pageSemantics = {
        indexToSemanticName: vi.fn().mockReturnValue('page-1'),
        indexToTitle: vi.fn().mockReturnValue('Page 1'),
        semanticNameToIndex: vi.fn().mockReturnValue(1),
      }
      const flipBook = new FlipBook({ pagesCount: 4, pageSemantics })
      expect(flipBook).toBeDefined()
    })
  })

  describe('render', () => {
    it('should throw error if container not found', () => {
      const flipBook = new FlipBook({ pagesCount: 4 })
      expect(() => flipBook.render('.non-existent')).toThrow(
        "Couldn't find container with selector: .non-existent"
      )
    })

    it('should throw error if no pages found', () => {
      const flipBook = new FlipBook({ pagesCount: 4 })
      expect(() => flipBook.render('.flipbook-container')).toThrow('No pages found in flipbook')
    })

    it('should render flipbook with pages', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      expect(flipBook.bookElement).toBe(container)
      expect(container.classList.contains('flipbook')).toBe(true)
    })

    it('should add flipbook class if not present', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      expect(container.classList.contains('flipbook')).toBe(true)
    })

    it('should not add duplicate flipbook class', () => {
      container.classList.add('flipbook')
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const flipbookClassCount = Array.from(container.classList).filter(
        (c) => c === 'flipbook'
      ).length
      expect(flipbookClassCount).toBe(1)
    })

    it('should set page styles correctly for LTR', () => {
      const pages = createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4, direction: 'ltr' })
      flipBook.render('.flipbook-container')

      pages.forEach((page, index) => {
        expect(page.dataset.pageIndex).toBe(index.toString())
        expect(page.style.width).toBeTruthy()
        expect(page.style.height).toBeTruthy()
      })
    })

    it('should set page styles correctly for RTL', () => {
      const pages = createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4, direction: 'rtl' })
      flipBook.render('.flipbook-container')

      pages.forEach((page, index) => {
        expect(page.dataset.pageIndex).toBe(index.toString())
      })
    })

    it('should mark first page as current-page', () => {
      const pages = createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      expect(pages[0].classList.contains('current-page')).toBe(true)
      expect(pages[0].classList.contains('odd')).toBe(true)
    })

    it('should set odd/even classes on pages', () => {
      const pages = createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      expect(pages[0].classList.contains('odd')).toBe(true)
      expect(pages[1].classList.contains('even')).toBe(true)
      expect(pages[2].classList.contains('odd')).toBe(true)
      expect(pages[3].classList.contains('even')).toBe(true)
    })

    it('should set perspective on book element', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      expect(container.style.perspective).toBeTruthy()
    })

    it('should apply pageSemantics to page elements', () => {
      const pages = createPages(4)
      const pageSemantics = {
        indexToSemanticName: vi.fn((idx: number) => `semantic-${idx}`),
        indexToTitle: vi.fn((idx: number) => `Title ${idx}`),
        semanticNameToIndex: vi.fn(() => null),
      }
      const flipBook = new FlipBook({ pagesCount: 4, pageSemantics })
      flipBook.render('.flipbook-container')

      pages.forEach((page, index) => {
        expect(page.dataset.pageSemanticName).toBe(`semantic-${index}`)
        expect(page.dataset.pageTitle).toBe(`Title ${index}`)
      })
    })

    it('should handle pages without pageSemantics', () => {
      const pages = createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      pages.forEach((page) => {
        expect(page.dataset.pageSemanticName).toBe('')
        expect(page.dataset.pageTitle).toBe('')
      })
    })

    it('should render debug bar when debug is true', () => {
      vi.useFakeTimers()
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container', true)
      setFlipBookInternals(flipBook, {
        currentLeaf: getFlipBookInternals(flipBook).leaves[0],
        flipDirection: FlipDirection.Forward,
      })

      vi.advanceTimersByTime(20)

      const debugBar = container.querySelector('.flipbook-debug-bar')
      expect(debugBar).toBeTruthy()

      vi.useRealTimers()
    })

    it('should render debug bar in RTL with no current leaf', () => {
      vi.useFakeTimers()
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4, direction: 'rtl' })
      flipBook.render('.flipbook-container', true)

      vi.advanceTimersByTime(20)

      const debugBar = container.querySelector('.flipbook-debug-bar')
      expect(debugBar?.innerHTML).toContain('RTL')
      expect(debugBar?.innerHTML).toContain('None')

      vi.useRealTimers()
    })
  })

  describe('touch events', () => {
    it('should handle touch start', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ pageX: 100, pageY: 200 } as Touch],
      })
      container.dispatchEvent(touchEvent)

      expect(flipBook.touchStartingPos).toEqual({ x: 100, y: 200 })
    })

    it('should ignore multi-touch on touchstart', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      // First set a position
      const singleTouch = new TouchEvent('touchstart', {
        touches: [{ pageX: 100, pageY: 200 } as Touch],
      })
      container.dispatchEvent(singleTouch)
      expect(flipBook.touchStartingPos).toEqual({ x: 100, y: 200 })

      // Multi-touch should not update position
      const multiTouch = new TouchEvent('touchstart', {
        touches: [{ pageX: 300, pageY: 400 } as Touch, { pageX: 500, pageY: 600 } as Touch],
      })
      container.dispatchEvent(multiTouch)

      // Position should remain unchanged
      expect(flipBook.touchStartingPos).toEqual({ x: 100, y: 200 })
    })

    it('should handle touchmove and prevent default for horizontal swipe', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      // Set starting position
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ pageX: 100, pageY: 200 } as Touch],
      })
      container.dispatchEvent(touchStart)

      // Horizontal swipe
      const touchMove = new TouchEvent('touchmove', {
        cancelable: true,
        touches: [{ pageX: 200, pageY: 210 } as Touch],
      })
      const preventDefaultSpy = vi.spyOn(touchMove, 'preventDefault')
      container.dispatchEvent(touchMove)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should not prevent default for vertical swipe', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      // Set starting position
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ pageX: 100, pageY: 200 } as Touch],
      })
      container.dispatchEvent(touchStart)

      // Vertical swipe
      const touchMove = new TouchEvent('touchmove', {
        cancelable: true,
        touches: [{ pageX: 110, pageY: 300 } as Touch],
      })
      const preventDefaultSpy = vi.spyOn(touchMove, 'preventDefault')
      container.dispatchEvent(touchMove)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('should ignore multi-touch on touchmove', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const touchStart = new TouchEvent('touchstart', {
        touches: [{ pageX: 100, pageY: 200 } as Touch],
      })
      container.dispatchEvent(touchStart)

      const multiTouchMove = new TouchEvent('touchmove', {
        cancelable: true,
        touches: [{ pageX: 200, pageY: 210 } as Touch, { pageX: 300, pageY: 310 } as Touch],
      })
      const preventDefaultSpy = vi.spyOn(multiTouchMove, 'preventDefault')
      container.dispatchEvent(multiTouchMove)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })
  })

  describe('jumpToPage', () => {
    it('should call onPageChanged callback', () => {
      const onPageChanged = vi.fn()
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4, onPageChanged })
      flipBook.render('.flipbook-container')

      flipBook.jumpToPage(2)

      expect(onPageChanged).toHaveBeenCalledWith(2)
    })

    it('should not throw if onPageChanged is not provided', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      expect(() => flipBook.jumpToPage(2)).not.toThrow()
    })
  })

  describe('odd page count', () => {
    it('should handle odd number of pages', () => {
      createPages(5)
      const flipBook = new FlipBook({ pagesCount: 5 })

      expect(() => flipBook.render('.flipbook-container')).not.toThrow()
    })

    it('should handle single page', () => {
      createPages(1)
      const flipBook = new FlipBook({ pagesCount: 1 })

      expect(() => flipBook.render('.flipbook-container')).not.toThrow()
    })

    it('should handle two pages', () => {
      createPages(2)
      const flipBook = new FlipBook({ pagesCount: 2 })

      expect(() => flipBook.render('.flipbook-container')).not.toThrow()
    })
  })

  describe('aspect ratio calculations', () => {
    it('should calculate leaf size from cover aspect ratio', () => {
      const pages = createPages(4)
      const flipBook = new FlipBook({
        pagesCount: 4,
        leafAspectRatio: { width: 2, height: 3 },
        coverAspectRatio: { width: 2.15, height: 3.15 },
      })
      flipBook.render('.flipbook-container')

      // Pages should have width and height set
      pages.forEach((page) => {
        const width = parseFloat(page.style.width)
        const height = parseFloat(page.style.height)
        expect(width).toBeGreaterThan(0)
        expect(height).toBeGreaterThan(0)
      })
    })
  })

  describe('internal state helpers', () => {
    it('should compute current leaves for open book', () => {
      const flipBook = new FlipBook({ pagesCount: 4 })
      const leafA = { index: 0, isTurned: false, isTurning: false }
      const leafB = { index: 1, isTurned: false, isTurning: false }
      setFlipBookInternals(flipBook, { leaves: [leafA, leafB] as never })

      const internals = getFlipBookInternals(flipBook)
      expect(internals.currentLeaves[0]).toBeUndefined()
      expect(internals.currentLeaves[1]).toBe(leafA)
      expect(internals.isClosed).toBe(true)
      expect(internals.isClosedInverted).toBe(false)
    })

    it('should compute current leaves for fully turned book', () => {
      const flipBook = new FlipBook({ pagesCount: 4 })
      const leafA = { index: 0, isTurned: true, isTurning: false }
      const leafB = { index: 1, isTurned: true, isTurning: false }
      setFlipBookInternals(flipBook, { leaves: [leafA, leafB] as never })

      const internals = getFlipBookInternals(flipBook)
      expect(internals.currentLeaves[0]).toBe(leafB)
      expect(internals.currentLeaves[1]).toBeUndefined()
      expect(internals.isClosed).toBe(false)
      expect(internals.isClosedInverted).toBe(true)
    })

    it('should compute current leaves for middle turned leaf', () => {
      const flipBook = new FlipBook({ pagesCount: 6 })
      const leafA = { index: 0, isTurned: false, isTurning: false }
      const leafB = { index: 1, isTurned: true, isTurning: false }
      const leafC = { index: 2, isTurned: false, isTurning: false }
      setFlipBookInternals(flipBook, { leaves: [leafA, leafB, leafC] as never })

      const internals = getFlipBookInternals(flipBook)
      expect(internals.currentLeaves[0]).toBe(leafB)
      expect(internals.currentLeaves[1]).toBe(leafC)
    })

    it('should compute current or turning leaves', () => {
      const flipBook = new FlipBook({ pagesCount: 4 })
      const leafA = { index: 0, isTurned: false, isTurning: true }
      const leafB = { index: 1, isTurned: false, isTurning: false }
      setFlipBookInternals(flipBook, { leaves: [leafA, leafB] as never })

      const internals = getFlipBookInternals(flipBook)
      expect(internals.currentOrTurningLeaves[0]).toBe(leafA)
      expect(internals.currentOrTurningLeaves[1]).toBe(leafB)
    })

    it('should update current-page classes on turn', () => {
      const pages = createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')
      getFlipBookInternals(flipBook).onTurned([1, 2], [0, 1])

      expect(pages[1].classList.contains('current-page')).toBe(true)
      expect(pages[2].classList.contains('current-page')).toBe(true)
      expect(pages[0].classList.contains('current-page')).toBe(false)
    })

    it('should avoid removing classes when no previous indices', () => {
      const pages = createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')
      getFlipBookInternals(flipBook).onTurned([0])

      expect(pages[0].classList.contains('current-page')).toBe(true)
    })

    it('should skip duplicate visible page update', async () => {
      vi.useFakeTimers()
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')
      setFlipBookInternals(flipBook, { prevVisiblePageIndices: [1, 2] })

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      const promise = leaf.flipToPosition(1, 10000 as never)
      await vi.runAllTimersAsync()
      await promise

      expect(getFlipBookInternals(flipBook).prevVisiblePageIndices).toEqual([1, 2])
      vi.useRealTimers()
    })

    it('should update visible pages on leaf turn', async () => {
      vi.useFakeTimers()
      const pages = createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      const promise = leaf.flipToPosition(1, 10000 as never)
      await vi.runAllTimersAsync()
      await promise

      expect(getFlipBookInternals(flipBook).prevVisiblePageIndices).toEqual([1, 2])
      expect(pages[1].classList.contains('current-page')).toBe(true)
      expect(pages[2].classList.contains('current-page')).toBe(true)

      vi.useRealTimers()
    })

    it('should set single visible page on last leaf forward', async () => {
      vi.useFakeTimers()
      const pages = createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[1]
      const promise = leaf.flipToPosition(1, 10000 as never)
      await vi.runAllTimersAsync()
      await promise

      expect(getFlipBookInternals(flipBook).prevVisiblePageIndices).toEqual([3])
      expect(pages[3].classList.contains('current-page')).toBe(true)

      vi.useRealTimers()
    })

    it('should set visible pages on backward turn for first leaf', async () => {
      vi.useFakeTimers()
      const pages = createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      const forward = leaf.flipToPosition(1, 10000 as never)
      await vi.runAllTimersAsync()
      await forward

      const backward = leaf.flipToPosition(0, 10000 as never)
      await vi.runAllTimersAsync()
      await backward

      expect(getFlipBookInternals(flipBook).prevVisiblePageIndices).toEqual([0])
      expect(pages[0].classList.contains('current-page')).toBe(true)

      vi.useRealTimers()
    })

    it('should set visible pages on backward turn for middle leaf', async () => {
      vi.useFakeTimers()
      const pages = createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[1]
      const forward = leaf.flipToPosition(1, 10000 as never)
      await vi.runAllTimersAsync()
      await forward

      const backward = leaf.flipToPosition(0, 10000 as never)
      await vi.runAllTimersAsync()
      await backward

      expect(getFlipBookInternals(flipBook).prevVisiblePageIndices).toEqual([1, 2])
      expect(pages[1].classList.contains('current-page')).toBe(true)
      expect(pages[2].classList.contains('current-page')).toBe(true)

      vi.useRealTimers()
    })
  })

  describe('drag handling', () => {
    it('should set flipStartingPos on drag start when idle', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')
      getFlipBookInternals(flipBook).onDragStart({ center: { x: 120 } })
      expect(getFlipBookInternals(flipBook).flipStartingPos).toBe(120)
    })

    it('should reset state when drag starts during auto flip', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')
      const mockCancelAnimation = vi.fn()
      setFlipBookInternals(flipBook, {
        currentLeaf: { index: 0, cancelAnimation: mockCancelAnimation } as never,
        flipDirection: FlipDirection.Forward,
        flipStartingPos: 50,
        isDuringAutoFlip: true,
      })
      getFlipBookInternals(flipBook).onDragStart({ center: { x: 200 } })

      expect(mockCancelAnimation).toHaveBeenCalled()
      const internals = getFlipBookInternals(flipBook)
      expect(internals.isDuringAutoFlip).toBe(false)
      expect(internals.currentLeaf).toBeUndefined()
      expect(internals.flipStartingPos).toBe(200)
    })

    it('should flip forward on drag update', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      const spy = vi.spyOn(leaf, 'efficientFlipToPosition')

      setFlipBookInternals(flipBook, { flipStartingPos: 400 })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 100 } })

      expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.Forward)
      expect(spy).toHaveBeenCalled()
    })

    it('should use existing current leaf on forward drag', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      const spy = vi.spyOn(leaf, 'efficientFlipToPosition')

      setFlipBookInternals(flipBook, { currentLeaf: leaf, flipStartingPos: 400 })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 100 } })

      expect(spy).toHaveBeenCalled()
    })

    it('should compute flipDelta for RTL during drag update', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4, direction: 'rtl' })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      const spy = vi.spyOn(leaf, 'efficientFlipToPosition')

      setFlipBookInternals(flipBook, { flipStartingPos: 100 })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 200 } })

      expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.Forward)
      expect(spy).toHaveBeenCalled()
    })

    it('should ignore drag update while manual flip is active', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')
      setFlipBookInternals(flipBook, { isDuringManualFlip: true })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 200 } })

      expect(getFlipBookInternals(flipBook).isDuringManualFlip).toBe(true)
    })

    it('should ignore drag update while auto flip is active', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')
      setFlipBookInternals(flipBook, { isDuringAutoFlip: true })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 200 } })

      expect(getFlipBookInternals(flipBook).isDuringAutoFlip).toBe(true)
    })

    it('should handle drag update when book element is undefined', () => {
      const flipBook = new FlipBook({ pagesCount: 4 })
      setFlipBookInternals(flipBook, { flipStartingPos: 100 })

      expect(() => getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 50 } })).not.toThrow()
      expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.None)
    })

    it('should return early when drag delta exceeds book width', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')
      setFlipBookInternals(flipBook, { flipStartingPos: 0 })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 1000 } })

      expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.None)
    })

    it('should return early when drag delta is zero', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')
      setFlipBookInternals(flipBook, { flipStartingPos: 100 })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 100 } })

      expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.None)
    })

    it('should return early for forward drag when delta is negative', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      const spy = vi.spyOn(leaf, 'efficientFlipToPosition')

      setFlipBookInternals(flipBook, { flipDirection: FlipDirection.Forward, flipStartingPos: 100 })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 300 } })

      expect(spy).not.toHaveBeenCalled()
    })

    it('should return early when book is closed inverted on forward drag', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[1]
      leaf.flipPosition = 1

      const spy = vi.spyOn(getFlipBookInternals(flipBook).leaves[0], 'efficientFlipToPosition')

      setFlipBookInternals(flipBook, { flipStartingPos: 400 })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 200 } })

      expect(spy).not.toHaveBeenCalled()
    })

    it('should flip backward on drag update when a leaf is turned', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      leaf.flipPosition = 1
      const spy = vi.spyOn(leaf, 'efficientFlipToPosition')

      setFlipBookInternals(flipBook, { flipStartingPos: 100 })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 300 } })

      expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.Backward)
      expect(spy).toHaveBeenCalled()
    })

    it('should use existing current leaf on backward drag', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      leaf.flipPosition = 1
      const spy = vi.spyOn(leaf, 'efficientFlipToPosition')

      setFlipBookInternals(flipBook, {
        currentLeaf: leaf,
        flipDirection: FlipDirection.Backward,
        flipStartingPos: 100,
      })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 300 } })

      expect(spy).toHaveBeenCalled()
    })

    it('should return early for backward drag when delta is positive', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      const spy = vi.spyOn(leaf, 'efficientFlipToPosition')

      setFlipBookInternals(flipBook, {
        flipDirection: FlipDirection.Backward,
        flipStartingPos: 300,
      })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 100 } })

      expect(spy).not.toHaveBeenCalled()
    })

    it('should return early when book is closed on backward drag', () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      const spy = vi.spyOn(leaf, 'efficientFlipToPosition')

      setFlipBookInternals(flipBook, {
        flipDirection: FlipDirection.Backward,
        flipStartingPos: 100,
      })
      getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 200 } })

      expect(spy).not.toHaveBeenCalled()
    })

    it('should reset when drag end without current leaf', async () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')
      setFlipBookInternals(flipBook, { flipDirection: FlipDirection.Forward, flipStartingPos: 50 })

      await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 0 })

      const internals = getFlipBookInternals(flipBook)
      expect(internals.flipDirection).toBe(FlipDirection.None)
      expect(internals.flipStartingPos).toBe(0)
    })

    it('should complete forward flip on drag end', async () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      vi.spyOn(leaf, 'flipToPosition').mockResolvedValue(undefined)
      setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Forward })

      await getFlipBookInternals(flipBook).onDragEnd({ velocityX: -1 })

      expect(leaf.flipToPosition).toHaveBeenCalledWith(1)
      expect(getFlipBookInternals(flipBook).currentLeaf).toBeUndefined()
    })

    it('should complete backward flip on drag end', async () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      leaf.flipPosition = 1
      vi.spyOn(leaf, 'flipToPosition').mockResolvedValue(undefined)
      setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Backward })

      await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 1 })

      expect(leaf.flipToPosition).toHaveBeenCalledWith(0)
      expect(getFlipBookInternals(flipBook).currentLeaf).toBeUndefined()
    })

    it('should choose flipTo=0 for slow forward drag', async () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      leaf.flipPosition = 0.2
      vi.spyOn(leaf, 'flipToPosition').mockResolvedValue(undefined)
      setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Forward })

      await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 0 })

      expect(leaf.flipToPosition).toHaveBeenCalledWith(0)
    })

    it('should choose flipTo=1 for slow backward drag', async () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      leaf.flipPosition = 0.8
      vi.spyOn(leaf, 'flipToPosition').mockResolvedValue(undefined)
      setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Backward })

      await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 0 })

      expect(leaf.flipToPosition).toHaveBeenCalledWith(1)
    })

    it('should respect RTL forward velocity threshold', async () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4, direction: 'rtl' })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      vi.spyOn(leaf, 'flipToPosition').mockResolvedValue(undefined)
      setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Forward })

      await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 1 })

      expect(leaf.flipToPosition).toHaveBeenCalledWith(1)
    })

    it('should respect RTL backward velocity threshold', async () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4, direction: 'rtl' })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      leaf.flipPosition = 0.2
      vi.spyOn(leaf, 'flipToPosition').mockResolvedValue(undefined)
      setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Backward })

      await getFlipBookInternals(flipBook).onDragEnd({ velocityX: -1 })

      expect(leaf.flipToPosition).toHaveBeenCalledWith(0)
    })

    it('should return on drag end when direction is none', async () => {
      createPages(4)
      const flipBook = new FlipBook({ pagesCount: 4 })
      flipBook.render('.flipbook-container')

      const leaf = getFlipBookInternals(flipBook).leaves[0]
      const spy = vi.spyOn(leaf, 'flipToPosition')

      setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.None })

      await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 0 })

      expect(spy).not.toHaveBeenCalled()
    })
  })
})
