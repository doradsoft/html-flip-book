import type { AspectRatio } from './aspect-ratio'
import type { PageSemantics } from './page-semantics'

export interface FlipBookOptions {
  pagesCount: number
  leafAspectRatio?: AspectRatio
  coverAspectRatio?: AspectRatio
  direction?: 'rtl' | 'ltr'
  padding?: number
  pageSemantics?: PageSemantics
  onPageChanged?: (pageIndex: number) => void
  /** Velocity threshold (px/s) for fast swipe to complete flip. Default: 500 */
  fastDeltaThreshold?: number
  /** Indices of leaves that should start in the turned (flipped) state. Default: [] */
  initialTurnedLeaves?: number[]
}
