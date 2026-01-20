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
}
