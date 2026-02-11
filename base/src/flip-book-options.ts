import type { AspectRatio } from "./aspect-ratio";
import type { PageSemantics } from "./page-semantics";

/**
 * Semantic info for the current page, passed to onPageFlipped and historyMapper.
 * Sourced from PageSemantics when available.
 */
export interface FlipPageSemantic {
	semanticName: string;
	title: string;
}

/**
 * Optional mapper to sync flip-book page with browser history (pushState on flip, restore on popstate).
 * When provided, the flip-book will pushState when the user flips and restore the page on back/forward.
 */
export interface HistoryMapper {
	/** Build a route string from the current page (and optional semantic). Used for pushState/replaceState. */
	pageToRoute: (pageIndex: number, semantic: FlipPageSemantic | undefined) => string;
	/** Parse a route string (e.g. from popstate) and return the page index, or null if invalid. */
	routeToPage: (route: string) => number | null;
}

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
	/** Callback fired when the user flips to a new page. Receives page index and semantic info (if pageSemantics is set). */
	onPageFlipped?: (pageIndex: number, semantic: FlipPageSemantic | undefined) => void;
	/**
	 * When set, the flip-book syncs with browser history: pushState on flip, restore page on popstate (back/forward).
	 * Default: undefined (no history integration).
	 */
	historyMapper?: HistoryMapper;
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
