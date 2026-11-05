import {
	type BookmarkProvider as BaseBookmarkProvider,
	type Bookmark,
	FlipBook as FlipBookBase,
	type HistoryMapper,
	type MouseMode,
	type PageFlipParams,
	type PageSemantics,
} from "html-flip-book-vanilla";
// Bundle the complete core stylesheet into this package's styles entry, so
// React consumers get pages, covers, scrollports and bookmarks from
// `html-flip-book-react/styles.css` alone — the vanilla package stays a
// JavaScript-only dependency here.
import "../../base/src/flipbook.scss";
import "../../base/src/pages.scss";
import "../../base/src/bookmarks.scss";
import "../../base/src/mouse-mode.scss";
import type { DownloadConfig } from "html-flip-book-vanilla/download";
import type React from "react";
import {
	Children,
	forwardRef,
	memo,
	startTransition,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

/** Bookmark content is rendered with React and keeps access to the consumer's contexts. */
export type BookmarkProvider = BaseBookmarkProvider<React.ReactNode>;

interface BookmarkSlot {
	key: string;
	bookmark: Bookmark;
	element: HTMLElement;
	renderer: BookmarkProvider["renderBookmark"];
}

// Native pointer handlers need the committed mount window before a new frame.
// Server rendering has no native handlers and must not run a layout effect.
const usePageMountEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Bookmark updates must not reconcile the surrounding scripture/page tree. */
const BookmarkPortals = memo(function BookmarkPortals({
	bookmarkProvider,
	flipBook,
}: {
	bookmarkProvider: BookmarkProvider | undefined;
	flipBook: FlipBookBase;
}) {
	const [bookmarkSlots, setBookmarkSlots] = useState<BookmarkSlot[]>([]);
	useEffect(() => {
		if (!bookmarkProvider) {
			setBookmarkSlots([]);
			return;
		}
		let active = true;
		const slots = new Map<string, BookmarkSlot>();
		const renderSlot = (bookmark: Bookmark, expanded: boolean): HTMLElement => {
			const key = `${expanded ? "expanded" : "brief"}:${bookmark.id}`;
			let slot = slots.get(key);
			if (!slot) {
				slot = {
					key,
					bookmark,
					element: Object.assign(document.createElement("span"), {
						className: "flipbook-bookmark__renderer",
					}),
					renderer: expanded
						? bookmarkProvider.renderExpandedBookmark
						: bookmarkProvider.renderBookmark,
				};
				slots.set(key, slot);
			}
			slot.bookmark = bookmark;
			return slot.element;
		};
		const provider: BaseBookmarkProvider = {
			...bookmarkProvider,
			getBookmarks: (context) => {
				const bookmarks = bookmarkProvider.getBookmarks(context);
				const ids = new Set(bookmarks.map((bookmark) => bookmark.id));
				for (const [key, slot] of slots) {
					if (!ids.has(slot.bookmark.id)) slots.delete(key);
				}
				queueMicrotask(() => {
					if (!active) return;
					for (const [id, slot] of slots) {
						if (!slot.element.isConnected) slots.delete(id);
					}
					// Keep contextual custom renderers fresh, including consumers
					// returning the same bookmark object. Only this subtree updates.
					setBookmarkSlots([...slots.values()]);
				});
				return bookmarks;
			},
			renderBookmark: (bookmark) => renderSlot(bookmark, false),
			renderExpandedBookmark: bookmarkProvider.renderExpandedBookmark
				? (bookmark) => renderSlot(bookmark, true)
				: undefined,
		};
		flipBook.setBookmarkProvider(provider);
		return () => {
			active = false;
			flipBook.setBookmarkProvider(undefined);
		};
	}, [bookmarkProvider, flipBook]);
	return (
		<>
			{bookmarkSlots.map(({ key, bookmark, element, renderer }) =>
				createPortal(renderer ? renderer(bookmark) : bookmark.label, element, key),
			)}
		</>
	);
});

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
	/** Hold background page-buffer work from pointer press through release. Custom toolbars can call this on pointerdown. */
	beginPointerInteraction?: () => void;
	/** Animate flip to the next page */
	flipNext: () => Promise<void>;
	/** Animate flip to the previous page */
	flipPrev: () => Promise<void>;
	/** Animate flip to a specific page index */
	flipToPage: (pageIndex: number) => Promise<void>;
	/** Jump to a specific page instantly without animation */
	jumpToPage: (pageIndex: number) => void;
	/** Show a router-selected page without adding a browser history entry. */
	restorePage: (pageIndex: number) => void;
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
	/** Get the configured table of contents page index. */
	getTocPageIndex: () => number;
	/** Current mouse interaction mode. Touch gestures are unaffected. */
	getMouseMode: () => MouseMode;
	/** Switch between continuous page turning and native text selection. */
	setMouseMode: (mode: MouseMode, options?: { persist?: boolean }) => void;
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
 *
 * `handlers`, `bookmarkProvider`, `enableBookmarks`, `pageShadow`, and `downloadConfig`
 * update the mounted engine in place. The remaining options are initialization-only;
 * changing them after mount does not rebuild the engine (`className`, `pageSemantics`,
 * `direction`, `mouseMode`, `initialTurnedLeaves`, `fastDeltaThreshold`, `leavesBuffer`, `keepPageContentLayout`,
 * `coverConfig`, `leafAspectRatio`, `coverAspectRatio`, `historyMapper`, `tocPageIndex`,
 * `snapshotDuringFlip`, `enableHistory`, `enableDownload`).
 */
export interface FlipBookProps {
	/** Array of React elements to render as pages */
	pages: React.ReactNode[];
	/** CSS class name for the flipbook container. Styling only: the instance binds to its own DOM root, so classes need not be unique or selector-safe. */
	className: string;
	/** Define which pages are covers for special styling */
	pageSemantics?: PageSemantics;
	/** Page bookmark content, placement, ordering, and optional click behavior. */
	bookmarkProvider?: BookmarkProvider;
	/** Opt in to bookmarks. Without a custom provider, use the TOC and its chapter entries. Default: false. */
	enableBookmarks?: boolean;
	/** Enable debug mode */
	debug?: boolean;
	/** Reading direction: 'ltr' (left-to-right) or 'rtl' (right-to-left) */
	direction?: "rtl" | "ltr";
	/** Initial mouse interaction mode. Default: 'turn'. */
	mouseMode?: MouseMode;
	/** Optional localStorage key used to remember the user's mouse mode. */
	mouseModeStorageKey?: string;
	/** Indices of leaves that should start in the turned (flipped) state */
	initialTurnedLeaves?: number[];
	/** Velocity threshold (px/s) for fast swipe to complete flip. Default: 500 */
	fastDeltaThreshold?: number;
	/**
	 * Number of leaves to keep rendered before and after the current position.
	 * Zero keeps both facing pages, moving faces and their underlays ready while
	 * skipping covered content. Opaque paper surfaces retain their appearance.
	 * When set, only leaves within the buffer range are visible for performance.
	 * Default: undefined (all leaves are always rendered)
	 */
	leavesBuffer?: number;
	/** Keep nearby covered content laid out and prepare newly mounted pages separately. Default: false. */
	keepPageContentLayout?: boolean;
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
	 * When set, syncs the flip-book with browser history: pushState on flip, restore page on back/forward,
	 * and adopt the page named by the current URL on mount.
	 * When omitted and enableHistory is not false, the built-in `#page/{name}` hash mapper is used.
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
	 * When omitted and enableDownload is not false, the built-in JSON page-index default is used.
	 */
	downloadConfig?: DownloadConfig;
	/**
	 * When false, disables the inner page shadow/highlight (e.g. to avoid flicker with multiple books).
	 * Default: true.
	 */
	pageShadow?: boolean;
	/**
	 * When true, holds page--flipping through the drag and settling animation
	 * and blocks new text selection without changing content or scrollbar styling.
	 * Default: true.
	 */
	snapshotDuringFlip?: boolean;
	/**
	 * When false, history integration is disabled entirely. When true or omitted, the provided
	 * historyMapper is used, or the built-in hash-based default when none is provided.
	 */
	enableHistory?: boolean;
	/**
	 * When false, download is disabled entirely (getDownloadConfig returns undefined). When true or
	 * omitted, the provided downloadConfig is used, or the built-in JSON page-index default when none
	 * is provided.
	 */
	enableDownload?: boolean;
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
			mouseMode = "turn",
			mouseModeStorageKey,
			pageSemantics = undefined,
			bookmarkProvider,
			enableBookmarks = false,
			initialTurnedLeaves = [],
			fastDeltaThreshold,
			leavesBuffer,
			keepPageContentLayout = false,
			pageShadow = true,
			snapshotDuringFlip = true,
			enableHistory,
			enableDownload,
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
		const [currentPageIndex, setCurrentPageIndex] = useState(() => {
			// Derive the initial page index from initialTurnedLeaves so the
			// leavesBuffer renders around the correct page on the very first
			// render — before the base flipbook's useEffect fires.
			// Must match the base flipbook's model: visible spread starts at
			// lastTurnedLeaf * 2 + 1 (back of the last turned leaf).
			if (initialTurnedLeaves && initialTurnedLeaves.length > 0) {
				const lastTurnedLeaf = Math.max(...initialTurnedLeaves);
				const firstVisiblePage = lastTurnedLeaf * 2 + 1;
				if (firstVisiblePage >= pages.length) {
					const lastLeaf = Math.ceil(pages.length / 2) - 1;
					return lastLeaf * 2;
				}
				return firstVisiblePage;
			}
			return 0;
		});
		const setPageIndexRef = useRef(setCurrentPageIndex);
		setPageIndexRef.current = setCurrentPageIndex;
		const ofRef = useRef(of);
		ofRef.current = of;
		// A zero content buffer still needs the same mounted handoff margin as
		// buffer one: both sides of the spread and the next revealed underlays.
		const bufferMargin = leavesBuffer === 0 ? 3 : 2;

		// Debounce buffer-related re-renders during rapid consecutive page flips.
		// When leavesBuffer is set, each onPageChanged triggers a React re-render
		// that recalculates which pages to mount/unmount — expensive with complex
		// content (e.g. Hebrew text, perushim).  By debouncing, rapid flips (>1 at
		// a time) batch into a single re-render after settling.  The page indicator
		// reads directly from the imperative handle (flipBook) and is not
		// affected by this debounce.
		const BUFFER_DEBOUNCE_MS = 80;
		const pageChangedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
		// Leaves whose flip animation is in flight. The base keeps their page
		// wrappers visible even outside the leavesBuffer window, so their content
		// must stay mounted too — otherwise a revealed flipping page renders blank
		// (issue #167). Cleared once flips settle and the buffer window recenters.
		const inflightLeavesRef = useRef<Set<number>>(new Set());
		const activeLeavesRef = useRef(new Set<number>());
		const pointerHeldRef = useRef(false);
		const mountedPageIndicesRef = useRef<ReadonlySet<number> | undefined>(undefined);
		const materializingPageRef = useRef<number | undefined>(undefined);
		const retiringPageRef = useRef<number | undefined>(undefined);
		const pageMountFrameRef = useRef<number | undefined>(undefined);
		const resumePageMountRef = useRef<(() => void) | undefined>(undefined);
		const releasePageMountRef = useRef<(() => void) | undefined>(undefined);
		const bufferTargetRef = useRef(currentPageIndex);
		const [, setInflightVersion] = useState(0);
		const onPageChangedRef = useRef((index: number) => {
			setPageIndexRef.current?.(index);
		});
		onPageChangedRef.current = (index: number) => {
			if (leavesBuffer == null) {
				// No buffer — currentPageIndex only feeds the buffer window, which
				// mounts every page anyway. Re-rendering here would reconcile the
				// whole page tree on every turn for no benefit (issue #343).
				return;
			}
			if (keepPageContentLayout) {
				// Retained layouts use a staged mount queue instead of batching
				// several cold chapters after the standard debounce. Follow each
				// committed spread so preparation can finish during the next turn.
				const releaseInflight = activeLeavesRef.current.size === 0 && !pointerHeldRef.current;
				const hadInflight = releaseInflight && inflightLeavesRef.current.size > 0;
				if (releaseInflight) inflightLeavesRef.current.clear();
				bufferTargetRef.current = index;
				startTransition(() => {
					if (hadInflight) setInflightVersion((v) => v + 1);
					setPageIndexRef.current?.(index);
				});
				return;
			}
			if (activeLeavesRef.current.size > 0 || pointerHeldRef.current) return;
			if (pageChangedTimerRef.current != null) {
				clearTimeout(pageChangedTimerRef.current);
			}
			pageChangedTimerRef.current = setTimeout(() => {
				pageChangedTimerRef.current = null;
				if (activeLeavesRef.current.size > 0 || pointerHeldRef.current) return;
				const hadInflight = inflightLeavesRef.current.size > 0;
				inflightLeavesRef.current.clear();
				bufferTargetRef.current = index;
				// The buffer-window remount can be a large reconcile under heavy
				// page content. It is not input-latency critical — the +2 leaf
				// margin already keeps freshly revealed pages mounted — so let
				// React chunk and yield it instead of blocking the frame that
				// completes a turn (issue #343).
				startTransition(() => {
					if (hadInflight) setInflightVersion((v) => v + 1);
					setPageIndexRef.current?.(index);
				});
			}, BUFFER_DEBOUNCE_MS);
		};
		const cancelQueuedPageMount = useCallback(() => {
			if (materializingPageRef.current === undefined && retiringPageRef.current === undefined)
				return;
			// Cancelling a frame cannot cancel a transition that frame already queued.
			// Invalidate its optional work before the new interaction can commit it.
			materializingPageRef.current = undefined;
			retiringPageRef.current = undefined;
			const release = releasePageMountRef.current;
			releasePageMountRef.current = undefined;
			release?.();
			setInflightVersion((v) => v + 1);
		}, []);
		const beginPointerInteraction = useCallback(() => {
			if (leavesBuffer == null) return;
			pointerHeldRef.current = true;
			cancelQueuedPageMount();
			if (pageMountFrameRef.current !== undefined) {
				cancelAnimationFrame(pageMountFrameRef.current);
				pageMountFrameRef.current = undefined;
			}
			if (pageChangedTimerRef.current != null) {
				clearTimeout(pageChangedTimerRef.current);
				pageChangedTimerRef.current = null;
			}
		}, [leavesBuffer, cancelQueuedPageMount]);
		const retainFlippingLeaf = (flippingLeaf: number) => {
			if (leavesBuffer == null) return;
			if (pageChangedTimerRef.current != null) {
				clearTimeout(pageChangedTimerRef.current);
				pageChangedTimerRef.current = null;
			}
			if (inflightLeavesRef.current.has(flippingLeaf)) return;
			inflightLeavesRef.current.add(flippingLeaf);
			const mounted = mountedPageIndicesRef.current;
			const first = flippingLeaf * 2;
			const targetLeaf = Math.floor(bufferTargetRef.current / 2);
			// A concurrent recenter may not have committed yet. Skip only if both
			// the current DOM and that target window retain the moving material.
			const inTargetWindow = Math.abs(flippingLeaf - targetLeaf) <= leavesBuffer + bufferMargin;
			if (
				!inTargetWindow ||
				!mounted?.has(first) ||
				(first + 1 < pages.length && !mounted.has(first + 1)) ||
				(keepPageContentLayout &&
					[first - 1, first + 2].some(
						(index) => index >= 0 && index < pages.length && !mounted?.has(index),
					))
			) {
				startTransition(() => setInflightVersion((v) => v + 1));
			}
		};
		const onPageFlippingRef = useRef((params: PageFlipParams) => {
			handlers?.onPageFlipping?.(params);
		});
		onPageFlippingRef.current = (params) => {
			const edgePage =
				params.direction === "backward" ? params.pageIndices[1] : params.pageIndices[0];
			retainFlippingLeaf(Math.floor(edgePage / 2));
			handlers?.onPageFlipping?.(params);
		};
		const onLeafFlipActivityRef = useRef<(index: number, active: boolean) => void>(() => {});
		const onPageFlippedRef = useRef((params: PageFlipParams) => {
			handlers?.onPageFlipped?.(params);
		});
		onPageFlippedRef.current = (params) => {
			handlers?.onPageFlipped?.(params);
		};
		const hostRef = useRef<HTMLDivElement | null>(null);

		// Clean up debounce timer on unmount.
		useEffect(() => {
			return () => {
				releasePageMountRef.current?.();
				releasePageMountRef.current = undefined;
				if (pageChangedTimerRef.current != null) {
					clearTimeout(pageChangedTimerRef.current);
				}
			};
		}, []);

		// useState lazy-init: construct exactly one engine per mount; useRef(arg) would build (and discard) an engine on every render.
		const [flipBook] = useState(
			() =>
				new FlipBookBase({
					pageSemantics: pageSemantics,
					enableBookmarks,
					pagesCount: pages.length,
					direction: direction,
					mouseMode,
					initialTurnedLeaves: initialTurnedLeaves,
					fastDeltaThreshold: fastDeltaThreshold,
					leavesBuffer: leavesBuffer,
					keepPageContentLayout,
					leafAspectRatio: leafAspectRatio,
					coverAspectRatio: coverAspectRatio,
					coverPageIndices: coverConfig?.coverIndices,
					onPageChanged: (index: number) => onPageChangedRef.current(index),
					onLeafFlipActivity: (index, active) => onLeafFlipActivityRef.current(index, active),
					onPageFlipping: (params) => onPageFlippingRef.current(params),
					onPageFlipped: (params: PageFlipParams) => onPageFlippedRef.current(params),
					historyMapper,
					tocPageIndex: tocPageIndex ?? 4,
					downloadConfig,
					pageShadow,
					snapshotDuringFlip,
					enableHistory,
					enableDownload,
				}),
		);

		onLeafFlipActivityRef.current = (index, active) => {
			if (leavesBuffer == null) return;
			if (active) {
				activeLeavesRef.current.add(index);
				cancelQueuedPageMount();
				if (pageMountFrameRef.current !== undefined) {
					cancelAnimationFrame(pageMountFrameRef.current);
					pageMountFrameRef.current = undefined;
				}
				// A drag starts before its release animation. Hold buffer work for
				// that entire interval, without reconciling already mounted pages.
				retainFlippingLeaf(index);
			} else {
				activeLeavesRef.current.delete(index);
				if (activeLeavesRef.current.size === 0) {
					// A cancelled drag has no page-change event, but must still retire
					// retained material and finish any previously pending recenter.
					onPageChangedRef.current(flipBook.currentPageIndex);
					resumePageMountRef.current?.();
				}
			}
		};
		useEffect(() => {
			if (leavesBuffer == null) return;
			const document = hostRef.current?.ownerDocument ?? window.document;
			const view = document.defaultView;
			const release = (event: Event) => {
				if (!pointerHeldRef.current || (event as PointerEvent).isPrimary === false) return;
				pointerHeldRef.current = false;
				if (activeLeavesRef.current.size === 0) onPageChangedRef.current(flipBook.currentPageIndex);
				resumePageMountRef.current?.();
			};
			document.addEventListener("pointerup", release, true);
			document.addEventListener("pointercancel", release, true);
			view?.addEventListener("blur", release);
			return () => {
				pointerHeldRef.current = false;
				document.removeEventListener("pointerup", release, true);
				document.removeEventListener("pointercancel", release, true);
				view?.removeEventListener("blur", release);
			};
		}, [flipBook, leavesBuffer]);

		// The engine captures downloadConfig at mount; bridge prop changes into it.
		useEffect(() => {
			flipBook.setDownloadConfig(downloadConfig);
		}, [downloadConfig, flipBook]);

		// Expose imperative handle: flipbook methods (called by commands) and getters (for UI)
		useImperativeHandle(
			ref,
			() => ({
				beginPointerInteraction,
				flipNext: () => flipBook.flipNext(),
				flipPrev: () => flipBook.flipPrev(),
				flipToPage: (pageIndex: number) => flipBook.flipToPage(pageIndex),
				jumpToPage: (pageIndex: number) => flipBook.jumpToPage(pageIndex),
				restorePage: (pageIndex: number) => flipBook.restorePage(pageIndex),
				toggleDebugBar: () => {
					const bar = hostRef.current?.querySelector(".flipbook-debug-bar");
					if (bar) bar.classList.toggle("flipbook-debug-bar--hidden");
				},
				getCurrentPageIndex: () => flipBook.currentPageIndex,
				getTotalPages: () => flipBook.totalPages,
				getOf: () => (ofRef.current !== undefined ? ofRef.current : flipBook.totalPages),
				isFirstPage: () => flipBook.isFirstPage,
				isLastPage: () => flipBook.isLastPage,
				getDownloadConfig: () => flipBook.getDownloadConfig(),
				getTocPageIndex: () => flipBook.getTocPageIndex(),
				getMouseMode: () => flipBook.getMouseMode(),
				setMouseMode: (mode: MouseMode, options?: { persist?: boolean }) => {
					flipBook.setMouseMode(mode);
					if (mouseModeStorageKey && options?.persist !== false) {
						try {
							localStorage.setItem(mouseModeStorageKey, mode);
						} catch {
							// Private browsing may deny storage; the mode still works this session.
						}
					}
				},
			}),
			[mouseModeStorageKey, flipBook, beginPointerInteraction],
		);

		useEffect(() => {
			const currentFlipBook = flipBook;
			const host = hostRef.current;
			if (!host) return;
			currentFlipBook.render(host, debug);
			if (mouseModeStorageKey) {
				try {
					const savedMode = localStorage.getItem(mouseModeStorageKey);
					if (savedMode === "turn" || savedMode === "select")
						currentFlipBook.setMouseMode(savedMode);
				} catch {
					// Storage is optional.
				}
			}
			setCurrentPageIndex(currentFlipBook.currentPageIndex);

			// Cleanup function to destroy Hammer instance and event listeners
			return () => {
				currentFlipBook.destroy();
			};
		}, [debug, mouseModeStorageKey, flipBook]);

		const previousBookmarksEnabled = useRef(enableBookmarks);
		useEffect(() => {
			if (previousBookmarksEnabled.current === enableBookmarks) return;
			previousBookmarksEnabled.current = enableBookmarks;
			flipBook.setBookmarksEnabled(enableBookmarks);
		}, [enableBookmarks, flipBook]);

		// Sync pageShadow to DOM when prop changes (base option is set at construct time).
		useEffect(() => {
			const el = hostRef.current;
			if (!el) return;
			if (pageShadow) {
				el.classList.remove("flipbook--no-page-shadow");
			} else {
				el.classList.add("flipbook--no-page-shadow");
			}
		}, [pageShadow]);

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
		const desiredPageIndices =
			leavesBuffer != null && totalPages > 0
				? (() => {
						const currentLeaf = Math.floor(currentPageIndex / 2);
						const leavesCount = Math.ceil(totalPages / 2);
						const first = Math.max(0, currentLeaf - leavesBuffer - bufferMargin) * 2;
						const last = Math.min(
							totalPages - 1,
							Math.min(leavesCount - 1, currentLeaf + leavesBuffer + bufferMargin) * 2 + 1,
						);
						const mounted = new Set(Array.from({ length: last - first + 1 }, (_, i) => first + i));
						for (const index of coverIndicesSet) {
							mounted.add(index);
							const partner = index % 2 === 0 ? index + 1 : index - 1;
							if (partner >= 0 && partner < totalPages) mounted.add(partner);
						}
						for (const leaf of inflightLeavesRef.current) {
							const first = leaf * 2 - (keepPageContentLayout ? 1 : 0);
							const last = leaf * 2 + (keepPageContentLayout ? 2 : 1);
							for (let index = Math.max(0, first); index <= Math.min(last, totalPages - 1); index++)
								mounted.add(index);
						}
						return mounted;
					})()
				: undefined;
		const canStagePages =
			keepPageContentLayout &&
			typeof requestAnimationFrame === "function" &&
			typeof cancelAnimationFrame === "function";
		const inflightLeafIndices = Array.from(inflightLeavesRef.current);
		const requiredForTurn = (index: number) =>
			(index >= flipBook.currentPageIndex - 2 && index <= flipBook.currentPageIndex + 3) ||
			inflightLeafIndices.some((leaf) => index >= leaf * 2 - 1 && index <= leaf * 2 + 2);
		const previousMounted = mountedPageIndicesRef.current;
		const mountedPageIndices =
			canStagePages && desiredPageIndices && previousMounted
				? new Set(
						Array.from(new Set([...desiredPageIndices, ...previousMounted])).filter(
							(index) =>
								(!desiredPageIndices.has(index) &&
									index !== retiringPageRef.current &&
									Math.abs(Math.floor(index / 2) - Math.floor(currentPageIndex / 2)) <=
										(leavesBuffer ?? 0) + bufferMargin + 1) ||
								(desiredPageIndices.has(index) &&
									(previousMounted.has(index) ||
										index === materializingPageRef.current ||
										requiredForTurn(index))),
						),
					)
				: desiredPageIndices;
		usePageMountEffect(() => {
			const previous = mountedPageIndicesRef.current;
			mountedPageIndicesRef.current = mountedPageIndices;
			materializingPageRef.current = undefined;
			retiringPageRef.current = undefined;
			if (keepPageContentLayout && previous && mountedPageIndices) {
				const materialized = Array.from(mountedPageIndices).filter((index) => !previous.has(index));
				if (materialized.length) flipBook.refreshPageContent(materialized);
			}
			const release = releasePageMountRef.current;
			releasePageMountRef.current = undefined;
			release?.();
			if (!canStagePages || !desiredPageIndices || !mountedPageIndices) return;
			const center = flipBook.currentPageIndex + 0.5;
			const next = Array.from(desiredPageIndices)
				.filter((index) => !mountedPageIndices.has(index))
				.sort((a, b) => Math.abs(a - center) - Math.abs(b - center) || b - a)[0];
			const retire = Array.from(mountedPageIndices).find((index) => !desiredPageIndices.has(index));
			if (next === undefined && retire === undefined) return;
			let disposed = false;
			const materialize = () => {
				if (disposed) return;
				pageMountFrameRef.current = undefined;
				if (pointerHeldRef.current || activeLeavesRef.current.size > 0) return;
				const release = flipBook.holdPreparedPageContent();
				if (!release) {
					waitForPreparation();
					return;
				}
				releasePageMountRef.current = release;
				materializingPageRef.current = next;
				retiringPageRef.current = next === undefined ? retire : undefined;
				// Wait for this commit before scheduling another page. A delayed
				// transition must not collect several cold chapters into one commit.
				startTransition(() => setInflightVersion((v) => v + 1));
			};
			const resume = () => {
				if (
					disposed ||
					pointerHeldRef.current ||
					activeLeavesRef.current.size > 0 ||
					pageMountFrameRef.current !== undefined
				)
					return;
				// A fresh barrier after input release lets the paper pose paint before
				// covered mounting or retirement invalidates a chapter tree. Release
				// animations and toolbar turns keep the same hold until they settle.
				pageMountFrameRef.current = requestAnimationFrame(() => {
					if (disposed) return;
					pageMountFrameRef.current = undefined;
					if (pointerHeldRef.current || activeLeavesRef.current.size > 0) return;
					pageMountFrameRef.current = requestAnimationFrame(materialize);
				});
			};
			let cancelPrepared: (() => void) | undefined;
			const waitForPreparation = () => {
				cancelPrepared?.();
				cancelPrepared = flipBook.onPageContentPrepared(resume);
			};
			resumePageMountRef.current = waitForPreparation;
			waitForPreparation();
			return () => {
				disposed = true;
				cancelPrepared?.();
				if (resumePageMountRef.current === waitForPreparation)
					resumePageMountRef.current = undefined;
				if (pageMountFrameRef.current !== undefined) {
					cancelAnimationFrame(pageMountFrameRef.current);
					pageMountFrameRef.current = undefined;
				}
			};
		});
		const contentByIndex = (index: number) =>
			!mountedPageIndices || mountedPageIndices.has(index)
				? (pagesWithKeys.at(index) ?? null)
				: null;

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
			<div
				ref={hostRef}
				className={className}
				onPointerDownCapture={(event) => {
					if (event.button === 0 && event.isPrimary !== false) beginPointerInteraction();
				}}
			>
				{pagesWithKeys.map((_, index) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: stable slot identity for buffer/mount correctness
						key={`page-${index}`}
						className={getPageClassName(index)}
					>
						<div className="flipbook-page-scrollport">
							<div className="flipbook-page-content" dir={direction}>
								{renderPageContent(index)}
							</div>
						</div>
					</div>
				))}
				<BookmarkPortals bookmarkProvider={bookmarkProvider} flipBook={flipBook} />
			</div>
		);
	},
);

FlipBookReact.displayName = "FlipBook";

export type {
	Bookmark,
	BookmarkContext,
	BookmarkPlacement,
	FlipPageSemantic,
	HistoryMapper,
	MouseMode,
	PageFlipParams,
	PageSemantics,
} from "html-flip-book-vanilla";
export { createDefaultHistoryMapper } from "html-flip-book-vanilla";
export type { TocEntry, TocPageProps } from "./TocPage";
export { TocPage } from "./TocPage";
export { FlipBookReact as FlipBook };
