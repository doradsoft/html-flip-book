import { FlipBook as FlipBookBase, type PageSemantics } from "html-flip-book-vanilla";
import type React from "react";
import { Children, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

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
	/** Get the "of" value for the indicator (e.g. total label). Defaults to total pages when not set. */
	getOf: () => string | number;
	/** Check if currently at the first page */
	isFirstPage: () => boolean;
	/** Check if currently at the last page */
	isLastPage: () => boolean;
}

/**
 * Configuration for book covers.
 */
export interface CoverConfig {
	/**
	 * Make covers "hard" - no page curl effect on covers.
	 * When true, cover pages appear flat without the soft page bend.
	 * Default: false
	 */
	hardCovers?: boolean;
	/**
	 * Disable shadow effects on cover pages.
	 * Default: false
	 */
	noShadow?: boolean;
	/**
	 * Page indices that are considered cover pages.
	 * Default: [0] (front cover only). Use [0, totalPages-1] for front and back covers.
	 * If "auto", uses first and last pages as covers.
	 */
	coverIndices?: number[] | "auto";
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
	/**
	 * Configuration for cover pages (front and back covers).
	 */
	coverConfig?: CoverConfig;
	/**
	 * Override for the "of" part of the page indicator (e.g. "נ" for Hebrew books).
	 * Defaults to total pages count when not set.
	 */
	of?: string | number;
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
			coverConfig,
			of,
		},
		ref,
	) => {
		const [currentPageIndex, setCurrentPageIndex] = useState(0);
		const setPageIndexRef = useRef(setCurrentPageIndex);
		setPageIndexRef.current = setCurrentPageIndex;
		const ofRef = useRef(of);
		ofRef.current = of;

		const flipBook = useRef(
			new FlipBookBase({
				pageSemantics: pageSemantics,
				pagesCount: pages.length,
				direction: direction,
				initialTurnedLeaves: initialTurnedLeaves,
				fastDeltaThreshold: fastDeltaThreshold,
				leavesBuffer: leavesBuffer,
				onPageChanged: (index: number) => setPageIndexRef.current?.(index),
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
				getOf: () => (ofRef.current !== undefined ? ofRef.current : flipBook.current.totalPages),
				isFirstPage: () => flipBook.current.isFirstPage,
				isLastPage: () => flipBook.current.isLastPage,
			}),
			[],
		);

		useEffect(() => {
			const currentFlipBook = flipBook.current;
			currentFlipBook.render(`.${className}`, debug);
			setCurrentPageIndex(currentFlipBook.currentPageIndex);

			// Cleanup function to destroy Hammer instance and event listeners
			return () => {
				currentFlipBook.destroy();
			};
		}, [className, debug]);

		// Use Children.toArray to get stable keys for each page element
		const pagesWithKeys = Children.toArray(pages);
		const totalPages = pagesWithKeys.length;

		// Determine cover page indices
		const coverIndicesSet = new Set(
			coverConfig?.coverIndices === "auto"
				? [0, totalPages - 1]
				: (coverConfig?.coverIndices ?? [0]),
		);
		const isCoverPage = (index: number) => coverIndicesSet.has(index);

		// Build CSS class for a page
		const getPageClassName = (index: number): string => {
			const classes = ["page"];
			if (isCoverPage(index)) {
				classes.push("page--cover");
				if (coverConfig?.hardCovers) {
					classes.push("page--hard");
				}
				if (coverConfig?.noShadow) {
					classes.push("page--no-shadow");
				}
			}
			return classes.join(" ");
		};

		// When leavesBuffer is set, only mount content for pages within the buffer (keep .page wrappers for layout).
		// Use a small margin so content is ready before vanilla shows the leaf (avoids empty flash when flipping).
		const contentByIndex =
			leavesBuffer != null && totalPages > 0
				? (() => {
						const currentLeaf = Math.floor(currentPageIndex / 2);
						const leavesCount = Math.ceil(totalPages / 2);
						const margin = 2; // extra leaves each side so content exists when vanilla reveals them
						const leafStart = Math.max(0, currentLeaf - leavesBuffer - margin);
						const leafEnd = Math.min(leavesCount - 1, currentLeaf + leavesBuffer + margin);
						const pageStart = leafStart * 2;
						const pageEnd = Math.min(totalPages - 1, leafEnd * 2 + 1);
						const inRange = new Set(
							Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i),
						);
						return (index: number) => (inRange.has(index) ? pagesWithKeys[index] : null);
					})()
				: (index: number) => pagesWithKeys[index];

		return (
			<div className={className}>
				{pagesWithKeys.map((_, index) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: stable slot identity for buffer/mount correctness
						key={`page-${index}`}
						className={getPageClassName(index)}
					>
						{contentByIndex(index)}
					</div>
				))}
			</div>
		);
	},
);

FlipBookReact.displayName = "FlipBook";

export { FlipBookReact as FlipBook };
export type { PageSemantics };
export type { TocEntry, TocPageProps } from "./TocPage";
export { TocPage } from "./TocPage";
