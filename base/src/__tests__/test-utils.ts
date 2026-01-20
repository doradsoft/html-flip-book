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
  onTurned: (newVisiblePageIndices: number[], oldVisiblePageIndices?: number[]) => void
  onDragStart: (event: { center: { x: number } }) => void
  onDragUpdate: (event: { center: { x: number } }) => void
  onDragEnd: (event: { velocityX: number }) => Promise<void>
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
