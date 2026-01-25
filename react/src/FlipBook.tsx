import { FlipBook as FlipBookBase, type PageSemantics } from "html-flip-book-vanilla";
import type React from "react";
import { Children, forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Imperative handle exposed via ref for programmatic control of the FlipBook.
 *
 * @example
 * ```tsx
 * const ref = useRef<FlipBookHandle>(null);
 * // Later:
 * await ref.current?.flipNext();
 * ```
 */
export interface FlipBookHandle {
	/** Animate flip to the next page */
	flipNext: () => Promise<void>;
	/** Animate flip to the previous page */
	flipPrev: () => Promise<void>;
	/** Animate to a specific page index */
	goToPage: (pageIndex: number) => Promise<void>;
	/** Jump to a specific page instantly without animation */
	jumpToPage: (pageIndex: number) => void;
	/** Get the current (leftmost visible) page index */
	getCurrentPageIndex: () => number;
	/** Get the total number of pages */
	getTotalPages: () => number;
	/** Check if currently at the first page */
	isFirstPage: () => boolean;
	/** Check if currently at the last page */
	isLastPage: () => boolean;
}

/**
 * Props for the FlipBook React component.
 */
export interface FlipBookProps {
	/** Array of React elements to render as pages */
	pages: React.ReactNode[];
	/** CSS class name for the flipbook container */
	className: string;
	/** Define which pages are covers for special styling */
	pageSemantics?: PageSemantics;
	/** Enable debug mode */
	debug?: boolean;
	/** Reading direction: 'ltr' (left-to-right) or 'rtl' (right-to-left) */
	direction?: "rtl" | "ltr";
	/** Indices of leaves that should start in the turned (flipped) state */
	initialTurnedLeaves?: number[];
	/** Velocity threshold (px/s) for fast swipe to complete flip. Default: 500 */
	fastDeltaThreshold?: number;
	/**
	 * Number of leaves to keep rendered before and after the current position.
	 * When set, only leaves within the buffer range are visible for performance.
	 * Default: undefined (all leaves are always rendered)
	 */
	leavesBuffer?: number;
}

/**
 * A React component for creating realistic page-flip animations.
 *
 * @example
 * ```tsx
 * import { FlipBook } from 'html-flip-book-react';
 *
 * function App() {
 *   const ref = useRef<FlipBookHandle>(null);
 *   return (
 *     <FlipBook
 *       ref={ref}
 *       pages={[<div>Page 1</div>, <div>Page 2</div>]}
 *       className="my-book"
 *       direction="ltr"
 *     />
 *   );
 * }
 * ```
 */
const FlipBookReact = forwardRef<FlipBookHandle, FlipBookProps>(
	(
		{
			pages,
			className,
			debug = false,
			direction = "ltr",
			pageSemantics = undefined,
			initialTurnedLeaves = [],
			fastDeltaThreshold,
			leavesBuffer,
		},
		ref,
	) => {
		const flipBook = useRef(
			new FlipBookBase({
				pageSemantics: pageSemantics,
				pagesCount: pages.length,
				direction: direction,
				initialTurnedLeaves: initialTurnedLeaves,
				fastDeltaThreshold: fastDeltaThreshold,
				leavesBuffer: leavesBuffer,
			}),
		);

		// Expose imperative methods via ref
		useImperativeHandle(
			ref,
			() => ({
				flipNext: () => flipBook.current.flipNext(),
				flipPrev: () => flipBook.current.flipPrev(),
				goToPage: (pageIndex: number) => flipBook.current.goToPage(pageIndex),
				jumpToPage: (pageIndex: number) => flipBook.current.jumpToPage(pageIndex),
				getCurrentPageIndex: () => flipBook.current.currentPageIndex,
				getTotalPages: () => flipBook.current.totalPages,
				isFirstPage: () => flipBook.current.isFirstPage,
				isLastPage: () => flipBook.current.isLastPage,
			}),
			[],
		);

		useEffect(() => {
			const currentFlipBook = flipBook.current;
			currentFlipBook.render(`.${className}`, debug);

			// Cleanup function to destroy Hammer instance and event listeners
			return () => {
				currentFlipBook.destroy();
			};
		}, [className, debug]);

		// Use Children.toArray to get stable keys for each page element
		const pagesWithKeys = Children.toArray(pages);

		return (
			<div className={className}>
				{pagesWithKeys.map((page) => (
					<div key={(page as React.ReactElement).key} className="page">
						{page}
					</div>
				))}
			</div>
		);
	},
);

FlipBookReact.displayName = "FlipBook";

export { FlipBookReact as FlipBook };
export type { PageSemantics };
