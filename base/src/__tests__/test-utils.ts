import type { FlipDirection } from '../flip-direction'
import type { FlipBook } from '../flipbook'
import type { FlipPosition, Leaf } from '../leaf'

// Type-safe test accessors for private members
// This avoids using `any` while allowing tests to access internals

interface LeafTestable {
  currentAnimation: Promise<void> | null
  targetFlipPosition: FlipPosition | null
}

interface MockLeaf {
  index: number
  isTurned: boolean
  isTurning: boolean
  flipPosition?: number
  efficientFlipToPosition?: ReturnType<typeof import('vitest').vi.fn>
  flipToPosition?: ReturnType<typeof import('vitest').vi.fn>
}

interface FlipBookTestable {
  leaves: Leaf[]
  currentLeaf: Leaf | MockLeaf | undefined
  flipDirection: FlipDirection
  flipStartingPos: number
  flipDelta: number
  isDuringManualFlip: boolean
  isDuringAutoFlip: boolean
  prevVisiblePageIndices: [number] | [number, number] | undefined
  currentLeaves: [Leaf | undefined, Leaf | undefined]
  currentOrTurningLeaves: [Leaf | undefined, Leaf | undefined]
  isClosed: boolean
  isClosedInverted: boolean
  fastDeltaThreshold: number
  onTurned: (newVisiblePageIndices: number[], oldVisiblePageIndices?: number[]) => void
  onDragStart: (event: { center: { x: number } }) => void
  onDragUpdate: (event: { center: { x: number } }) => void
  onDragEnd: (event: { velocityX: number }) => Promise<void>
}

/** State snapshot of a Leaf for assertions */
export interface LeafState {
  index: number
  flipPosition: number
  isTurned: boolean
  isTurning: boolean
  isAnimating: boolean
}

/** State snapshot of FlipBook for assertions */
export interface FlipBookState {
  flipDirection: FlipDirection
  flipDelta: number
  isDuringManualFlip: boolean
  isDuringAutoFlip: boolean
  currentLeafIndex: number | undefined
  visibleLeafIndices: number[]
}

/** Extract observable state from a Leaf */
export function getLeafState(leaf: Leaf): LeafState {
  const internals = getLeafInternals(leaf)
  return {
    index: leaf.index,
    flipPosition: leaf.flipPosition,
    isTurned: leaf.isTurned,
    isTurning: leaf.isTurning,
    isAnimating: internals.currentAnimation !== null,
  }
}

/** Extract observable state from FlipBook */
export function getFlipBookState(flipBook: FlipBook): FlipBookState {
  const internals = getFlipBookInternals(flipBook)
  const visibleIndices: number[] = []
  for (const leaf of internals.leaves) {
    if (!leaf.isTurned || leaf.isTurning) {
      visibleIndices.push(leaf.index)
    }
  }
  return {
    flipDirection: internals.flipDirection,
    flipDelta: internals.flipDelta,
    isDuringManualFlip: internals.isDuringManualFlip,
    isDuringAutoFlip: internals.isDuringAutoFlip,
    currentLeafIndex: internals.currentLeaf?.index,
    visibleLeafIndices: visibleIndices,
  }
}

/** Create a mock container with pages for testing */
export function createMockContainer(
  pageCount: number,
  options: { width?: number; height?: number } = {}
): { container: HTMLDivElement; pages: HTMLDivElement[] } {
  const { width = 800, height = 600 } = options
  const container = document.createElement('div')
  container.className = 'flipbook-container'
  Object.defineProperty(container, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(container, 'clientHeight', { value: height, configurable: true })

  const pages: HTMLDivElement[] = []
  for (let i = 0; i < pageCount; i++) {
    const page = document.createElement('div')
    page.className = 'page'
    container.appendChild(page)
    pages.push(page)
  }

  document.body.appendChild(container)
  return { container, pages }
}

/** Create a HammerInput-like event for testing drag handlers */
export function createDragEvent(
  _type: 'start' | 'move' | 'end',
  options: { x?: number; y?: number; velocityX?: number; velocityY?: number } = {}
): { center: { x: number; y: number }; velocityX: number; velocityY: number } {
  const { x = 400, y = 300, velocityX = 0, velocityY = 0 } = options
  return {
    center: { x, y },
    velocityX,
    velocityY,
  }
}

export function getLeafInternals(leaf: Leaf): LeafTestable {
  return leaf as unknown as LeafTestable
}

export function getFlipBookInternals(flipBook: FlipBook): FlipBookTestable {
  return flipBook as unknown as FlipBookTestable
}

export function setLeafInternals(leaf: Leaf, updates: Partial<LeafTestable>): void {
  const internals = leaf as unknown as LeafTestable
  if (updates.currentAnimation !== undefined) {
    internals.currentAnimation = updates.currentAnimation
  }
  if (updates.targetFlipPosition !== undefined) {
    internals.targetFlipPosition = updates.targetFlipPosition
  }
}

export function setFlipBookInternals(
  flipBook: FlipBook,
  updates: Partial<
    Omit<
      FlipBookTestable,
      | 'currentLeaves'
      | 'currentOrTurningLeaves'
      | 'isClosed'
      | 'isClosedInverted'
      | 'onTurned'
      | 'onDragStart'
      | 'onDragUpdate'
      | 'onDragEnd'
    >
  >
): void {
  const internals = flipBook as unknown as FlipBookTestable
  if (updates.leaves !== undefined) {
    internals.leaves = updates.leaves
  }
  if (updates.currentLeaf !== undefined) {
    internals.currentLeaf = updates.currentLeaf
  }
  if (updates.flipDirection !== undefined) {
    internals.flipDirection = updates.flipDirection
  }
  if (updates.flipStartingPos !== undefined) {
    internals.flipStartingPos = updates.flipStartingPos
  }
  if (updates.flipDelta !== undefined) {
    internals.flipDelta = updates.flipDelta
  }
  if (updates.isDuringManualFlip !== undefined) {
    internals.isDuringManualFlip = updates.isDuringManualFlip
  }
  if (updates.isDuringAutoFlip !== undefined) {
    internals.isDuringAutoFlip = updates.isDuringAutoFlip
  }
  if (updates.prevVisiblePageIndices !== undefined) {
    internals.prevVisiblePageIndices = updates.prevVisiblePageIndices
  }
}
