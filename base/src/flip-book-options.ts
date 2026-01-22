import type { AspectRatio } from "./aspect-ratio";
import type { PageSemantics } from "./page-semantics";

export interface FlipBookOptions {
	pagesCount: number;
	leafAspectRatio?: AspectRatio;
	coverAspectRatio?: AspectRatio;
	direction?: "rtl" | "ltr";
	padding?: number;
	pageSemantics?: PageSemantics;
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
}
