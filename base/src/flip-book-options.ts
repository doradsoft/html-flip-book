import type { AspectRatio } from "./aspect-ratio";
import type { PageSemantics } from "./page-semantics";

/**
 * Configuration options for creating a FlipBook instance.
 *
 * @example
 * ```typescript
 * const flipBook = new FlipBook({
 *   pagesCount: 10,
 *   direction: 'ltr',
 *   leafAspectRatio: { width: 2, height: 3 },
 * });
 * ```
 */
export interface FlipBookOptions {
	/** Total number of pages in the book */
	pagesCount: number;
	/** Aspect ratio for inner pages. Default: { width: 2, height: 3 } */
	leafAspectRatio?: AspectRatio;
	/** Aspect ratio for cover pages. Default: { width: 2.15, height: 3.15 } */
	coverAspectRatio?: AspectRatio;
	/** Reading direction: 'ltr' (left-to-right) or 'rtl' (right-to-left). Default: 'ltr' */
	direction?: "rtl" | "ltr";
	/** Padding around the book */
	padding?: number;
	/** Define which pages are covers for special styling */
	pageSemantics?: PageSemantics;
	/** Callback fired when the current page changes */
	onPageChanged?: (pageIndex: number) => void;
	/** Velocity threshold (px/s) for fast swipe to complete flip. Default: 500 */
	fastDeltaThreshold?: number;
	/** Indices of leaves that should start in the turned (flipped) state. Default: [] */
	initialTurnedLeaves?: number[];
	/**
	 * Number of leaves to keep rendered before and after the current position.
	 * When set, only leaves within the buffer range are visible (have display: block).
	 * Leaves outside the buffer are hidden (display: none) for performance.
	 * The buffer dynamically updates as the user navigates.
	 * Default: undefined (all leaves are always rendered)
	 */
	leavesBuffer?: number;
	/**
	 * Page indices that are cover pages (sized to coverAspectRatio instead of leafAspectRatio).
	 * Both sides of a cover leaf use coverSize.
	 * If "auto", uses first and last pages: [0, pagesCount-1].
	 * Default: undefined (all pages use leafSize).
	 */
	coverPageIndices?: number[] | "auto";
}
