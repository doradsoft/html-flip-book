import {
	FlipBook as FlipBookBase,
	type HistoryMapper,
	type PageFlipParams,
	type PageSemantics,
} from "html-flip-book-vanilla";
import type { DownloadConfig } from "html-flip-book-vanilla/download";
import type React from "react";
import { Children, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

/**
 * Imperative handle exposed via ref for programmatic control of the FlipBook.
 * Flipbook methods (flipNext, jumpToPage, etc.) are called internally by commands;
 * consumers interact through commands (execute) and getters (ref).
 *
 * @example
 * ```tsx
 * const ref = useRef<FlipBookHandle>(null);
 * const page = ref.current?.getCurrentPageIndex();
 * ```
 */
export interface FlipBookHandle {
	/** Animate flip to the next page */
	flipNext: () => Promise<void>;
	/** Animate flip to the previous page */
	flipPrev: () => Promise<void>;
	/** Animate flip to a specific page index */
	flipToPage: (pageIndex: number) => Promise<void>;
	/** Jump to a specific page instantly without animation */
	jumpToPage: (pageIndex: number) => void;
	/** Toggle debug toolbar visibility (when debug mode is enabled). Bound to Ctrl+Alt+D by default. */
	toggleDebugBar?: () => void;
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
	/** Get download configuration for the book. Undefined when no download is configured. */
	getDownloadConfig: () => DownloadConfig | undefined;
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
	/**
	 * CSS class applied to interior sides of cover leaves (the endpaper).
	 * Sets the page background to the cover color; the white endpaper inset
	 * is created automatically by the infrastructure.
	 */
	interiorCoverClassName?: string;
	/**
	 * Override interiorCoverClassName for the front cover interior specifically.
	 */
	frontInteriorCoverClassName?: string;
	/**
	 * Override interiorCoverClassName for the back cover interior specifically.
	 */
	backInteriorCoverClassName?: string;
	/**
	 * Inset size for the interior endpaper frame.
	 * Any valid CSS length (e.g. "5%", "12px"). Default: "5%".
	 */
	coverInset?: string;
}

/**
 * Handlers for FlipBook events. Pass via the `handlers` prop.
 */
export interface FlipBookHandlers {
	/** Fired when a flip animation starts. Params: leaf index, page indices, semantics, direction. */
	onPageFlipping?: (params: PageFlipParams) => void;
	/** Fired when a flip completes. Params: leaf index, page indices, semantics, direction. */
	onPageFlipped?: (params: PageFlipParams) => void;
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
	 * Override for the "of" part of the page indicator (e.g. a gematria letter for the total, like "נ" for 50 in Hebrew books).
	 * Defaults to total pages count when not set.
	 */
	of?: string | number;
	/**
	 * Aspect ratio for inner pages (text block leaves).
	 * Default: { width: 2, height: 3 }
	 */
	leafAspectRatio?: { width: number; height: number };
	/**
	 * Aspect ratio for cover boards (slightly larger than leaf).
	 * The delta between cover and leaf aspect ratios determines the visible frame.
	 * Default: { width: 2.15, height: 3.15 }
	 */
	coverAspectRatio?: { width: number; height: number };
	/**
	 * Event handlers. Use this to pass callbacks (e.g. onPageFlipped) instead of top-level props.
	 */
	handlers?: FlipBookHandlers;
	/**
	 * When set, syncs the flip-book with browser history: pushState on flip, restore page on back/forward.
	 * Default: undefined.
	 */
	historyMapper?: HistoryMapper;
	/**
	 * Table of contents page index (book-level). Populates the store used by goToToc command and TocButton.
	 * Default: 4.
	 */
	tocPageIndex?: number;
	/**
	 * Download configuration: entire book and page-range handlers plus filename hints.
	 * Toolbar's DownloadDropdown reads this from the flipbook ref.
	 */
	downloadConfig?: DownloadConfig;
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
			leafAspectRatio,
			coverAspectRatio,
			handlers,
			historyMapper,
			tocPageIndex,
			downloadConfig,
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
				leafAspectRatio: leafAspectRatio,
				coverAspectRatio: coverAspectRatio,
				coverPageIndices: coverConfig?.coverIndices,
				onPageChanged: (index: number) => setPageIndexRef.current?.(index),
				onPageFlipping: handlers?.onPageFlipping,
				onPageFlipped: handlers?.onPageFlipped,
				historyMapper,
				tocPageIndex: tocPageIndex ?? 4,
				downloadConfig,
			}),
		);

		// Expose imperative handle: flipbook methods (called by commands) and getters (for UI)
		useImperativeHandle(
			ref,
			() => ({
				flipNext: () => flipBook.current.flipNext(),
				flipPrev: () => flipBook.current.flipPrev(),
				flipToPage: (pageIndex: number) => flipBook.current.flipToPage(pageIndex),
				jumpToPage: (pageIndex: number) => flipBook.current.jumpToPage(pageIndex),
				toggleDebugBar: () => {
					const root = document.querySelector(`.${className}`);
					const bar = root?.querySelector(".flipbook-debug-bar");
					if (bar) bar.classList.toggle("flipbook-debug-bar--hidden");
				},
				getCurrentPageIndex: () => flipBook.current.currentPageIndex,
				getTotalPages: () => flipBook.current.totalPages,
				getOf: () => (ofRef.current !== undefined ? ofRef.current : flipBook.current.totalPages),
				isFirstPage: () => flipBook.current.isFirstPage,
				isLastPage: () => flipBook.current.isLastPage,
				getDownloadConfig: () => flipBook.current.getDownloadConfig(),
			}),
			[className],
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

		// Compute interior cover page indices (the other side of each cover leaf).
		// Leaf pairs: [0,1], [2,3], ... — interior is the paired page on the same leaf.
		const interiorCoverMap = new Map<number, "front" | "back">();
		if (
			coverConfig?.interiorCoverClassName ||
			coverConfig?.frontInteriorCoverClassName ||
			coverConfig?.backInteriorCoverClassName
		) {
			for (const coverIdx of coverIndicesSet) {
				const interiorIdx = coverIdx % 2 === 0 ? coverIdx + 1 : coverIdx - 1;
				if (interiorIdx >= 0 && interiorIdx < totalPages && !coverIndicesSet.has(interiorIdx)) {
					// First cover index = front, others = back
					const role = coverIdx === Math.min(...coverIndicesSet) ? "front" : "back";
					interiorCoverMap.set(interiorIdx, role);
				}
			}
		}

		const coverInset = coverConfig?.coverInset ?? "5%";

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
			const interiorRole = interiorCoverMap.get(index);
			if (interiorRole) {
				classes.push("page--cover-interior");
				const cls =
					interiorRole === "front"
						? (coverConfig?.frontInteriorCoverClassName ?? coverConfig?.interiorCoverClassName)
						: (coverConfig?.backInteriorCoverClassName ?? coverConfig?.interiorCoverClassName);
				if (cls) classes.push(cls);
			}
			return classes.join(" ");
		};

		// When leavesBuffer is set, only mount content for pages within the buffer (keep .page wrappers for layout).
		// Use a small margin so content is ready before vanilla shows the leaf (avoids empty flash when flipping).
		// Cover pages are always mounted — they are cover-sized and sit behind leaf-sized pages,
		// acting as the physical book boards. Unmounting them would remove the realistic frame effect.
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
						// Always include cover leaf pages so the larger cover boards remain mounted.
						for (const idx of coverIndicesSet) {
							inRange.add(idx);
							// Also include the other side of the cover leaf
							const partner = idx % 2 === 0 ? idx + 1 : idx - 1;
							if (partner >= 0 && partner < totalPages) {
								inRange.add(partner);
							}
						}
						return (index: number) => (inRange.has(index) ? pagesWithKeys[index] : null);
					})()
				: (index: number) => pagesWithKeys[index];

		/** Wrap interior cover pages with the endpaper inset frame (3-sided: no inset on spine). */
		const renderPageContent = (index: number) => {
			const content = contentByIndex(index);
			if (interiorCoverMap.has(index)) {
				// Determine spine side: even pages (engine convention: pageIndex%2===1) are on the
				// left in LTR / right in RTL. Their spine is on the opposite side.
				const isEvenPage = index % 2 === 1; // engine: (pageIndex+1)%2===1 → odd; so %2===1 → even
				const spineOnRight = isEvenPage !== (direction === "rtl");
				const insetStyle = {
					"--cover-inset": coverInset,
					...(spineOnRight ? { "--cover-inset-right": "0px" } : { "--cover-inset-left": "0px" }),
				} as Record<string, string>;
				return (
					<div className="page--cover-interior-inset" style={insetStyle}>
						{content}
					</div>
				);
			}
			return content;
		};

		return (
			<div className={className}>
				{pagesWithKeys.map((_, index) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: stable slot identity for buffer/mount correctness
						key={`page-${index}`}
						className={getPageClassName(index)}
					>
						{renderPageContent(index)}
					</div>
				))}
			</div>
		);
	},
);

FlipBookReact.displayName = "FlipBook";

export { FlipBookReact as FlipBook };
export type {
	FlipPageSemantic,
	HistoryMapper,
	PageFlipParams,
	PageSemantics,
} from "html-flip-book-vanilla";
export type { TocEntry, TocPageProps } from "./TocPage";
export { TocPage } from "./TocPage";
