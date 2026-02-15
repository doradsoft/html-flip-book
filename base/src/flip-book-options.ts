import type { AspectRatio } from "./aspect-ratio";
import type { DownloadConfig } from "./download/types";
import type { PageSemantics } from "./page-semantics";

/**
 * Semantic info for the current page, passed to onPageFlipped and historyMapper.
 * Sourced from PageSemantics when available.
 */
export interface FlipPageSemantic {
	semanticName: string;
	title: string;
}

/** Direction of the flip for callback params. */
export type PageFlipDirection = "forward" | "backward";

/**
 * Params passed to onPageFlipping and onPageFlipped.
 * Describes the spread (target for flipping, current for flipped): leaf index, page indices, semantics, direction.
 */
export interface PageFlipParams {
	/** Index of the leaf that is (being) turned. */
	leafIndex: number;
	/** Left and right page indices of the spread (after the flip). */
	pageIndices: [number, number];
	/** Semantic info for the two pages; undefined when pageSemantics not set. */
	semantics: [FlipPageSemantic | undefined, FlipPageSemantic | undefined];
	/** Direction of the flip. */
	direction: PageFlipDirection;
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
	/** Callback fired when a flip animation starts. Receives params (leaf, spread page indices, semantics, direction). */
	onPageFlipping?: (params: PageFlipParams) => void;
	/** Callback fired when a flip completes. Receives params (leaf, spread page indices, semantics, direction). */
	onPageFlipped?: (params: PageFlipParams) => void;
	/**
	 * When set, the flip-book syncs with browser history: pushState on flip, restore page on popstate (back/forward).
	 * There is no built-in default; the consumer must provide this. When undefined, no history integration.
	 * @see https://github.com/doradsoft/html-flip-book/issues/168 — future default support.
	 */
	historyMapper?: HistoryMapper;
	/**
	 * When false, history integration is disabled (historyMapper ignored). When true or omitted, the
	 * provided historyMapper is used; there is no default implementation.
	 * @see https://github.com/doradsoft/html-flip-book/issues/168
	 */
	enableHistory?: boolean;
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
	/**
	 * Table of contents page index (book-level). Populates the store used by goToToc command and UI.
	 * Default: 4 (typical after front/back covers and soft covers).
	 */
	tocPageIndex?: number;
	/**
	 * Download configuration: entire book and page-range handlers plus filename hints.
	 * Toolbar (e.g. DownloadDropdown) reads this from the flipbook ref. There is no built-in default;
	 * the consumer must provide this.
	 * @see https://github.com/doradsoft/html-flip-book/issues/168 — future default support.
	 */
	downloadConfig?: DownloadConfig;
	/**
	 * When false, download is disabled (downloadConfig ignored, getDownloadConfig returns undefined).
	 * When true or omitted, the provided downloadConfig is used; there is no default implementation.
	 * @see https://github.com/doradsoft/html-flip-book/issues/168
	 */
	enableDownload?: boolean;
	/**
	 * When false, disables the inner page shadow/highlight (e.g. to avoid flicker with multiple books).
	 * Default: true.
	 */
	pageShadow?: boolean;
	/**
	 * When true, uses aggressive containment (`contain: strict`) on pages
	 * during flip animations so the browser can operate on a cached GPU
	 * texture rather than re-rendering page content every frame. This
	 * significantly reduces jank when flipping multiple pages rapidly.
	 * Default: false.
	 */
	snapshotDuringFlip?: boolean;
}
