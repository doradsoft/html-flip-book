import "./pages.scss";
import "./flipbook.scss";
import "./mouse-mode.scss";
import Hammer from "hammerjs";
import { throttle } from "throttle-debounce";
import type { AspectRatio } from "./aspect-ratio";
import { BookmarkLayer, type BookmarkProvider } from "./bookmarks";
import { createDefaultBookmarkProvider } from "./default-bookmarks";
import { createDefaultHistoryMapper } from "./default-history-mapper";
import { createDefaultDownloadConfig } from "./download/default-config";
import type { DownloadConfig } from "./download/types";
import type {
	FlipBookOptions,
	FlipPageSemantic,
	HistoryMapper,
	MouseMode,
	PageFlipDirection,
	PageFlipParams,
} from "./flip-book-options";
import { FlipDirection } from "./flip-direction";
import { type FlipPosition, Leaf } from "./leaf";
import type { PageSemantics } from "./page-semantics";
import { Size } from "./size";
import { setTocPageIndex } from "./store";

/** Default threshold for fast flip detection (in ms) */
const DEFAULT_FAST_DELTA = 500;

/** Percentage of a page's width that triggers its edge preview */
const EDGE_ZONE_RATIO = 0.18;
/** Maximum hover shadow strength (0-1) */
const HOVER_STRENGTH_MAX = 0.12;
/** Throttle interval for mouse move handler in ms */
const MOUSE_MOVE_THROTTLE_MS = 16;
const historyOwnerEpoch = Date.now().toString(36);
let nextHistoryOwner = 0;
/**
 * Last URL written by any flipbook instance in this document.
 * Distinguishes book-authored position entries from genuine external deep
 * links: a URL no book wrote is a request to open at that page, while a
 * leftover book-authored URL is positional state and must not pull other
 * (or later-mounted) books to its page.
 */
let lastAuthoredUrl: string | undefined;

/** State for a single flip operation - enables concurrent page flipping */
interface FlipState {
	leaf: Leaf;
	direction: FlipDirection;
	startingPos: number;
	startingY?: number;
	cornerY?: number;
	delta: number;
	isDuringAutoFlip: boolean;
}

/**
 * Core FlipBook class for creating realistic page-flip animations.
 *
 * @example
 * ```typescript
 * import { FlipBook } from 'html-flip-book-vanilla';
 *
 * const flipBook = new FlipBook({
 *   pagesCount: 10,
 *   direction: 'ltr',
 * });
 *
 * flipBook.render('#book-container');
 *
 * // Navigate programmatically
 * await flipBook.flipNext();
 * await flipBook.flipToPage(5);
 * ```
 */
class FlipBook {
	bookElement?: HTMLElement;
	private pageElements: HTMLElement[] = [];
	private readonly pagesCount: number;
	private readonly leafAspectRatio: AspectRatio = { width: 2, height: 3 };
	private readonly coverAspectRatio: AspectRatio = {
		width: 2.15,
		height: 3.15,
	};
	private readonly direction: "rtl" | "ltr" = "ltr";
	private mouseMode: MouseMode = "turn";
	private readonly fastDeltaThreshold: number = DEFAULT_FAST_DELTA;
	private readonly initialTurnedLeaves: Set<number> = new Set();
	private readonly onPageChanged?: (pageIndex: number) => void;
	private readonly onPageFlipping?: (params: PageFlipParams) => void;
	private readonly onPageFlipped?: (params: PageFlipParams) => void;
	private readonly historyMapper?: HistoryMapper;
	private lastFlipParams: PageFlipParams | undefined;
	private _historyInitialized = false;
	private _isRestoringFromHistory = false;
	private _boundPopstate: ((event: PopStateEvent) => void) | undefined;
	private readonly _historyOwner = `${historyOwnerEpoch}-${++nextHistoryOwner}`;
	private readonly pageSemantics: PageSemantics | undefined;
	private bookmarkProvider: BookmarkProvider | undefined;
	private bookmarksEnabled: boolean;
	private defaultBookmarkProvider: BookmarkProvider | undefined;
	private bookmarkLayer: BookmarkLayer | undefined;
	private bookmarkClearance = "";
	private readonly leavesBuffer?: number;
	private readonly coverPageIndices?: number[] | "auto";
	private downloadConfig: DownloadConfig | undefined;
	private readonly downloadEnabled: boolean;
	private readonly pageShadow: boolean;
	private readonly snapshotDuringFlip: boolean;
	private leaves: Leaf[] = [];
	// flipping state - supports concurrent page flipping
	private activeFlips: Map<number, FlipState> = new Map();
	private pendingFlipStartingPos = 0;
	private pendingFlipStartingY: number | undefined;
	private pendingFlipDirection: FlipDirection = FlipDirection.None;
	private isDragging = false;
	/** Undefined until a native press records the origin; synthetic pans use their target. */
	private gestureStartedInNoFlipZone: boolean | undefined;
	private cancelBookmarkPointerDrag: (() => void) | undefined;
	/** Set after a drag ends; the next click event is suppressed so child buttons/links don't fire. */
	private _suppressNextClick = false;
	private hoveredLeaf: Leaf | undefined;
	touchStartingPos = { x: 0, y: 0 };
	/** True when the current touch started inside a [data-flipbook-no-flip] element (e.g. carousel). */
	private touchStartedInNoFlipZone = false;
	/**
	 * Direction lock for the current touch gesture.
	 * Once the first significant movement (>5 px) determines the dominant axis,
	 * the lock stays for the rest of the gesture.  'vertical' means native scroll
	 * wins — Hammer pan events are rejected.  'horizontal' means every touchmove
	 * gets preventDefault() so Hammer can drive the page flip.
	 */
	touchDirectionLock: "none" | "vertical" | "horizontal" = "none";
	private static readonly DIRECTION_LOCK_THRESHOLD = 5;
	private prevVisiblePageIndices: [number] | [number, number] | undefined;
	// Hammer instance for cleanup
	private hammer: HammerManager | undefined;
	// Resize observer for re-layout on container size changes
	private resizeObserver: ResizeObserver | undefined;
	private debugTimer: ReturnType<typeof setInterval> | undefined;
	private debugBar: HTMLElement | undefined;
	private spineX = 0;

	private static readonly NO_FLIP_SELECTOR = "[data-flipbook-no-flip]";

	private isInsideNoFlipZone(el: EventTarget | null): boolean {
		return el instanceof Element && el.closest(FlipBook.NO_FLIP_SELECTOR) != null;
	}

	private getSemanticForPage(pageIndex: number): FlipPageSemantic | undefined {
		if (!this.pageSemantics) return undefined;
		return {
			semanticName: this.pageSemantics.indexToSemanticName(pageIndex),
			title: this.pageSemantics.indexToTitle(pageIndex),
		};
	}

	private buildPageFlipParams(
		leftmostPageIndex: number,
		direction: PageFlipDirection,
	): PageFlipParams {
		const rightPageIndex = Math.min(leftmostPageIndex + 1, this.pagesCount - 1);
		const pageIndices: [number, number] = [leftmostPageIndex, rightPageIndex];
		const semantics: [FlipPageSemantic | undefined, FlipPageSemantic | undefined] = [
			this.getSemanticForPage(leftmostPageIndex),
			this.getSemanticForPage(rightPageIndex),
		];
		const leafIndex = Math.floor(leftmostPageIndex / 2);
		return { leafIndex, pageIndices, semantics, direction };
	}

	private syncHistoryAndNotifyFlipped(isInitial: boolean): void {
		if (this.bookmarksEnabled && this.bookmarkLayer) {
			this.bookmarkLayer.refresh();
			if (Object.values(this.bookmarkLayer.getInsets()).join() !== this.bookmarkClearance) {
				this.recalculateSizes();
			}
		}
		const pageIndex = this.currentPageIndex;
		const semantic = this.getSemanticForPage(pageIndex);
		// The initial sync only stamps history state; the page hasn't changed,
		// so it must not fire onPageChanged. Deep-link adoption already fired
		// it via restorePage — a real transition.
		if (!isInitial && this.onPageChanged) this.onPageChanged(pageIndex);
		// onPageFlipped still fires on the initial sync: it is the pre-write
		// hook consumers use to observe (and adjust) the history entry the
		// book is about to write — e.g. re-applying a richer deep-link route
		// right after the canonicalizing write below.
		const params = this.lastFlipParams ?? this.buildPageFlipParams(pageIndex, "forward");
		if (this.onPageFlipped) this.onPageFlipped(params);
		if (typeof window !== "undefined" && this.historyMapper && !this._isRestoringFromHistory) {
			const route = this.historyMapper.pageToRoute(pageIndex, semantic);
			// When pageToRoute returns null the consumer signals "this page has
			// no meaningful URL" (e.g. cover, TOC).  Skip the pushState entirely
			// to avoid framework-level routing side-effects.
			if (route == null) return;
			// Keep the current entry's framework state when writing a book route.
			// Next.js, for example, marks SPA entries in history.state and reloads
			// the document on Back if that marker is missing.
			const currentState = window.history.state;
			const state =
				currentState !== null && typeof currentState === "object" && !Array.isArray(currentState)
					? { ...currentState, route, __flipBookOwner: this._historyOwner }
					: { route, __flipBookOwner: this._historyOwner };
			const url = route.startsWith("#")
				? `${window.location.pathname}${window.location.search}${route}`
				: route;
			// Use the *native* History.prototype methods rather than
			// window.history.pushState/replaceState.  Frameworks like Next.js
			// monkey-patch the instance methods to intercept URL changes and
			// trigger full soft navigations (RSC fetch + React re-render).
			// That is catastrophically expensive during rapid page flips.
			// Calling the prototype method bypasses the patch while still
			// updating the browser URL bar and history stack correctly.
			if (isInitial || !this._historyInitialized) {
				History.prototype.replaceState.call(window.history, state, "", url);
				this._historyInitialized = true;
			} else {
				History.prototype.pushState.call(window.history, state, "", url);
			}
			lastAuthoredUrl = url;
		}
	}

	private handlePopstate = (event: PopStateEvent): void => {
		if (!this.historyMapper || typeof window === "undefined") return;
		// Framework routers also observe popstate. A route written by this book
		// already has its page restored below; letting a router traverse it again
		// can remount the entire book despite the navigation being same-document.
		if (event.state?.__flipBookOwner !== this._historyOwner) return;
		const route =
			(typeof window.history.state === "object" && window.history.state?.route) ||
			window.location.pathname + window.location.search + window.location.hash;
		const pageIndex = this.historyMapper.routeToPage(route);
		if (pageIndex !== null && pageIndex >= 0 && pageIndex < this.pagesCount) {
			event.stopImmediatePropagation();
			this.restorePage(pageIndex);
		}
	};

	private get isLTR(): boolean {
		return this.direction === "ltr";
	}

	private get currentOrTurningLeaves(): [Leaf | undefined, Leaf | undefined] {
		let secondLeafIndex = -1;
		for (let i = this.leaves.length - 1; i >= 0; i--) {
			const leaf = this.leaves[i];
			if (leaf.isTurned || leaf.isTurning) {
				secondLeafIndex = leaf.index + 1;
				break;
			}
		}
		return secondLeafIndex === -1
			? [undefined, this.leaves[0]]
			: secondLeafIndex === this.leaves.length
				? [this.leaves[secondLeafIndex - 1], undefined]
				: [this.leaves[secondLeafIndex - 1], this.leaves[secondLeafIndex]];
	}

	constructor(options: FlipBookOptions) {
		this.pagesCount = options.pagesCount;
		this.leafAspectRatio = options.leafAspectRatio || this.leafAspectRatio;
		this.coverAspectRatio = options.coverAspectRatio || this.coverAspectRatio;
		this.direction = options.direction || this.direction;
		this.mouseMode = options.mouseMode ?? "turn";
		this.fastDeltaThreshold = options.fastDeltaThreshold ?? this.fastDeltaThreshold;
		this.initialTurnedLeaves = new Set(options.initialTurnedLeaves ?? []);
		this.pageSemantics = options.pageSemantics;
		this.bookmarkProvider = options.bookmarkProvider;
		this.bookmarksEnabled = options.enableBookmarks ?? false;
		this.onPageChanged = options.onPageChanged;
		this.onPageFlipping = options.onPageFlipping;
		this.onPageFlipped = options.onPageFlipped;
		this.historyMapper =
			options.enableHistory !== false
				? (options.historyMapper ?? createDefaultHistoryMapper(options.pageSemantics))
				: undefined;
		this.leavesBuffer = options.leavesBuffer;
		this.coverPageIndices = options.coverPageIndices;
		this.downloadEnabled = options.enableDownload !== false;
		this.downloadConfig = undefined;
		this.setDownloadConfig(options.downloadConfig);
		this.pageShadow = options.pageShadow ?? true;
		this.snapshotDuringFlip = options.snapshotDuringFlip ?? true;
		this._tocPageIndex = options.tocPageIndex ?? 4;
		// Keep the module-level store in sync for backward-compat
		setTocPageIndex(this._tocPageIndex);
	}

	private _tocPageIndex = 4;

	/** Get the configured table of contents page index. */
	getTocPageIndex(): number {
		return this._tocPageIndex;
	}

	/** Replace or remove bookmarks without recreating the book or changing its current spread. */
	setBookmarkProvider(provider?: BookmarkProvider): void {
		this.bookmarkProvider = provider;
		this.applyBookmarkProvider();
	}

	/** Bookmarks are opt-in; enabling without a provider uses TOC metadata. */
	setBookmarksEnabled(enabled: boolean): void {
		this.bookmarksEnabled = enabled;
		this.applyBookmarkProvider();
		this.observeBookmarkLeaves();
	}

	private getBookmarkProvider(): BookmarkProvider | undefined {
		if (!this.bookmarksEnabled) return undefined;
		if (this.bookmarkProvider) return this.bookmarkProvider;
		if (this.defaultBookmarkProvider) return this.defaultBookmarkProvider;
		const coverPageIndices = this.buildCoverPageIndicesSet();
		this.pageElements.forEach((page, index) => {
			if (page.classList.contains("page--cover")) coverPageIndices.add(index);
		});
		this.defaultBookmarkProvider ??= createDefaultBookmarkProvider({
			pagesCount: this.pagesCount,
			tocPageIndex: this._tocPageIndex,
			pageSemantics: this.pageSemantics,
			direction: this.direction,
			coverPageIndices: [...coverPageIndices],
		});
		return this.defaultBookmarkProvider;
	}

	private observeBookmarkLeaves(): void {
		for (const leaf of this.leaves) {
			leaf.onTransform = this.bookmarksEnabled
				? (frame) => this.bookmarkLayer?.updateLeaf(leaf.index, frame, leaf.pages[0])
				: undefined;
			const frame = this.bookmarksEnabled ? leaf.transformFrame : undefined;
			if (frame) this.bookmarkLayer?.updateLeaf(leaf.index, frame, leaf.pages[0]);
		}
	}

	private applyBookmarkProvider(): void {
		this.bookmarkLayer?.setProvider(this.getBookmarkProvider());
		this.recalculateSizes();
	}

	getMouseMode(): MouseMode {
		return this.mouseMode;
	}

	setMouseMode(mode: MouseMode): void {
		this.cancelBookmarkPointerDrag?.();
		this.mouseMode = mode;
		this.bookmarkLayer?.setMouseMode(mode);
		this.bookElement?.classList.toggle("flipbook--select-text", mode === "select");
		if (mode === "select") this.clearHoverShadow();
	}

	/** Keep mouse selection native by stopping the page's down event before Hammer sees it. */
	private handlePageMouseDown = (event: Event): void => {
		// A swipe may emit no click. A fresh press must not inherit suppression
		// intended only for the previous gesture's synthetic click.
		this._suppressNextClick = false;
		if (event.type === "mousedown" || (event as PointerEvent).pointerType === "mouse") {
			this.gestureStartedInNoFlipZone = this.isInsideNoFlipZone(event.target);
			if (this.gestureStartedInNoFlipZone) this.clearHoverShadow();
		}
		if (
			this.mouseMode === "select" &&
			event instanceof MouseEvent &&
			event.button === 0 &&
			(event.type !== "pointerdown" || (event as PointerEvent).pointerType === "mouse")
		) {
			event.stopPropagation();
		}
	};

	/** Keep native image/link dragging from taking over a page-turn gesture. */
	private handlePageDragStart = (event: Event): void => {
		if (this.mouseMode === "turn" && !this.isInsideNoFlipZone(event.target)) {
			event.preventDefault();
		}
	};

	/** Tabs use the same current-page gesture, including when the preview is outside the book. */
	private handleBookmarkPointerDown = (event: PointerEvent): void => {
		this.cancelBookmarkPointerDrag?.();
		const button = event.currentTarget;
		if (!(button instanceof HTMLElement)) return;
		delete button.dataset.bookmarkDragged;
		this._suppressNextClick = false;
		const turnPages = this.mouseMode === "turn";
		if (event.button !== 0 || (turnPages && this.currentManualFlip)) return;
		if (event.isPrimary === false) return;
		if (turnPages && event.pointerType !== "touch") event.preventDefault();
		this.touchDirectionLock = "none";
		const document = button.ownerDocument;
		const view = document.defaultView;
		let started = false;
		let previous = event;
		let velocityX = 0;
		const input = (pointer: PointerEvent) =>
			({
				center: { x: pointer.clientX, y: pointer.clientY },
				deltaX: pointer.clientX - event.clientX,
				deltaY: pointer.clientY - event.clientY,
				velocityX,
				pointerType: pointer.pointerType || "mouse",
				srcEvent: pointer,
			}) as HammerInput;
		const cleanup = () => {
			document.removeEventListener("pointermove", move);
			document.removeEventListener("pointerup", end);
			document.removeEventListener("pointercancel", pointerCancel);
			view?.removeEventListener("blur", cancel);
			this.cancelBookmarkPointerDrag = undefined;
		};
		const finish = (pointer: PointerEvent, cancelled: boolean) => {
			cleanup();
			if (started) {
				if (pointer.timeStamp - previous.timeStamp > 50) velocityX = 0;
				button.dataset.bookmarkDragged = "true";
				if (turnPages) this.onDragEnd(input(pointer), cancelled);
				else this._suppressNextClick = true;
			}
			this.touchDirectionLock = "none";
		};
		const move = (pointer: PointerEvent) => {
			if (pointer.pointerId !== event.pointerId) return;
			const dx = pointer.clientX - event.clientX;
			const dy = pointer.clientY - event.clientY;
			if (!started && Math.max(Math.abs(dx), Math.abs(dy)) <= FlipBook.DIRECTION_LOCK_THRESHOLD)
				return;
			if (!started && pointer.pointerType === "touch" && Math.abs(dy) > Math.abs(dx)) {
				cleanup();
				return;
			}
			if (!turnPages) {
				started = true;
				button.dataset.bookmarkDragged = "true";
				return;
			}
			velocityX =
				(pointer.clientX - previous.clientX) / Math.max(1, pointer.timeStamp - previous.timeStamp);
			previous = pointer;
			pointer.preventDefault();
			if (!started) {
				started = true;
				button.dataset.bookmarkDragged = "true";
				this.onDragStart(input(pointer), true);
			} else this.onDragUpdate(input(pointer), true);
		};
		const end = (pointer: PointerEvent) => {
			if (pointer.pointerId === event.pointerId) finish(pointer, false);
		};
		const cancel = () => finish(previous, true);
		const pointerCancel = (pointer: PointerEvent) => {
			if (pointer.pointerId === event.pointerId) cancel();
		};
		this.cancelBookmarkPointerDrag = cancel;
		document.addEventListener("pointermove", move, { passive: false });
		document.addEventListener("pointerup", end);
		document.addEventListener("pointercancel", pointerCancel);
		view?.addEventListener("blur", cancel);
	};

	/** Download config (handlers and filename hints). Used by toolbar. */
	getDownloadConfig(): DownloadConfig | undefined {
		return this.downloadConfig;
	}

	/**
	 * Replace the download configuration on a mounted book. Passing undefined restores the
	 * built-in default (when download is enabled); callers can disable download only at
	 * construction via `enableDownload: false`.
	 */
	setDownloadConfig(config: DownloadConfig | undefined): void {
		this.downloadConfig = this.downloadEnabled
			? (config ??
				createDefaultDownloadConfig({
					pagesCount: this.pagesCount,
					pageSemantics: this.pageSemantics,
				}))
			: undefined;
	}

	/** Build the set of page indices that use cover sizing. */
	private buildCoverPageIndicesSet(): Set<number> {
		const coverPageIndicesSet = new Set<number>();
		if (this.coverPageIndices) {
			const indices =
				this.coverPageIndices === "auto" ? [0, this.pagesCount - 1] : this.coverPageIndices;
			for (const pageIdx of indices) {
				coverPageIndicesSet.add(pageIdx);
			}
		}
		return coverPageIndicesSet;
	}

	/**
	 * Recalculate page sizes from the current container dimensions and
	 * re-apply width/height/position styles. Called during initial render
	 * and automatically on container resize (e.g. entering fullscreen).
	 */
	private recalculateSizes(): void {
		if (!this.bookElement || !this.pageElements.length) return;

		const insets = this.bookmarkLayer?.getInsets() ?? { top: 0, right: 0, bottom: 0, left: 0 };
		this.bookmarkClearance = Object.values(insets).join();
		const availableWidth = Math.max(0, this.bookElement.clientWidth - insets.left - insets.right);
		const availableHeight = Math.max(0, this.bookElement.clientHeight - insets.top - insets.bottom);
		this.spineX = insets.left + availableWidth / 2;
		const maxCoverSize = new Size(availableWidth / 2, availableHeight);
		const coverSize = maxCoverSize.aspectRatioFit(this.coverAspectRatio);
		const leafSize = new Size(
			(coverSize.width * this.leafAspectRatio.width) / this.coverAspectRatio.width,
			(coverSize.height * this.leafAspectRatio.height) / this.coverAspectRatio.height,
		);
		this.bookElement.style.perspective = `${Math.min(leafSize.width * 2, leafSize.height) * 2}px`;

		const containerWidth = availableWidth;
		const containerHeight = availableHeight;

		for (const pageElement of this.pageElements) {
			const isCoverPage = pageElement.dataset.isCoverPage === "1";
			const pageSize = isCoverPage ? coverSize : leafSize;

			pageElement.style.width = `${pageSize.width}px`;
			pageElement.style.height = `${pageSize.height}px`;
			pageElement.style[this.isLTR ? "left" : "right"] =
				`${(this.isLTR ? insets.left : insets.right) + (containerWidth - 2 * pageSize.width) / 2}px`;
			pageElement.style.top = `${insets.top + (containerHeight - pageSize.height) / 2}px`;
		}
		for (const leaf of this.leaves) {
			leaf.applyTransform(leaf.flipPosition);
		}
		const outerSize =
			this.getBookmarkProvider()?.attachment === "pinned" &&
			this.pageElements.some((page) => page.dataset.isCoverPage === "1")
				? coverSize
				: leafSize;
		this.bookmarkLayer?.layout({
			left: insets.left + (containerWidth - 2 * outerSize.width) / 2,
			top: insets.top + (containerHeight - outerSize.height) / 2,
			width: 2 * outerSize.width,
			height: outerSize.height,
		});
	}

	private configurePageScrollport(pageElement: HTMLElement, pageIndex: number): void {
		const spineOnLeft = (pageIndex % 2 === 0) === this.isLTR;
		pageElement.dataset.scrollbarSide = spineOnLeft ? "left" : "right";
		const explicitDirection = pageElement.style.direction || pageElement.dir;
		const computedDirection =
			pageElement.ownerDocument.defaultView?.getComputedStyle(pageElement).direction;
		const originalDirection = explicitDirection || computedDirection;
		const readingDirection =
			originalDirection === "ltr" || originalDirection === "rtl"
				? originalDirection
				: this.direction;
		pageElement.dataset.readingDirection = readingDirection;
		if (pageElement.querySelector(":scope > .flipbook-page-scrollport")) return;
		const document = pageElement.ownerDocument;
		const scrollTop = pageElement.scrollTop;
		const content = document.createElement("div");
		content.className = "flipbook-page-content";
		content.dir = readingDirection;
		content.append(...Array.from(pageElement.childNodes));
		const scrollport = document.createElement("div");
		scrollport.className = "flipbook-page-scrollport";
		scrollport.append(content);
		pageElement.append(scrollport);
		pageElement.style.overflow = "hidden";
		scrollport.scrollTop = scrollTop;
	}

	render(target: string | HTMLElement, debug = false) {
		const bookElement = typeof target === "string" ? document.querySelector(target) : target;
		if (!bookElement) {
			throw new Error(
				typeof target === "string"
					? `Couldn't find container with selector: ${target}`
					: "Couldn't find container element",
			);
		}
		this.bookElement = bookElement as HTMLElement;
		this.setMouseMode(this.mouseMode);
		if (!this.bookElement.classList.contains("flipbook")) {
			this.bookElement.classList.add("flipbook");
		}
		if (!this.pageShadow) {
			this.bookElement.classList.add("flipbook--no-page-shadow");
		}

		const pageElements = bookElement.querySelectorAll(".page");
		if (!pageElements.length) {
			throw new Error("No pages found in flipbook");
		}
		this.pageElements = Array.from(pageElements) as HTMLElement[];
		for (const page of this.pageElements) {
			page.addEventListener("pointerdown", this.handlePageMouseDown);
			page.addEventListener("mousedown", this.handlePageMouseDown);
			page.addEventListener("dragstart", this.handlePageDragStart, true);
		}
		this.leaves.splice(0, this.leaves.length);
		const leavesCount = Math.ceil(this.pagesCount / 2);

		// Determine which specific pages are cover exteriors (use coverSize).
		// Interior sides of cover leaves use leafSize — physically, the endpaper is
		// glued to the inside of the board and matches the text-block page size.
		const coverPageIndicesSet = this.buildCoverPageIndicesSet();

		// Set data attributes before recalculateSizes() so it can read dataset.isCoverPage
		// to apply the correct cover vs leaf dimensions on the very first layout pass.
		this.pageElements.forEach((pageElement, pageIndex) => {
			pageElement.dataset.pageIndex = pageIndex.toString();
			this.configurePageScrollport(pageElement, pageIndex);
			pageElement.dataset.pageSemanticName =
				this.pageSemantics?.indexToSemanticName(pageIndex) ?? "";
			pageElement.dataset.pageTitle = this.pageSemantics?.indexToTitle(pageIndex) ?? "";
			pageElement.dataset.isCoverPage = coverPageIndicesSet.has(pageIndex) ? "1" : "";
		});

		// Compute and apply sizes (also called on resize).
		// Must run after dataset.isCoverPage is set so covers get coverSize.
		this.recalculateSizes();

		this.pageElements.forEach((pageElement, pageIndex) => {
			const leafIndex = Math.floor(pageIndex / 2);

			const isOddPage = (pageIndex + 1) % 2 === 1;
			const isInitiallyTurned = this.initialTurnedLeaves.has(leafIndex);

			// Determine current page based on initial turned leaves
			// Current pages are the first two visible pages after all initially turned leaves
			const firstVisibleLeafIndex =
				this.initialTurnedLeaves.size > 0 ? Math.max(...this.initialTurnedLeaves) + 1 : 0;
			const isCurrentPage =
				leafIndex === firstVisibleLeafIndex ||
				(leafIndex === firstVisibleLeafIndex - 1 && isInitiallyTurned);

			pageElement.classList.add(
				isOddPage ? "odd" : "even",
				...(isCurrentPage ? ["current-page"] : []),
			);
			if (isOddPage) {
				this.leaves[leafIndex] = new Leaf(
					leafIndex,
					[pageElement, undefined],
					isInitiallyTurned,
					{
						isLTR: this.isLTR,
						leavesCount: leavesCount,
						pagesCount: this.pagesCount,
						pageShadow: this.pageShadow,
						snapshotDuringFlip: this.snapshotDuringFlip,
					},
					(direction: FlipDirection) => {
						const currentVisiblePageIndices: [number] | [number, number] =
							direction === FlipDirection.Forward
								? pageIndex + 2 === this.pagesCount
									? [pageIndex + 1]
									: [pageIndex + 1, pageIndex + 2]
								: pageIndex === 0
									? [pageIndex]
									: [pageIndex - 1, pageIndex];
						if (
							this.prevVisiblePageIndices &&
							this.prevVisiblePageIndices.length === currentVisiblePageIndices.length &&
							currentVisiblePageIndices.every((v, i) => v === this.prevVisiblePageIndices?.[i])
						) {
							return;
						}
						const prevVisiblePageIndices = this.prevVisiblePageIndices;
						this.prevVisiblePageIndices = currentVisiblePageIndices;

						// TODO expose to outside using https://github.com/open-draft/strict-event-emitter, and just be a consumer internally
						this.onTurned(currentVisiblePageIndices, prevVisiblePageIndices);
					},
				);
			} else {
				// Even page (back side of leaf) — attach to the leaf created above.
				this.leaves[leafIndex].pages[1] = pageElement;

				// Both pages of the leaf are now available.
				// Use applyTransform to set the correct initial transform — this ensures
				// the transforms exactly match what applyTransform produces during flips.
				// Previously, hardcoded transforms used rotateY(±180deg) for turned pages,
				// which made them invisible due to backface-visibility: hidden.
				const initialPosition = isInitiallyTurned ? 1 : 0;
				this.leaves[leafIndex].applyTransform(initialPosition);
			}
		});

		// Set initial visible page indices based on initially turned leaves.
		// Must match the post-flip model: the visible spread is the back of
		// the last turned leaf (odd page) and the front of the next un-turned
		// leaf (even page) → [lastTurnedLeaf*2+1, lastTurnedLeaf*2+2].
		const lastTurnedLeafIndex =
			this.initialTurnedLeaves.size > 0 ? Math.max(...this.initialTurnedLeaves) : -1;

		if (lastTurnedLeafIndex < 0) {
			this.prevVisiblePageIndices = 1 < this.pagesCount ? [0, 1] : [0];
		} else {
			const firstVisiblePageIndex = lastTurnedLeafIndex * 2 + 1;
			if (firstVisiblePageIndex >= this.pagesCount) {
				// All leaves are turned — show the last page(s)
				const lastLeafIndex = Math.ceil(this.pagesCount / 2) - 1;
				const lastLeafFirstPage = lastLeafIndex * 2;
				this.prevVisiblePageIndices =
					lastLeafFirstPage + 1 < this.pagesCount
						? [lastLeafFirstPage, lastLeafFirstPage + 1]
						: [lastLeafFirstPage];
			} else {
				this.prevVisiblePageIndices =
					firstVisiblePageIndex + 1 < this.pagesCount
						? [firstVisiblePageIndex, firstVisiblePageIndex + 1]
						: [firstVisiblePageIndex];
			}
		}

		// Both faces of a leaf exist in the DOM, but only one face of each
		// visible leaf belongs to the active spread. Also clear stale markers
		// when an existing engine is rendered again after destroy().
		this.pageElements.forEach((pageElement, pageIndex) => {
			pageElement.classList.toggle(
				"current-page",
				this.prevVisiblePageIndices?.includes(pageIndex) ?? false,
			);
		});

		this.bookmarkLayer = new BookmarkLayer(
			this.bookElement,
			() => ({
				currentPageIndex: this.currentPageIndex,
				currentLeafIndex: Math.floor(this.currentPageIndex / 2),
				direction: this.direction,
			}),
			(pageIndex) => this.jumpToPage(pageIndex),
			this.pagesCount,
			this.handleBookmarkPointerDown,
		);
		this.bookmarkLayer.setMouseMode(this.mouseMode);
		this.bookmarkLayer.setProvider(this.getBookmarkProvider());
		if (this.bookmarksEnabled) this.recalculateSizes();
		this.observeBookmarkLeaves();

		// Observe container size changes and re-layout automatically.
		if (typeof ResizeObserver !== "undefined") {
			this.resizeObserver = new ResizeObserver(() => {
				this.recalculateSizes();
			});
			this.resizeObserver.observe(this.bookElement);
		}

		this.hammer = new Hammer(this.bookElement, { touchAction: "pan-y" });
		// Mouse pulls can move in both axes while touch keeps native vertical scrolling.
		this.hammer.get("pan").set({ direction: Hammer.DIRECTION_ALL });
		this.hammer.on("panstart", this.onDragStart.bind(this));
		this.hammer.on("panmove", this.onDragUpdate.bind(this));
		this.hammer.on("panend", this.onDragEnd.bind(this));
		this.hammer.on("pancancel", (event) => this.onDragEnd(event, true));
		this.bookElement.addEventListener("touchstart", this.handleTouchStart, {
			passive: false,
		});
		this.bookElement.addEventListener("touchmove", this.handleTouchMove, {
			passive: false,
		});
		this.bookElement.addEventListener(
			"mousemove",
			this.handleMouseMove as unknown as EventListener,
		);
		this.bookElement.addEventListener("mouseleave", this.handleMouseLeave as EventListener);
		// Suppress click events that fire immediately after a drag gesture.
		// This prevents child interactive elements (buttons, links) from
		// activating when the user was actually performing a page flip.
		this.bookElement.addEventListener(
			"click",
			this.handleClickAfterDrag as EventListener,
			true, // capture phase — intercept before the click reaches any child
		);
		// Apply initial leaves buffer visibility
		this.updateLeavesBufferVisibility();
		if (debug) this.fillDebugBar();

		// History: adopt the deep-linked page, then initial replaceState and popstate listener
		if (typeof window !== "undefined" && this.historyMapper) {
			const currentUrl = window.location.pathname + window.location.search + window.location.hash;
			// A URL no book wrote is an external deep link — open at its page.
			// A book-authored URL (this or another book's last write) is positional
			// state, not a request, so it must not reposition this book.
			if (currentUrl !== lastAuthoredUrl) {
				const initialPage = this.historyMapper.routeToPage(currentUrl);
				if (
					initialPage !== null &&
					initialPage >= 0 &&
					initialPage < this.pagesCount &&
					initialPage !== this.currentPageIndex
				) {
					this.restorePage(initialPage);
				}
			}
			this.syncHistoryAndNotifyFlipped(true);
			this._boundPopstate = this.handlePopstate.bind(this);
			window.addEventListener("popstate", this._boundPopstate, true);
		}
	}

	/**
	 * Update visibility of leaves based on the buffer setting.
	 * Leaves outside the buffer range are hidden for performance.
	 */
	private updateLeavesBufferVisibility(): void {
		if (this.leavesBuffer === undefined) {
			return; // No buffer - all leaves stay visible
		}

		const leavesCount = this.leaves.length;
		if (leavesCount === 0) return;

		// Find the current leaf index (the first non-turned leaf, or last leaf if all turned)
		const [leftLeaf, rightLeaf] = this.currentOrTurningLeaves;
		const currentLeafIndex = rightLeaf?.index ?? leftLeaf?.index ?? 0;

		// Calculate buffer range
		const bufferStart = Math.max(0, currentLeafIndex - this.leavesBuffer);
		const bufferEnd = Math.min(leavesCount - 1, currentLeafIndex + this.leavesBuffer);

		// Cover leaves must always stay visible — they are cover-sized and sit behind
		// all leaf-sized pages, acting as the physical book boards. Hiding them would
		// remove the realistic "frame" effect.
		const coverLeafIndices = new Set<number>();
		if (this.coverPageIndices) {
			const indices =
				this.coverPageIndices === "auto" ? [0, this.pagesCount - 1] : this.coverPageIndices;
			for (const pageIdx of indices) {
				coverLeafIndices.add(Math.floor(pageIdx / 2));
			}
		}

		// Update visibility of all leaves
		for (let i = 0; i < leavesCount; i++) {
			const leaf = this.leaves[i];
			const isWithinBuffer = i >= bufferStart && i <= bufferEnd;
			const isCoverLeaf = coverLeafIndices.has(i);
			// A leaf whose flip is in flight must stay visible even outside the
			// buffer window — during rapid consecutive flips the window can move
			// past leaves that are still mid-animation, and hiding them makes the
			// turning page vanish and reappear (the flicker of issue #167).
			const isFlipping = this.activeFlips.has(i) || leaf.isFlipping;

			// Cover leaves are always visible; other leaves follow the buffer range.
			const visible = isCoverLeaf || isWithinBuffer || isFlipping;

			// Update both pages of the leaf
			for (const page of leaf.pages) {
				if (page) {
					const display = visible ? "" : "none";
					if (page.style.display !== display) page.style.display = display;
					// Use content-visibility to skip rendering of off-screen pages.
					// "hidden" is more aggressive than display:none — the browser
					// also skips layout/paint entirely, reducing memory pressure.
					const visibility = visible ? "visible" : "hidden";
					if (page.style.contentVisibility !== visibility)
						page.style.contentVisibility = visibility;
				}
			}
		}
	}

	private fillDebugBar() {
		const debugBar = document.createElement("div");
		debugBar.className = "flipbook-debug-bar flipbook-debug-bar--hidden";
		this.bookElement?.appendChild(debugBar);
		this.debugBar = debugBar;
		this.debugTimer = setInterval(() => {
			// Populate debug bar with relevant information (throttled to reduce flicker)
			const activeFlipsInfo = Array.from(this.activeFlips.entries())
				.map(([idx, state]) => `${idx}:${state.leaf.flipPosition.toFixed(2)}`)
				.join(", ");
			debugBar.innerHTML = `
          <div>Direction: ${this.isLTR ? "LTR" : "RTL"}</div>
          <div>Active Flips: ${this.activeFlips.size} [${activeFlipsInfo}]</div>
          <div>Pending Flip dir: ${this.pendingFlipDirection}</div>
        `;
		}, 200);
	}

	/**
	 * Get the current manually-controlled flip state (the one being dragged).
	 * Returns undefined if no manual flip is in progress.
	 */
	private get currentManualFlip(): FlipState | undefined {
		for (const state of this.activeFlips.values()) {
			if (!state.isDuringAutoFlip) {
				return state;
			}
		}
		return undefined;
	}

	/**
	 * Find the next available leaf for flipping in the given direction.
	 * Excludes leaves that are already being flipped.
	 */
	private getNextAvailableLeaf(direction: FlipDirection): Leaf | undefined {
		if (direction === FlipDirection.Forward) {
			// Find the rightmost leaf that's not already flipping
			// Start from the current right leaf and go forward
			const [, rightLeaf] = this.currentOrTurningLeaves;
			if (!rightLeaf) return undefined;

			// Find a leaf that's not in activeFlips
			for (let i = rightLeaf.index; i < this.leaves.length; i++) {
				const leaf = this.leaves[i];
				if (!this.activeFlips.has(leaf.index) && !leaf.isTurned) {
					return leaf;
				}
			}
			return undefined;
		} else if (direction === FlipDirection.Backward) {
			// Find the leftmost leaf that's not already flipping
			const [leftLeaf] = this.currentOrTurningLeaves;
			if (!leftLeaf) return undefined;

			// Find a leaf that's not in activeFlips
			for (let i = leftLeaf.index; i >= 0; i--) {
				const leaf = this.leaves[i];
				if (!this.activeFlips.has(leaf.index) && (leaf.isTurned || leaf.isTurning)) {
					return leaf;
				}
			}
			return undefined;
		}
		return undefined;
	}

	private onDragStart(event: HammerInput, fromBookmark = false) {
		if (fromBookmark) this.gestureStartedInNoFlipZone = false;
		const isTouch = event.pointerType === "touch" || event.srcEvent?.type.startsWith("touch");
		if (isTouch && this.touchDirectionLock === "none") {
			const dx = Number.isFinite(event.deltaX) ? Math.abs(event.deltaX) : 0;
			const dy = Number.isFinite(event.deltaY) ? Math.abs(event.deltaY) : 0;
			if (Math.max(dx, dy) > FlipBook.DIRECTION_LOCK_THRESHOLD) {
				this.touchDirectionLock = dx >= dy ? "horizontal" : "vertical";
			}
		}
		// Reject pan events that belong to a touch gesture locked to vertical
		// (i.e. the user is scrolling, not flipping).
		if (this.touchDirectionLock === "vertical" && event.pointerType !== "mouse") {
			return;
		}
		// Do not start flip when gesture begins inside a no-flip zone (e.g. horizontal carousel)
		if (
			!fromBookmark &&
			(this.gestureStartedInNoFlipZone ?? this.isInsideNoFlipZone(event.srcEvent?.target ?? null))
		) {
			this.gestureStartedInNoFlipZone = true;
			return;
		}
		// Allow starting a new flip even if others are in auto-flip mode
		// Only block if we already have a manual flip in progress
		if (this.currentManualFlip) {
			this.pendingFlipDirection = FlipDirection.None;
			this.pendingFlipStartingPos = 0;
			this.pendingFlipStartingY = undefined;
			return;
		}
		this.isDragging = true;
		this.clearHoverShadow();
		this.pendingFlipStartingPos =
			event.center.x - (Number.isFinite(event.deltaX) ? event.deltaX : 0);
		this.pendingFlipStartingY = Number.isFinite(event.center.y)
			? event.center.y - (Number.isFinite(event.deltaY) ? event.deltaY : 0)
			: undefined;
		this.pendingFlipDirection = FlipDirection.None;
		if (
			(Number.isFinite(event.deltaX) && event.deltaX !== 0) ||
			(Number.isFinite(event.deltaY) && event.deltaY !== 0)
		) {
			this.onDragUpdate(event, fromBookmark);
		}
	}

	private onDragUpdate(event: HammerInput, fromBookmark = false) {
		if (this.gestureStartedInNoFlipZone) return;
		// Reject pan events that belong to a touch gesture locked to vertical.
		if (this.touchDirectionLock === "vertical" && event.pointerType !== "mouse") {
			return;
		}

		// Get or create the current manual flip state
		let flipState = this.currentManualFlip;
		if (
			!fromBookmark &&
			!flipState &&
			(this.gestureStartedInNoFlipZone ?? this.isInsideNoFlipZone(event.srcEvent?.target ?? null))
		)
			return;

		const currentPos = event.center.x;
		const bookWidth = this.bookElement?.clientWidth ?? 0;
		if (bookWidth <= 0) return;

		// Calculate delta
		const startingPos = flipState?.startingPos ?? this.pendingFlipStartingPos;
		const delta = this.isLTR ? startingPos - currentPos : currentPos - startingPos;
		const verticalMove =
			Number.isFinite(event.center.y) && this.pendingFlipStartingY !== undefined
				? event.center.y - this.pendingFlipStartingY
				: 0;
		if (
			!flipState &&
			delta === 0 &&
			(!this.isDragging || verticalMove === 0 || event.pointerType === "touch")
		)
			return;

		// Determine direction on first meaningful movement
		const isRightSide = startingPos >= this.getSpineClientX();
		const direction =
			flipState?.direction ??
			(this.pendingFlipDirection !== FlipDirection.None
				? this.pendingFlipDirection
				: delta === 0
					? this.isLTR === isRightSide
						? FlipDirection.Forward
						: FlipDirection.Backward
					: delta > 0
						? FlipDirection.Forward
						: FlipDirection.Backward);

		// Lock in direction for this flip
		if (this.pendingFlipDirection === FlipDirection.None) {
			this.pendingFlipDirection = direction;
		}

		// Block starting a new flip in opposite direction while auto-flip is in progress
		// This prevents visual glitches when swiping backward while a forward flip is animating
		if (!flipState) {
			for (const state of this.activeFlips.values()) {
				if (state.isDuringAutoFlip && state.direction !== direction) {
					// There's an auto-flip in the opposite direction - block this new flip
					return;
				}
			}
		}

		// If we don't have a flip state yet, create one
		if (!flipState) {
			const leaf = this.getNextAvailableLeaf(direction);
			if (!leaf) return;

			// Acquire the flip lock for the full drag cycle; the matching
			// endFlip() is deferred until the release animation completes
			// in onDragEnd, so the snapshot/scrollbar lockdown stays stable.
			leaf.beginFlip();
			const originY = this.getFoldPointerY(
				leaf,
				direction,
				this.pendingFlipStartingY ?? event.center.y,
			);
			leaf.setFoldOrigin(originY);

			flipState = {
				leaf,
				direction,
				startingPos,
				startingY:
					this.pendingFlipStartingY ??
					(Number.isFinite(event.center.y) ? event.center.y : undefined),
				cornerY: originY < 0.5 ? 0 : 1,
				delta: 0,
				isDuringAutoFlip: false,
			};
			this.activeFlips.set(leaf.index, flipState);
			// The picked leaf may be buffer-hidden — reveal it before its flip starts.
			this.updateLeavesBufferVisibility();
		}

		// Update delta
		flipState.delta = delta;
		const page =
			flipState.direction === FlipDirection.Backward
				? (flipState.leaf.pages[1] ?? flipState.leaf.pages[0])
				: flipState.leaf.pages[0];
		const pageWidth = Number.parseFloat(page.style.width);
		const pageHeight = Number.parseFloat(page.style.height);
		const hasDimensions =
			Number.isFinite(pageWidth) && pageWidth > 0 && Number.isFinite(pageHeight) && pageHeight > 0;
		const rigid = flipState.leaf.pages.some((side) => side?.dataset.isCoverPage === "1");
		if (hasDimensions && !rigid && flipState.leaf.pages[1]) {
			const dy =
				Number.isFinite(event.center.y) && flipState.startingY !== undefined
					? event.center.y - flipState.startingY
					: 0;
			flipState.leaf.setManualFold({
				x: (flipState.direction === FlipDirection.Forward ? 1 : -1) - delta / pageWidth,
				y: (flipState.cornerY ?? 1) + dy / pageHeight,
			});
		} else {
			const travel = Number.isFinite(pageWidth) && pageWidth > 0 ? pageWidth * 2 : bookWidth;
			const position =
				flipState.direction === FlipDirection.Forward ? delta / travel : 1 + delta / travel;
			flipState.leaf.setManualPosition(Math.max(0, Math.min(1, position)));
		}
	}

	private getFoldPointerY(leaf: Leaf, direction: FlipDirection, pointerY: number): number {
		const page =
			direction === FlipDirection.Backward ? (leaf.pages[1] ?? leaf.pages[0]) : leaf.pages[0];
		const height = Number.parseFloat(page.style.height);
		const top = Number.parseFloat(page.style.top);
		if (!Number.isFinite(pointerY) || !Number.isFinite(height) || height <= 0) return 0.75;
		const bookTop = this.bookElement?.getBoundingClientRect().top ?? 0;
		return Math.max(
			0,
			Math.min(1, (pointerY - bookTop - (Number.isFinite(top) ? top : 0)) / height),
		);
	}

	private getSpineClientX(): number {
		const book = this.bookElement;
		if (!book) return this.spineX;
		const rect = book.getBoundingClientRect();
		const scale = rect.width > 0 && book.clientWidth > 0 ? rect.width / book.clientWidth : 1;
		return rect.left + this.spineX * scale;
	}

	private onDragEnd(event: HammerInput, cancelled = false) {
		this.gestureStartedInNoFlipZone = undefined;
		// Suppress the click that the browser fires after pointerup following a drag.
		this._suppressNextClick = true;

		const flipState = this.currentManualFlip;
		if (!flipState) {
			this.pendingFlipDirection = FlipDirection.None;
			this.pendingFlipStartingPos = 0;
			this.pendingFlipStartingY = undefined;
			this.isDragging = false;
			this.clearHoverShadow();
			return;
		}

		const ppsX = event.velocityX * 1000; // pixels per second
		let flipTo: FlipPosition;

		switch (flipState.direction) {
			case FlipDirection.Forward:
				if (
					!cancelled &&
					((this.isLTR ? ppsX < -this.fastDeltaThreshold : ppsX > this.fastDeltaThreshold) ||
						flipState.leaf.flipPosition >= 0.5)
				) {
					flipTo = 1;
				} else {
					flipTo = 0;
				}
				break;
			case FlipDirection.Backward:
				if (
					!cancelled &&
					((this.isLTR ? ppsX > this.fastDeltaThreshold : ppsX < -this.fastDeltaThreshold) ||
						flipState.leaf.flipPosition <= 0.5)
				) {
					flipTo = 0;
				} else {
					flipTo = 1;
				}
				break;
			default:
				// Safety: release the drag-level flip lock if direction is unexpected.
				flipState.leaf.endFlip();
				this.activeFlips.delete(flipState.leaf.index);
				this.pendingFlipDirection = FlipDirection.None;
				this.pendingFlipStartingPos = 0;
				this.pendingFlipStartingY = undefined;
				this.isDragging = false;
				return;
		}

		// Mark as auto-flip and reset pending state
		flipState.isDuringAutoFlip = true;
		this.pendingFlipDirection = FlipDirection.None;
		this.pendingFlipStartingPos = 0;
		this.pendingFlipStartingY = undefined;
		this.isDragging = false;

		const targetPageIndex =
			flipTo === 1 ? 2 * (flipState.leaf.index + 1) : 2 * flipState.leaf.index;
		const direction: PageFlipDirection = flipTo === 1 ? "forward" : "backward";
		this.lastFlipParams = this.buildPageFlipParams(targetPageIndex, direction);
		if (this.onPageFlipping) this.onPageFlipping(this.lastFlipParams);

		// Complete the flip asynchronously - don't block new flips!
		flipState.leaf.flipToPosition(flipTo).then(() => {
			// Release the drag-level flip lock acquired in onDragUpdate.
			// The animation's own beginFlip/endFlip is ref-counted inside, so
			// the snapshot stays active until this final endFlip() zeroes it.
			flipState.leaf.endFlip();
			this.activeFlips.delete(flipState.leaf.index);
		});
	}

	private handleTouchStart = (e: TouchEvent) => {
		this._suppressNextClick = false;
		if (e.touches.length > 1) {
			return;
		}
		const touch = e.touches[0];
		this.touchStartingPos = { x: touch.pageX, y: touch.pageY };
		this.touchStartedInNoFlipZone = this.isInsideNoFlipZone(e.target);
		this.gestureStartedInNoFlipZone = this.touchStartedInNoFlipZone;
		this.touchDirectionLock = "none";
	};

	private handleTouchMove = (e: TouchEvent) => {
		if (e.touches.length > 1) {
			return;
		}
		// Allow horizontal scroll (e.g. carousel) when touch started inside a no-flip zone
		if (this.touchStartedInNoFlipZone) {
			return;
		}
		const touch = e.touches[0];
		const deltaX = touch.pageX - this.touchStartingPos.x;
		const deltaY = touch.pageY - this.touchStartingPos.y;

		// Lock direction on the first significant movement.  Once locked the
		// decision is final for the rest of this gesture — prevents the old
		// bug where accumulated vertical delta kept overruling a late
		// horizontal change-of-direction within the same gesture.
		if (this.touchDirectionLock === "none") {
			const absDx = Math.abs(deltaX);
			const absDy = Math.abs(deltaY);
			if (absDx > FlipBook.DIRECTION_LOCK_THRESHOLD || absDy > FlipBook.DIRECTION_LOCK_THRESHOLD) {
				this.touchDirectionLock = absDx >= absDy ? "horizontal" : "vertical";
			}
		}

		if (this.touchDirectionLock === "horizontal") {
			e.preventDefault();
		}
		// 'vertical' or 'none' → let the browser handle native scroll
	};

	private handleMouseMove = throttle(MOUSE_MOVE_THROTTLE_MS, (event: MouseEvent) => {
		if (!this.bookElement) return;
		if (
			this.isInsideNoFlipZone(event.target) ||
			this.mouseMode === "select" ||
			event.buttons !== 0 ||
			this.isDragging ||
			this.currentManualFlip ||
			this.activeFlips.size > 0
		) {
			this.clearHoverShadow();
			return;
		}

		const rect = this.bookElement.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) {
			this.clearHoverShadow();
			return;
		}

		const x = ((event.clientX - rect.left) * this.bookElement.clientWidth) / rect.width;
		const y = ((event.clientY - rect.top) * this.bookElement.clientHeight) / rect.height;
		const spineX = this.spineX;
		const isRightSide = x >= spineX;
		const isForward = this.isLTR === isRightSide;
		const direction = isForward ? FlipDirection.Forward : FlipDirection.Backward;
		const leaf = this.getNextAvailableLeaf(direction);
		if (!leaf) {
			this.clearHoverShadow();
			return;
		}

		// Use resting page dimensions: the preview itself transforms the page bounds.
		const page = isForward ? leaf.pages[0] : (leaf.pages[1] ?? leaf.pages[0]);
		const width = Number.parseFloat(page.style.width);
		const height = Number.parseFloat(page.style.height);
		const top = Number.parseFloat(page.style.top);
		const distanceFromEdge = isRightSide ? spineX + width - x : x - (spineX - width);
		const edgeZone = width * EDGE_ZONE_RATIO;
		if (
			!Number.isFinite(distanceFromEdge) ||
			!Number.isFinite(y) ||
			!Number.isFinite(height) ||
			!Number.isFinite(top) ||
			width <= 0 ||
			height <= 0 ||
			distanceFromEdge < 0 ||
			distanceFromEdge > edgeZone ||
			y < top ||
			y > top + height
		) {
			this.clearHoverShadow();
			return;
		}
		const edgeProgress = 1 - Math.min(1, distanceFromEdge / edgeZone);
		const hoverStrength = edgeProgress * HOVER_STRENGTH_MAX;

		if (this.hoveredLeaf && this.hoveredLeaf !== leaf) {
			this.hoveredLeaf.setHoverShadow(0);
		}
		if (this.hoveredLeaf !== leaf) {
			leaf.setFoldOrigin((y - top) / height);
		}
		this.hoveredLeaf = leaf;
		leaf.setHoverShadow(hoverStrength);
	});

	private handleMouseLeave = () => {
		this.handleMouseMove.cancel({ upcomingOnly: true });
		this.clearHoverShadow();
	};

	/**
	 * Capture-phase click handler that suppresses clicks fired by the browser
	 * immediately after a drag gesture ends. Without this, releasing the pointer
	 * on an interactive element (button, link) inside a page would trigger both
	 * the flip animation AND the element's click handler.
	 */
	private handleClickAfterDrag = (e: Event) => {
		if (
			e.target instanceof Element &&
			e.target.closest(".flipbook-bookmarks, .flipbook-bookmark-surface")
		) {
			this._suppressNextClick = false;
			const button = e.target.closest<HTMLElement>(".flipbook-bookmark");
			if (button?.dataset.bookmarkDragged === "true") {
				delete button.dataset.bookmarkDragged;
				e.stopPropagation();
				e.preventDefault();
			}
			return;
		}
		if (this._suppressNextClick) {
			this._suppressNextClick = false;
			e.stopPropagation();
			e.preventDefault();
		}
	};

	private clearHoverShadow() {
		if (this.hoveredLeaf) {
			this.hoveredLeaf.setHoverShadow(0);
			this.hoveredLeaf = undefined;
		}
	}
	private onTurned(
		currentVisiblePageIndices: [number] | [number, number],
		prevVisibilePageIndices?: [number] | [number, number],
	) {
		for (let i = 0; i < this.pageElements.length; i++) {
			const pageElement = this.pageElements[i];
			const inCurrent = currentVisiblePageIndices.includes(i);
			const inPrev = prevVisibilePageIndices?.includes(i);
			const action = inCurrent
				? pageElement.classList.add
				: !prevVisibilePageIndices || !inPrev
					? () => null
					: pageElement.classList.remove;
			action.bind(pageElement.classList)("current-page");
		}
		// Update leaves buffer visibility after turn completes
		this.updateLeavesBufferVisibility();
		// Notify React/consumer and sync history
		this.syncHistoryAndNotifyFlipped(false);
		// TODO expose to outside using https://github.com/open-draft/strict-event-emitter, and just be a consumer internally.
		// TODO: set prev-page / next-page classes for prev/next pages as accordingally
	}
	/**
	 * Get the index of the current (leftmost visible) page.
	 * Returns 0 if no pages are visible.
	 */
	get currentPageIndex(): number {
		return this.prevVisiblePageIndices?.[0] ?? 0;
	}

	/**
	 * Get the total number of pages in the flipbook.
	 */
	get totalPages(): number {
		return this.pagesCount;
	}

	/**
	 * Check if the book is currently showing the first page(s).
	 */
	get isFirstPage(): boolean {
		return this.currentPageIndex === 0;
	}

	/**
	 * Check if the book is currently showing the last page(s).
	 */
	get isLastPage(): boolean {
		const lastPageIndex = this.pagesCount - 1;
		return this.prevVisiblePageIndices?.includes(lastPageIndex) ?? false;
	}

	/**
	 * Check if there's an active auto-flip in the given direction.
	 */
	private hasActiveAutoFlipInDirection(direction: FlipDirection): boolean {
		for (const state of this.activeFlips.values()) {
			if (state.isDuringAutoFlip && state.direction === direction) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Animate flip to the next page.
	 * @returns Promise that resolves when the flip animation completes
	 */
	async flipNext(): Promise<void> {
		// Block if there's an active auto-flip in the opposite direction
		if (this.hasActiveAutoFlipInDirection(FlipDirection.Backward)) {
			return;
		}

		const leaf = this.getNextAvailableLeaf(FlipDirection.Forward);
		if (!leaf) return;
		this.clearHoverShadow();

		const flipState: FlipState = {
			leaf,
			direction: FlipDirection.Forward,
			startingPos: 0,
			delta: 0,
			isDuringAutoFlip: true,
		};
		this.activeFlips.set(leaf.index, flipState);
		// The picked leaf may be buffer-hidden — reveal it before its flip starts.
		this.updateLeavesBufferVisibility();
		const targetPageIndex = this.currentPageIndex + 2;
		this.lastFlipParams = this.buildPageFlipParams(targetPageIndex, "forward");
		if (this.onPageFlipping) this.onPageFlipping(this.lastFlipParams);

		try {
			await leaf.flipToPosition(1);
		} finally {
			this.activeFlips.delete(leaf.index);
		}
	}

	/**
	 * Animate flip to the previous page.
	 * @returns Promise that resolves when the flip animation completes
	 */
	async flipPrev(): Promise<void> {
		// Block if there's an active auto-flip in the opposite direction
		if (this.hasActiveAutoFlipInDirection(FlipDirection.Forward)) {
			return;
		}

		const leaf = this.getNextAvailableLeaf(FlipDirection.Backward);
		if (!leaf) return;
		this.clearHoverShadow();

		const flipState: FlipState = {
			leaf,
			direction: FlipDirection.Backward,
			startingPos: 0,
			delta: 0,
			isDuringAutoFlip: true,
		};
		this.activeFlips.set(leaf.index, flipState);
		// The picked leaf may be buffer-hidden — reveal it before its flip starts.
		this.updateLeavesBufferVisibility();
		const targetPageIndex = this.currentPageIndex - 2;
		this.lastFlipParams = this.buildPageFlipParams(Math.max(0, targetPageIndex), "backward");
		if (this.onPageFlipping) this.onPageFlipping(this.lastFlipParams);

		try {
			await leaf.flipToPosition(0);
		} finally {
			this.activeFlips.delete(leaf.index);
		}
	}

	/**
	 * Animate to a specific page index.
	 * Flips through pages sequentially to reach the target.
	 * @param pageIndex - The target page index (0-based)
	 * @returns Promise that resolves when all flip animations complete
	 */
	async flipToPage(pageIndex: number): Promise<void> {
		if (pageIndex < 0 || pageIndex >= this.pagesCount) {
			console.warn(
				`flipToPage: Invalid page index ${pageIndex}. Must be between 0 and ${this.pagesCount - 1}.`,
			);
			return;
		}

		// Compute the last-turned-leaf index that makes pageIndex visible,
		// using the same formula as jumpToPage.
		const targetLastTurned = pageIndex <= 0 ? -1 : Math.floor((pageIndex - 1) / 2);
		const currentLastTurned =
			this.currentPageIndex <= 0 ? -1 : Math.floor((this.currentPageIndex - 1) / 2);

		if (targetLastTurned === currentLastTurned) {
			return; // Already at the target spread
		}

		if (targetLastTurned > currentLastTurned) {
			const steps = targetLastTurned - currentLastTurned;
			for (let i = 0; i < steps; i++) {
				await this.flipNext();
			}
		} else {
			const steps = currentLastTurned - targetLastTurned;
			for (let i = 0; i < steps; i++) {
				await this.flipPrev();
			}
		}
	}

	/**
	 * Jump to a specific page instantly without animation.
	 * @param pageIndex - The target page index (0-based)
	 */
	jumpToPage(pageIndex: number): void {
		if (pageIndex < 0 || pageIndex >= this.pagesCount) {
			console.warn(
				`jumpToPage: Invalid page index ${pageIndex}. Must be between 0 and ${this.pagesCount - 1}.`,
			);
			return;
		}

		const isLastPage = pageIndex === this.pagesCount - 1;
		const isOddPage = pageIndex % 2 === 1;
		// If targeting the last page and it's odd (back of leaf), close the book reversed
		const closeBookReversed = isLastPage && isOddPage;

		// Determine which leaf should be the last one turned.
		// A leaf's pages are visible as follows:
		//   - At position 0 (not turned): its even page (front) is visible
		//   - At position 1 (turned): its odd page (back) is visible
		// The visible spread after turning leaf k is [2k+1, 2k+2]:
		//   back of leaf k (odd) + front of leaf k+1 (even).
		// For page 0, no leaves need to be turned (initial spread [0, 1]).
		let lastTurnedLeafIndex: number;
		if (pageIndex <= 0) {
			lastTurnedLeafIndex = -1; // No leaves turned
		} else if (closeBookReversed) {
			lastTurnedLeafIndex = this.leaves.length - 1; // All leaves turned
		} else {
			lastTurnedLeafIndex = Math.floor((pageIndex - 1) / 2);
		}

		// Set all leaves up to lastTurnedLeafIndex as turned, all after as not turned
		for (let i = 0; i < this.leaves.length; i++) {
			const leaf = this.leaves[i];
			const shouldBeTurned = i <= lastTurnedLeafIndex;

			if (shouldBeTurned && !leaf.isTurned) {
				// Turn this leaf instantly
				leaf.flipPosition = 1;
				this.applyLeafTransform(leaf, 1);
			} else if (!shouldBeTurned && leaf.isTurned) {
				// Unturn this leaf instantly
				leaf.flipPosition = 0;
				this.applyLeafTransform(leaf, 0);
			}
		}

		// Update visible page indices
		if (closeBookReversed) {
			// Closed reversed: only show the last page
			this.prevVisiblePageIndices = [pageIndex];
		} else if (lastTurnedLeafIndex < 0) {
			// No leaves turned: initial spread
			this.prevVisiblePageIndices = 1 < this.pagesCount ? [0, 1] : [0];
		} else {
			const firstVisiblePageIndex = lastTurnedLeafIndex * 2 + 1;
			this.prevVisiblePageIndices =
				firstVisiblePageIndex + 1 < this.pagesCount
					? [firstVisiblePageIndex, firstVisiblePageIndex + 1]
					: [firstVisiblePageIndex];
		}

		// Update current-page classes
		for (let i = 0; i < this.pageElements.length; i++) {
			const pageElement = this.pageElements[i];
			if (this.prevVisiblePageIndices.includes(i)) {
				pageElement.classList.add("current-page");
			} else {
				pageElement.classList.remove("current-page");
			}
		}

		// Update leaves buffer visibility
		this.updateLeavesBufferVisibility();

		// Notify callback and sync history
		this.syncHistoryAndNotifyFlipped(false);
	}

	/**
	 * Show a page selected by an external router or browser history entry without
	 * adding another history entry. Page-change callbacks still run.
	 */
	restorePage(pageIndex: number): void {
		const wasRestoring = this._isRestoringFromHistory;
		this._isRestoringFromHistory = true;
		try {
			this.jumpToPage(pageIndex);
		} finally {
			this._isRestoringFromHistory = wasRestoring;
		}
	}

	/**
	 * Apply transform styles to a leaf's pages for a given flip position.
	 * Used for instant positioning (jumpToPage).
	 */
	private applyLeafTransform(leaf: Leaf, position: number): void {
		leaf.applyTransform(position);
	}

	/**
	 * Clean up event listeners and Hammer instance.
	 * Should be called when the FlipBook is no longer needed.
	 */
	destroy() {
		this.gestureStartedInNoFlipZone = undefined;
		if (this.debugTimer !== undefined) {
			clearInterval(this.debugTimer);
			this.debugTimer = undefined;
		}
		this.debugBar?.remove();
		this.debugBar = undefined;
		this.cancelBookmarkPointerDrag?.();
		this.bookmarkLayer?.destroy();
		this.bookmarkLayer = undefined;
		if (typeof window !== "undefined" && this._boundPopstate) {
			window.removeEventListener("popstate", this._boundPopstate, true);
			this._boundPopstate = undefined;
		}
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = undefined;
		}
		if (this.hammer) {
			this.hammer.destroy();
			this.hammer = undefined;
		}
		if (this.bookElement) {
			for (const page of this.pageElements) {
				page.removeEventListener("pointerdown", this.handlePageMouseDown);
				page.removeEventListener("mousedown", this.handlePageMouseDown);
				page.removeEventListener("dragstart", this.handlePageDragStart, true);
			}
			this.bookElement.removeEventListener("touchstart", this.handleTouchStart as EventListener);
			this.bookElement.removeEventListener("touchmove", this.handleTouchMove as EventListener);
			this.bookElement.removeEventListener(
				"mousemove",
				this.handleMouseMove as unknown as EventListener,
			);
			this.bookElement.removeEventListener("mouseleave", this.handleMouseLeave as EventListener);
			this.bookElement.removeEventListener(
				"click",
				this.handleClickAfterDrag as EventListener,
				true,
			);
		}
	}
}

export type { Bookmark, BookmarkContext, BookmarkPlacement, BookmarkProvider } from "./bookmarks";
export { createDefaultBookmarkProvider } from "./default-bookmarks";
export { createDefaultHistoryMapper } from "./default-history-mapper";
export type {
	FlipPageSemantic,
	HistoryMapper,
	MouseMode,
	PageFlipDirection,
	PageFlipParams,
} from "./flip-book-options";
export { FlipBook, type PageSemantics };
