import { FlipDirection } from '../flip-direction'
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

/** State for a single flip operation - matches flipbook.ts FlipState */
interface FlipState {
  leaf: Leaf | MockLeaf
  direction: FlipDirection
  startingPos: number
  delta: number
  isDuringAutoFlip: boolean
}

interface FlipBookTestableRaw {
  leaves: Leaf[]
  activeFlips: Map<number, FlipState>
  pendingFlipStartingPos: number
  pendingFlipDirection: FlipDirection
  prevVisiblePageIndices: [number] | [number, number] | undefined
  currentOrTurningLeaves: [Leaf | undefined, Leaf | undefined]
  fastDeltaThreshold: number
  onTurned: (newVisiblePageIndices: number[], oldVisiblePageIndices?: number[]) => void
  onDragStart: (event: { center: { x: number } }) => void
  onDragUpdate: (event: { center: { x: number } }) => void
  onDragEnd: (event: { velocityX: number }) => Promise<void>
}

/** Backwards-compatible interface for tests using old property names */
interface FlipBookTestable extends FlipBookTestableRaw {
  // Derived properties for backwards compatibility with tests
  currentLeaf: Leaf | MockLeaf | undefined
  flipDirection: FlipDirection
  flipStartingPos: number
  flipDelta: number
  isDuringManualFlip: boolean
  isDuringAutoFlip: boolean
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
  const raw = flipBook as unknown as FlipBookTestableRaw

  // Helper to compute currentLeaves from leaves array
  const computeCurrentLeaves = (): [Leaf | undefined, Leaf | undefined] => {
    const leaves = raw.leaves
    if (!leaves || leaves.length === 0) return [undefined, undefined]

    // Find the last turned leaf
    let lastTurnedIndex = -1
    for (let i = leaves.length - 1; i >= 0; i--) {
      if (leaves[i].isTurned) {
        lastTurnedIndex = i
        break
      }
    }

    if (lastTurnedIndex === -1) {
      // No turned leaves - book is at start
      return [undefined, leaves[0]]
    } else if (lastTurnedIndex === leaves.length - 1) {
      // All leaves turned - book is at end
      return [leaves[lastTurnedIndex], undefined]
    } else {
      // Somewhere in the middle
      return [leaves[lastTurnedIndex], leaves[lastTurnedIndex + 1]]
    }
  }

  // Create a wrapper with backwards-compatible derived properties
  return {
    // Raw properties
    leaves: raw.leaves,
    activeFlips: raw.activeFlips,
    pendingFlipStartingPos: raw.pendingFlipStartingPos,
    pendingFlipDirection: raw.pendingFlipDirection,
    prevVisiblePageIndices: raw.prevVisiblePageIndices,
    currentOrTurningLeaves: raw.currentOrTurningLeaves,
    fastDeltaThreshold: raw.fastDeltaThreshold,
    onTurned: raw.onTurned.bind(flipBook),
    onDragStart: raw.onDragStart.bind(flipBook),
    onDragUpdate: raw.onDragUpdate.bind(flipBook),
    onDragEnd: raw.onDragEnd.bind(flipBook),

    // Computed properties (removed from FlipBook class)
    get currentLeaves(): [Leaf | undefined, Leaf | undefined] {
      return computeCurrentLeaves()
    },

    get isClosed(): boolean {
      return !computeCurrentLeaves()[0]
    },

    get isClosedInverted(): boolean {
      return !computeCurrentLeaves()[1]
    },

    // Derived properties for backwards compatibility
    get currentLeaf(): Leaf | MockLeaf | undefined {
      // Find the first non-auto flip (manual flip)
      for (const flip of raw.activeFlips.values()) {
        if (!flip.isDuringAutoFlip) {
          return flip.leaf
        }
      }
      // If no manual flip, return first flip
      const firstFlip = raw.activeFlips.values().next().value
      return firstFlip?.leaf
    },

    get flipDirection(): FlipDirection {
      // Return direction of the first non-auto flip, or pending direction
      for (const flip of raw.activeFlips.values()) {
        if (!flip.isDuringAutoFlip) {
          return flip.direction
        }
      }
      return raw.pendingFlipDirection
    },

    get flipStartingPos(): number {
      // Return starting pos of first non-auto flip, or pending
      for (const flip of raw.activeFlips.values()) {
        if (!flip.isDuringAutoFlip) {
          return flip.startingPos
        }
      }
      return raw.pendingFlipStartingPos
    },

    get flipDelta(): number {
      // Return delta of first non-auto flip
      for (const flip of raw.activeFlips.values()) {
        if (!flip.isDuringAutoFlip) {
          return flip.delta
        }
      }
      return 0
    },

    get isDuringManualFlip(): boolean {
      // True if any flip is non-auto
      for (const flip of raw.activeFlips.values()) {
        if (!flip.isDuringAutoFlip) {
          return true
        }
      }
      return false
    },

    get isDuringAutoFlip(): boolean {
      // True if all flips are auto (or no flips)
      if (raw.activeFlips.size === 0) return false
      for (const flip of raw.activeFlips.values()) {
        if (!flip.isDuringAutoFlip) {
          return false
        }
      }
      return true
    },
  }
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
  updates: {
    leaves?: Leaf[]
    currentLeaf?: Leaf | MockLeaf
    flipDirection?: FlipDirection
    flipStartingPos?: number
    flipDelta?: number
    isDuringManualFlip?: boolean
    isDuringAutoFlip?: boolean
    prevVisiblePageIndices?: [number] | [number, number]
    activeFlips?: Map<number, FlipState>
  }
): void {
  const raw = flipBook as unknown as FlipBookTestableRaw

  if (updates.leaves !== undefined) {
    raw.leaves = updates.leaves
  }
  if (updates.prevVisiblePageIndices !== undefined) {
    raw.prevVisiblePageIndices = updates.prevVisiblePageIndices
  }

  // Handle new activeFlips directly
  if (updates.activeFlips !== undefined) {
    raw.activeFlips = updates.activeFlips
  }

  // Handle backwards-compatible updates by manipulating activeFlips
  if (
    updates.currentLeaf !== undefined ||
    updates.flipDirection !== undefined ||
    updates.flipStartingPos !== undefined ||
    updates.flipDelta !== undefined ||
    updates.isDuringManualFlip !== undefined ||
    updates.isDuringAutoFlip !== undefined
  ) {
    // If setting currentLeaf, create or update a FlipState
    if (updates.currentLeaf !== undefined) {
      const leafIndex = updates.currentLeaf.index
      const existingFlip = raw.activeFlips.get(leafIndex)
      const flipState: FlipState = {
        leaf: updates.currentLeaf,
        direction: updates.flipDirection ?? existingFlip?.direction ?? FlipDirection.None,
        startingPos: updates.flipStartingPos ?? existingFlip?.startingPos ?? 0,
        delta: updates.flipDelta ?? existingFlip?.delta ?? 0,
        isDuringAutoFlip: updates.isDuringAutoFlip ?? existingFlip?.isDuringAutoFlip ?? false,
      }
      raw.activeFlips.set(leafIndex, flipState)
    } else if (updates.flipStartingPos !== undefined && raw.activeFlips.size === 0) {
      // Setting just flipStartingPos without currentLeaf - use pending state
      raw.pendingFlipStartingPos = updates.flipStartingPos
    } else if (updates.flipDirection !== undefined && raw.activeFlips.size === 0) {
      // Setting just flipDirection without currentLeaf - use pending state
      raw.pendingFlipDirection = updates.flipDirection
    }

    // Update existing flip states if we have them
    if (raw.activeFlips.size > 0) {
      for (const flip of raw.activeFlips.values()) {
        if (updates.flipDirection !== undefined) {
          flip.direction = updates.flipDirection
        }
        if (updates.flipStartingPos !== undefined) {
          flip.startingPos = updates.flipStartingPos
        }
        if (updates.flipDelta !== undefined) {
          flip.delta = updates.flipDelta
        }
        if (updates.isDuringAutoFlip !== undefined) {
          flip.isDuringAutoFlip = updates.isDuringAutoFlip
        }
        // isDuringManualFlip is the inverse of isDuringAutoFlip
        if (updates.isDuringManualFlip !== undefined) {
          flip.isDuringAutoFlip = !updates.isDuringManualFlip
        }
      }
    }

    // Handle isDuringManualFlip/isDuringAutoFlip without a currentLeaf
    // In the new architecture, these are derived from activeFlips
    // So we can't set them directly when there's no flip
    if (updates.isDuringManualFlip === true && raw.activeFlips.size === 0) {
      // Create a placeholder flip state - tests will need a leaf
      // This is a partial state that tests should complete
    }
    if (updates.isDuringAutoFlip === true && raw.activeFlips.size === 0) {
      // Create a placeholder - tests typically also set currentLeaf
    }
  }
}
