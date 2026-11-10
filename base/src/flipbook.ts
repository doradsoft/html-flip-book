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
	private readonly flipAxis: "horizontal" | "vertical" = "horizontal";
	private readonly bindingSize: number = 64;
	private mouseMode: MouseMode = "turn";
	private readonly fastDeltaThreshold: number = DEFAULT_FAST_DELTA;
	private readonly initialTurnedLeaves: Set<number> = new Set();
	private readonly onPageChanged?: (pageIndex: number) => void;
	private readonly onLeafFlipActivity?: (leafIndex: number, active: boolean) => void;
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
	private readonly keepPageContentLayout: boolean;
	private previousVisibilityLeaves: Set<number> | undefined;
	private manualPoseFrame: number | undefined;
	private pendingManualPose:
		| { event: HammerInput; fromBookmark: boolean; state: FlipState }
		| undefined;
	private bufferContentInitialized = false;
	private readonly pendingContentPreparation = new Set<HTMLElement>();
	private readonly contentPreparationListeners = new Set<() => void>();
	private readonly contentPreparationHolds = new Set<symbol>();
	private contentPreparationFrame: number | undefined;
	private contentPreparationGeneration = 0;
	private preparedContent = new WeakSet<HTMLElement>();
	private preparationDocument: Document | undefined;
	private preparationPointerHeld = false;
	private readonly contentMasks = new Map<
		HTMLElement,
		{ opacity: string; priority: string; inert: string | null; ariaHidden: string | null }
	>();
	private readonly coverPageIndices?: number[] | "auto";
	private downloadConfig: DownloadConfig | undefined;
	private readonly downloadEnabled: boolean;
	private readonly pageShadow: boolean;
	private readonly snapshotDuringFlip: boolean;
	private leaves: Leaf[] = [];
	// flipping state - supports concurrent page flipping
	private activeFlips: Map<number, FlipState> = new Map();
	private pendingFlipStartingPos = 0;
	private pendingFlipStartingClientX: number | undefined;
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
	/** Layout-space Y of the top binding line for flipAxis 'vertical'. */
	private bindingY = 0;
	/**
	 * Whether the in-progress pointer gesture started inside the vertical turn
	 * affordance (the sheet's lower free edge). Undefined until a press records
	 * it; mouse and touch both populate it before Hammer pan events arrive.
	 */
	private turnZoneGesture: boolean | undefined;

	private static readonly NO_FLIP_SELECTOR = "[data-flipbook-no-flip]";

	/** Fraction of a sheet's height at its lower free edge that starts a turn. */
	private static readonly VERTICAL_TURN_EDGE_RATIO = 0.22;

	private isInsideNoFlipZone(el: EventTarget | null): boolean {
		return el instanceof Element && el.closest(FlipBook.NO_FLIP_SELECTOR) != null;
	}

	/**
	 * Vertical turns are deliberately grabbed at the sheet's lower free edge so
	 * ordinary vertical scrolling and content interaction elsewhere are
	 * preserved. Returns true when the point sits in that affordance zone.
	 */
	private isPointInTurnZone(clientY: number, target: EventTarget | null): boolean {
		if (!(target instanceof Element)) return false;
		const page = target.closest(".page");
		if (!(page instanceof HTMLElement)) return false;
		const rect = page.getBoundingClientRect();
		if (rect.height <= 0) return false;
		return clientY >= rect.bottom - rect.height * FlipBook.VERTICAL_TURN_EDGE_RATIO;
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
		if (!isInitial && this.bookmarksEnabled && this.bookmarkLayer) {
			const insets = this.bookmarkLayer.refreshForNavigation();
			if (Object.values(insets).join() !== this.bookmarkClearance) {
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

	private get isVertical(): boolean {
		return this.flipAxis === "vertical";
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
		this.flipAxis = options.flipAxis || this.flipAxis;
		this.bindingSize =
			options.bindingSize !== undefined && Number.isFinite(options.bindingSize)
				? Math.max(0, options.bindingSize)
				: this.bindingSize;
		this.mouseMode = options.mouseMode ?? "turn";
		this.fastDeltaThreshold = options.fastDeltaThreshold ?? this.fastDeltaThreshold;
		this.initialTurnedLeaves = new Set(options.initialTurnedLeaves ?? []);
		this.pageSemantics = options.pageSemantics;
		this.bookmarkProvider = options.bookmarkProvider;
		this.bookmarksEnabled = options.enableBookmarks ?? false;
		this.onPageChanged = options.onPageChanged;
		this.onLeafFlipActivity = options.onLeafFlipActivity;
		this.onPageFlipping = options.onPageFlipping;
		this.onPageFlipped = options.onPageFlipped;
		this.historyMapper =
			options.enableHistory !== false
				? (options.historyMapper ?? createDefaultHistoryMapper(options.pageSemantics))
				: undefined;
		this.leavesBuffer = options.leavesBuffer;
		this.keepPageContentLayout =
			options.keepPageContentLayout === true && options.leavesBuffer != null;
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
			leaf.onBeforeFlip =
				this.bookmarksEnabled || this.onLeafFlipActivity
					? () => {
							this.onLeafFlipActivity?.(leaf.index, true);
							const frame = this.bookmarksEnabled ? leaf.transformFrame : undefined;
							if (frame) this.bookmarkLayer?.prepareLeaf(leaf.index, frame, leaf.pages[0]);
						}
					: undefined;
			leaf.onAfterFlip = this.onLeafFlipActivity
				? () => this.onLeafFlipActivity?.(leaf.index, false)
				: undefined;
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
		// Keep an existing native selection copyable until a page gesture starts.
		this.bookElement?.classList.toggle(
			"flipbook--preserve-selection",
			mode === "turn" && this.getBookSelection() !== null,
		);
		this.bookmarkLayer?.setMouseMode(mode);
		this.bookElement?.classList.toggle("flipbook--select-text", mode === "select");
		if (mode === "select") {
			this.cancelHoverUpdates();
			this.cancelPendingManualPose();
			this.clearHoverShadow();
		}
	}

	private getBookSelection(): Selection | null {
		const book = this.bookElement;
		const selection = book?.ownerDocument.getSelection();
		return book &&
			selection &&
			!selection.isCollapsed &&
			(book.contains(selection.anchorNode) || book.contains(selection.focusNode))
			? selection
			: null;
	}

	/** Keep mouse selection native by stopping the page's down event before Hammer sees it. */
	private handlePageMouseDown = (event: Event): void => {
		this.cancelHoverUpdates();
		// A swipe may emit no click. A fresh press must not inherit suppression
		// intended only for the previous gesture's synthetic click.
		this._suppressNextClick = false;
		if (event.type === "mousedown" || (event as PointerEvent).pointerType === "mouse") {
			this.gestureStartedInNoFlipZone = this.isInsideNoFlipZone(event.target);
			if (this.isVertical) {
				this.turnZoneGesture = this.isPointInTurnZone((event as MouseEvent).clientY, event.target);
			}
			if (this.gestureStartedInNoFlipZone) this.clearHoverShadow();
			if (
				this.mouseMode === "turn" &&
				event instanceof MouseEvent &&
				event.button === 0 &&
				!this.gestureStartedInNoFlipZone
			) {
				this.getBookSelection()?.removeAllRanges();
				// Restore selection blocking before the browser handles the press.
				this.bookElement?.classList.remove("flipbook--preserve-selection");
			}
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

	/** Block selection during motion without changing inherited content styles. */
	private handlePageSelectStart = (event: Event): void => {
		if (
			this.snapshotDuringFlip &&
			event.currentTarget instanceof HTMLElement &&
			event.currentTarget.classList.contains("page--flipping")
		) {
			event.preventDefault();
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
			} else this.queueManualDragUpdate(input(pointer), true);
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

		const bookmarkMeasurements = this.bookmarksEnabled ? this.bookmarkLayer?.measure() : undefined;
		const insets = this.bookmarkLayer?.getInsets(bookmarkMeasurements?.depth) ?? {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		};
		this.bookmarkClearance = Object.values(insets).join();
		const bookWidth = this.bookElement.clientWidth;
		const availableWidth = Math.max(0, bookWidth - insets.left - insets.right);
		const availableHeight = Math.max(0, this.bookElement.clientHeight - insets.top - insets.bottom);
		this.spineX = insets.left + availableWidth / 2;
		const isVertical = this.isVertical;
		// Vertical books split the column at the top binding: the lower half is
		// the live sheet stack hanging from the spiral, the upper half is the
		// clearance the turned sheets collect into. The spiral strip itself is a
		// decorative overlay straddling the seam (bindingSize thick), so each
		// stack gets half the available height.
		const sheetHeight = isVertical ? availableHeight / 2 : availableHeight;
		this.bindingY = isVertical ? insets.top + sheetHeight : insets.top + this.bindingSize;
		const maxCoverSize = isVertical
			? new Size(availableWidth, sheetHeight)
			: new Size(availableWidth / 2, availableHeight);
		const coverSize = maxCoverSize.aspectRatioFit(this.coverAspectRatio);
		const leafSize = new Size(
			(coverSize.width * this.leafAspectRatio.width) / this.coverAspectRatio.width,
			(coverSize.height * this.leafAspectRatio.height) / this.coverAspectRatio.height,
		);
		this.bookElement.style.perspective = `${Math.min(leafSize.width * 2, leafSize.height) * 2}px`;
		this.bookElement.style.setProperty(
			"--flipbook-binding-size",
			isVertical ? `${this.bindingSize}px` : "0px",
		);
		this.bookElement.style.setProperty("--flipbook-binding-y", `${this.bindingY}px`);

		const containerWidth = availableWidth;
		const containerHeight = availableHeight;

		for (const pageElement of this.pageElements) {
			const isCoverPage = pageElement.dataset.isCoverPage === "1";
			const pageSize = isCoverPage ? coverSize : leafSize;

			pageElement.style.width = `${pageSize.width}px`;
			pageElement.style.height = `${pageSize.height}px`;
			if (isVertical) {
				pageElement.style.left = `${insets.left + (containerWidth - pageSize.width) / 2}px`;
				// Sheets hang from the binding: their top edge sits on the binding
				// line so the spiral visually grips them.
				pageElement.style.top = `${this.bindingY}px`;
			} else {
				pageElement.style[this.isLTR ? "left" : "right"] =
					`${(this.isLTR ? insets.left : insets.right) + (containerWidth - 2 * pageSize.width) / 2}px`;
				pageElement.style.top = `${insets.top + (containerHeight - pageSize.height) / 2}px`;
			}
		}
		const outerSize =
			this.getBookmarkProvider()?.attachment === "pinned" &&
			this.pageElements.some((page) => page.dataset.isCoverPage === "1")
				? coverSize
				: leafSize;
		if (this.bookmarksEnabled)
			this.bookmarkLayer?.layout(
				{
					left: insets.left + (containerWidth - (isVertical ? 1 : 2) * outerSize.width) / 2,
					top: isVertical ? this.bindingY : insets.top + (containerHeight - outerSize.height) / 2,
					width: (isVertical ? 1 : 2) * outerSize.width,
					height: outerSize.height,
				},
				bookWidth,
				bookmarkMeasurements,
			);
		for (const leaf of this.leaves) {
			leaf.applyTransform(leaf.flipPosition);
		}
	}

	private configurePageScrollport(
		pageElement: HTMLElement,
		readingDirection: "ltr" | "rtl",
	): HTMLElement | undefined {
		pageElement.dataset.readingDirection = readingDirection;
		if (pageElement.querySelector(":scope > .flipbook-page-scrollport")) return;
		const document = pageElement.ownerDocument;
		const content = document.createElement("div");
		content.className = "flipbook-page-content";
		content.dir = readingDirection;
		content.append(...Array.from(pageElement.childNodes));
		const scrollport = document.createElement("div");
		scrollport.className = "flipbook-page-scrollport";
		scrollport.append(content);
		pageElement.append(scrollport);
		pageElement.style.overflow = "hidden";
		return scrollport;
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
		this.cancelHoverUpdates();
		this.cancelPendingManualPose();
		this.contentPreparationHolds.clear();
		this.cancelContentPreparation();
		this.unwatchPreparationInput();
		this.restoreContentMasks();
		this.preparedContent = new WeakSet();
		this.bufferContentInitialized = false;
		this.bookElement = bookElement as HTMLElement;
		if (this.keepPageContentLayout) {
			this.preparationDocument = this.bookElement.ownerDocument;
			this.preparationDocument.addEventListener(
				"pointerdown",
				this.prioritizePreparationInput,
				true,
			);
			this.preparationDocument.addEventListener("keydown", this.deferPreparationForInput, true);
			this.preparationDocument.addEventListener("pointerup", this.releasePreparationInput, true);
			this.preparationDocument.addEventListener(
				"pointercancel",
				this.releasePreparationInput,
				true,
			);
			this.preparationDocument.defaultView?.addEventListener("blur", this.releasePreparationInput);
		}
		this.setMouseMode(this.mouseMode);
		if (!this.bookElement.classList.contains("flipbook")) {
			this.bookElement.classList.add("flipbook");
		}
		this.bookElement.classList.toggle("flipbook--vertical", this.isVertical);
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
			page.addEventListener("selectstart", this.handlePageSelectStart, true);
		}
		this.leaves.splice(0, this.leaves.length);
		this.previousVisibilityLeaves = undefined;
		const leavesCount = Math.ceil(this.pagesCount / 2);

		// Determine which specific pages are cover exteriors (use coverSize).
		// Interior sides of cover leaves use leafSize — physically, the endpaper is
		// glued to the inside of the board and matches the text-block page size.
		const coverPageIndicesSet = this.buildCoverPageIndicesSet();
		this.pageElements.forEach((pageElement, pageIndex) => {
			pageElement.dataset.pageIndex = pageIndex.toString();
			const spineOnLeft = (pageIndex % 2 === 0) === this.isLTR;
			pageElement.dataset.scrollbarSide = spineOnLeft ? "left" : "right";
		});
		// Read inherited styles and scroll positions together. Interleaving these
		// reads with each page's wrapper/attribute writes repeats style work,
		// including for React's already-wrapped slots.
		const pageSetup = this.pageElements.map((pageElement) => {
			const declaredContent = pageElement.querySelector<HTMLElement>(
				":scope > .flipbook-page-scrollport > .flipbook-page-content",
			);
			const originalDirection =
				declaredContent?.style.direction ||
				declaredContent?.dir ||
				pageElement.style.direction ||
				pageElement.dir ||
				pageElement.ownerDocument.defaultView?.getComputedStyle(pageElement).direction;
			const readingDirection =
				originalDirection === "ltr" || originalDirection === "rtl"
					? originalDirection
					: this.direction;
			const scrollTop = pageElement.querySelector(":scope > .flipbook-page-scrollport")
				? 0
				: pageElement.scrollTop;
			return { readingDirection, scrollTop };
		});
		const scrollRestores: [HTMLElement, number][] = [];

		// Set data attributes before recalculateSizes() so it can read dataset.isCoverPage
		// to apply the correct cover vs leaf dimensions on the very first layout pass.
		this.pageElements.forEach((pageElement, pageIndex) => {
			const { readingDirection, scrollTop } = pageSetup[pageIndex];
			const scrollport = this.configurePageScrollport(pageElement, readingDirection);
			if (scrollport && scrollTop !== 0) scrollRestores.push([scrollport, scrollTop]);
			pageElement.dataset.pageSemanticName =
				this.pageSemantics?.indexToSemanticName(pageIndex) ?? "";
			pageElement.dataset.pageTitle = this.pageSemantics?.indexToTitle(pageIndex) ?? "";
			pageElement.dataset.isCoverPage = coverPageIndicesSet.has(pageIndex) ? "1" : "";
		});
		for (const [scrollport, scrollTop] of scrollRestores) scrollport.scrollTop = scrollTop;

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

		// Compute and apply sizes (also called on resize).
		// Must run after dataset.isCoverPage is set so covers get coverSize.
		this.recalculateSizes();

		this.pageElements.forEach((pageElement, pageIndex) => {
			const leafIndex = Math.floor(pageIndex / 2);

			const isOddPage = (pageIndex + 1) % 2 === 1;
			const isInitiallyTurned = this.initialTurnedLeaves.has(leafIndex);

			pageElement.classList.add(isOddPage ? "odd" : "even");
			if (isOddPage) {
				this.leaves[leafIndex] = new Leaf(
					leafIndex,
					[pageElement, undefined],
					isInitiallyTurned,
					{
						isLTR: this.isLTR,
						flipAxis: this.flipAxis,
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
		this.hammer.on("panmove", this.queueManualDragUpdate.bind(this));
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
	private updateLeavesBufferVisibility(refreshedLeaves?: ReadonlySet<number>): void {
		if (this.leavesBuffer === undefined) {
			return; // No buffer - all leaves stay visible
		}

		const leavesCount = this.leaves.length;
		if (leavesCount === 0) return;

		// Find the current leaf index (the first non-turned leaf, or last leaf if all turned)
		const [leftLeaf, rightLeaf] = this.currentOrTurningLeaves;
		const currentLeafIndex = rightLeaf?.index ?? leftLeaf?.index ?? 0;

		// Calculate buffer range
		// Keep opaque paper boxes even when their covered content is dormant.
		// Removing the boxes changes the antialiased edge of the paper stack.
		const paperBuffer = Math.max(1, this.leavesBuffer);
		// React mounts a handoff margin (three leaves for buffer zero, two
		// otherwise), plus one retiring leaf. Its window centers on the last
		// turned face, one leaf behind this first unturned leaf. Retain that
		// bounded window so completing a turn cannot discard mounted text layout.
		const contentBuffer = this.leavesBuffer + (this.leavesBuffer === 0 ? 3 : 2) + 2;
		const bufferStart = Math.max(0, currentLeafIndex - paperBuffer);
		const bufferEnd = Math.min(leavesCount - 1, currentLeafIndex + paperBuffer);

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
		// Buffering keeps React content mounted, but opaque paper occludes most
		// of it. Render only the current spread, its immediate underlays, and
		// every in-flight leaf's neighbors. Keep the paper boxes/boards intact.
		const exposedContent = new Set<number>();
		const expose = (index: number) => {
			for (let offset = -2; offset <= 2; offset++) exposedContent.add(index + offset);
		};
		for (const index of this.prevVisiblePageIndices ?? [0, 1]) expose(index);
		const requiredContent = new Set(this.prevVisiblePageIndices ?? [0, 1]);
		const nextVisibilityLeaves = this.keepPageContentLayout ? new Set<number>() : undefined;
		for (const leaf of this.leaves) {
			if (this.activeFlips.has(leaf.index) || leaf.isFlipping) {
				nextVisibilityLeaves?.add(leaf.index);
				expose(leaf.index * 2);
				expose(leaf.index * 2 + 1);
				// Both moving faces and their immediate underlays must be ready
				// before the input handler returns, including overlapping turns.
				for (let offset = -1; offset <= 2; offset++) {
					requiredContent.add(leaf.index * 2 + offset);
				}
			}
		}
		if (this.hoveredLeaf) {
			for (let offset = -1; offset <= 2; offset++) {
				requiredContent.add(this.hoveredLeaf.index * 2 + offset);
			}
		}
		let leavesToUpdate: Iterable<number> = this.leaves.keys();
		if (nextVisibilityLeaves) {
			const include = (index: number) => {
				if (Number.isInteger(index) && index >= 0 && index < leavesCount)
					nextVisibilityLeaves.add(index);
			};
			for (const index of coverLeafIndices) include(index);
			const radius = Math.max(paperBuffer, contentBuffer);
			for (
				let index = Math.max(0, Math.ceil(currentLeafIndex - radius));
				index <= Math.min(leavesCount - 1, currentLeafIndex + radius);
				index++
			)
				include(index);
			for (const page of exposedContent) include(Math.floor(page / 2));
			for (const page of requiredContent) include(Math.floor(page / 2));
			if (this.previousVisibilityLeaves) {
				// Distant pages remain hidden after the initial pass. Revisit the
				// previous window to retire it, the new window to expose it, and
				// any slots the consumer explicitly replaced. Preserve preparation
				// order without reading styles on every page in a large book.
				const changed = new Set([...this.previousVisibilityLeaves, ...nextVisibilityLeaves]);
				for (const index of refreshedLeaves ?? []) {
					if (Number.isInteger(index) && index >= 0 && index < leavesCount) changed.add(index);
				}
				leavesToUpdate = [...changed].sort((left, right) => left - right);
			}
		}
		this.pendingContentPreparation.clear();
		const canPrepareLater =
			this.bufferContentInitialized &&
			typeof requestAnimationFrame === "function" &&
			typeof cancelAnimationFrame === "function";

		for (const i of leavesToUpdate) {
			const leaf = this.leaves[i];
			const isWithinBuffer = i >= bufferStart && i <= bufferEnd;
			const isCoverLeaf = coverLeafIndices.has(i);
			// A leaf whose flip is in flight must stay visible even outside the
			// buffer window — during rapid consecutive flips the window can move
			// past leaves that are still mid-animation, and hiding them makes the
			// turning page vanish and reappear (the flicker of issue #167).
			const isFlipping = this.activeFlips.has(i) || leaf.isFlipping;

			// A backward fold can expose the preceding leaf beyond the paper buffer.
			// Its pane is already required below; restore the opaque paper as well so
			// an unmasked text pane cannot remain inside a transparent ancestor.
			const isRequiredPaper =
				this.keepPageContentLayout &&
				(requiredContent.has(i * 2) || requiredContent.has(i * 2 + 1));
			const visible = isCoverLeaf || isWithinBuffer || isFlipping || isRequiredPaper;
			const retainLayout =
				this.keepPageContentLayout &&
				(isCoverLeaf || isFlipping || Math.abs(i - currentLeafIndex) <= contentBuffer);

			// Update both pages of the leaf
			for (const page of leaf.pages) {
				if (page) {
					const display = visible || retainLayout ? "" : "none";
					if (page.style.display !== display) page.style.display = display;
					// Skip descendant work even if consumer CSS overrides display.
					// content-visibility retains the paper box; display:none removes it.
					const visibility = visible || retainLayout ? "visible" : "hidden";
					if (page.style.contentVisibility !== visibility)
						page.style.contentVisibility = visibility;
					if (this.keepPageContentLayout) this.maskContent(page, retainLayout && !visible);
					const scrollport = page.firstElementChild as HTMLElement | null;
					if (scrollport?.classList.contains("flipbook-page-scrollport")) {
						const pageIndex = Number(page.dataset.pageIndex);
						const firstFace = Math.floor(pageIndex / 2) * 2;
						const contentRequired =
							this.leavesBuffer !== 0 ||
							requiredContent.has(firstFace) ||
							requiredContent.has(firstFace + 1);
						const contentVisibility =
							isCoverLeaf || (exposedContent.has(pageIndex) && contentRequired)
								? "visible"
								: "hidden";
						if (this.keepPageContentLayout) {
							this.maskContent(scrollport, retainLayout && contentVisibility === "hidden");
							const content = scrollport.firstElementChild;
							const hasContent = content?.classList.contains("flipbook-page-content")
								? content.hasChildNodes()
								: scrollport.hasChildNodes();
							const keepLayout = retainLayout && hasContent;
							if (!keepLayout && contentVisibility === "hidden") {
								if (scrollport.style.contentVisibility !== "hidden")
									scrollport.style.contentVisibility = "hidden";
								this.preparedContent.delete(scrollport);
							} else if (
								this.preparedContent.has(scrollport) ||
								!canPrepareLater ||
								isCoverLeaf ||
								requiredContent.has(pageIndex)
							) {
								if (scrollport.style.contentVisibility !== "visible")
									scrollport.style.contentVisibility = "visible";
								if (hasContent) this.preparedContent.add(scrollport);
							} else {
								if (scrollport.style.contentVisibility !== "hidden")
									scrollport.style.contentVisibility = "hidden";
								this.pendingContentPreparation.add(scrollport);
							}
							continue;
						}
						if (scrollport.style.contentVisibility !== contentVisibility) {
							if (
								canPrepareLater &&
								contentVisibility === "visible" &&
								visible &&
								!isCoverLeaf &&
								!requiredContent.has(Number(page.dataset.pageIndex))
							) {
								this.pendingContentPreparation.add(scrollport);
							} else {
								scrollport.style.contentVisibility = contentVisibility;
							}
						}
					}
				}
			}
		}
		this.previousVisibilityLeaves = nextVisibilityLeaves;
		this.bufferContentInitialized = true;
		this.scheduleContentPreparation();
	}

	/** Notify the engine after replacing or materializing the content of page slots. */
	refreshPageContent(pageIndices: readonly number[]): void {
		if (!this.keepPageContentLayout || !this.bookElement || pageIndices.length === 0) return;
		const refreshedLeaves = new Set<number>();
		for (const index of pageIndices) {
			const page = this.pageElements[index];
			if (!page) continue;
			refreshedLeaves.add(Math.floor(index / 2));
			const scrollport = page.firstElementChild as HTMLElement | null;
			if (scrollport?.classList.contains("flipbook-page-scrollport")) {
				this.preparedContent.delete(scrollport);
				if (scrollport.style.contentVisibility !== "hidden")
					scrollport.style.contentVisibility = "hidden";
			}
		}
		this.updateLeavesBufferVisibility(refreshedLeaves);
	}

	/** Run once covered layout settles or is cancelled; returns a listener cleanup. */
	onPageContentPrepared(ready: () => void): () => void {
		if (this.pendingContentPreparation.size === 0 && this.contentPreparationHolds.size === 0) {
			ready();
			return () => undefined;
		}
		this.contentPreparationListeners.add(ready);
		return () => {
			this.contentPreparationListeners.delete(ready);
		};
	}

	/** Hold covered layout for a ready adapter update; release after committing its DOM. */
	holdPreparedPageContent(): (() => void) | undefined {
		if (this.pendingContentPreparation.size > 0 || this.contentPreparationHolds.size > 0)
			return undefined;
		const hold = Symbol();
		this.contentPreparationHolds.add(hold);
		return () => {
			if (this.contentPreparationHolds.delete(hold) && this.contentPreparationHolds.size === 0)
				this.scheduleContentPreparation();
		};
	}

	private finishContentPreparation(): void {
		const listeners = Array.from(this.contentPreparationListeners);
		this.contentPreparationListeners.clear();
		for (const ready of listeners) ready();
	}

	private maskContent(element: HTMLElement, hidden: boolean): void {
		const previous = this.contentMasks.get(element);
		if (hidden) {
			if (!previous) {
				this.contentMasks.set(element, {
					opacity: element.style.opacity,
					priority: element.style.getPropertyPriority("opacity"),
					inert: element.getAttribute("inert"),
					ariaHidden: element.getAttribute("aria-hidden"),
				});
			}
			// Opacity preserves layout without propagating a visibility change to
			// every word. Keep the dormant content out of focus and accessibility.
			if (
				element.style.opacity !== "0" ||
				element.style.getPropertyPriority("opacity") !== "important"
			)
				element.style.setProperty("opacity", "0", "important");
			if (!element.classList.contains("flipbook-layout-dormant"))
				element.classList.add("flipbook-layout-dormant");
			if (!element.hasAttribute("inert")) element.setAttribute("inert", "");
			if (element.getAttribute("aria-hidden") !== "true")
				element.setAttribute("aria-hidden", "true");
		} else if (previous) {
			element.style.setProperty("opacity", previous.opacity, previous.priority);
			element.classList.remove("flipbook-layout-dormant");
			if (previous.inert === null) element.removeAttribute("inert");
			else element.setAttribute("inert", previous.inert);
			if (previous.ariaHidden === null) element.removeAttribute("aria-hidden");
			else element.setAttribute("aria-hidden", previous.ariaHidden);
			this.contentMasks.delete(element);
		}
	}

	private restoreContentMasks(): void {
		for (const element of this.contentMasks.keys()) this.maskContent(element, false);
	}

	private prioritizePreparationInput = (event: PointerEvent): void => {
		if (event.isPrimary === false || event.button !== 0) return;
		this.preparationPointerHeld = true;
		this.deferPreparationForInput();
	};

	private releasePreparationInput = (event: Event): void => {
		if ((event as PointerEvent).isPrimary === false) return;
		this.preparationPointerHeld = false;
		this.scheduleContentPreparation();
	};

	private deferPreparationForInput = (): void => {
		this.cancelHoverUpdates();
		if (this.pendingContentPreparation.size === 0) return;
		this.contentPreparationGeneration++;
		if (this.contentPreparationFrame !== undefined) {
			cancelAnimationFrame(this.contentPreparationFrame);
			this.contentPreparationFrame = undefined;
		}
		this.scheduleContentPreparation();
	};

	private unwatchPreparationInput(): void {
		this.preparationDocument?.removeEventListener(
			"pointerdown",
			this.prioritizePreparationInput,
			true,
		);
		this.preparationDocument?.removeEventListener("keydown", this.deferPreparationForInput, true);
		this.preparationDocument?.removeEventListener("pointerup", this.releasePreparationInput, true);
		this.preparationDocument?.removeEventListener(
			"pointercancel",
			this.releasePreparationInput,
			true,
		);
		this.preparationDocument?.defaultView?.removeEventListener(
			"blur",
			this.releasePreparationInput,
		);
		this.preparationDocument = undefined;
		this.preparationPointerHeld = false;
	}

	private cancelContentPreparation(): void {
		this.contentPreparationGeneration++;
		if (this.contentPreparationFrame !== undefined) {
			cancelAnimationFrame(this.contentPreparationFrame);
			this.contentPreparationFrame = undefined;
		}
		this.pendingContentPreparation.clear();
		this.finishContentPreparation();
	}

	private scheduleContentPreparation(): void {
		if (this.contentPreparationHolds.size > 0) return;
		if (this.pendingContentPreparation.size === 0) {
			this.cancelContentPreparation();
			return;
		}
		// Required faces are already ready. Optional layout must not compete
		// with programmatic or release animations after the pointer is lifted.
		if (
			this.preparationPointerHeld ||
			this.activeFlips.size > 0 ||
			this.contentPreparationFrame !== undefined
		)
			return;
		const generation = this.contentPreparationGeneration;
		const prepare = () => {
			if (generation !== this.contentPreparationGeneration) return;
			this.contentPreparationFrame = undefined;
			if (
				this.preparationPointerHeld ||
				this.activeFlips.size > 0 ||
				this.contentPreparationHolds.size > 0
			)
				return;
			const content = this.pendingContentPreparation.values().next().value;
			if (content) {
				this.pendingContentPreparation.delete(content);
				if (content.isConnected) {
					content.style.contentVisibility = "visible";
					if (this.keepPageContentLayout) this.preparedContent.add(content);
				}
			}
			if (this.pendingContentPreparation.size > 0) {
				this.contentPreparationFrame = requestAnimationFrame(prepare);
			} else {
				this.finishContentPreparation();
			}
		};
		// Let the critical paper pose paint before laying out a covered neighbor.
		// Each later frame prepares one page, rather than invalidating several
		// complete scripture trees in the first drag or consecutive-turn frame.
		this.contentPreparationFrame = requestAnimationFrame(() => {
			if (generation !== this.contentPreparationGeneration) return;
			this.contentPreparationFrame = requestAnimationFrame(prepare);
		});
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
		this.cancelHoverUpdates();
		if (fromBookmark) this.gestureStartedInNoFlipZone = false;
		const isTouch = event.pointerType === "touch" || event.srcEvent?.type.startsWith("touch");
		if (isTouch && this.touchDirectionLock === "none") {
			const dx = Number.isFinite(event.deltaX) ? Math.abs(event.deltaX) : 0;
			const dy = Number.isFinite(event.deltaY) ? Math.abs(event.deltaY) : 0;
			if (Math.max(dx, dy) > FlipBook.DIRECTION_LOCK_THRESHOLD) {
				this.touchDirectionLock = dx >= dy ? "horizontal" : "vertical";
			}
		}
		// Reject pan events that belong to a touch gesture locked to the
		// non-flip axis (i.e. the user is scrolling, not flipping).
		const scrollLocked = this.isVertical
			? this.touchDirectionLock === "horizontal"
			: this.touchDirectionLock === "vertical";
		if (scrollLocked && event.pointerType !== "mouse") {
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
		// Vertical turns only start inside the lower-edge affordance; gestures
		// elsewhere preserve native scrolling and content interaction. Press
		// handlers record the zone eagerly; fall back to the pan position for
		// gestures that bypass them (synthetic or bookmark-adjacent input).
		if (this.isVertical && !fromBookmark) {
			if (this.turnZoneGesture === undefined) {
				this.turnZoneGesture = this.isPointInTurnZone(
					Number.isFinite(event.center.y) ? event.center.y : 0,
					event.srcEvent?.target ?? null,
				);
			}
			if (this.turnZoneGesture === false) return;
		}
		// Allow starting a new flip even if others are in auto-flip mode
		// Only block if we already have a manual flip in progress
		if (this.currentManualFlip) {
			this.pendingFlipDirection = FlipDirection.None;
			this.pendingFlipStartingPos = 0;
			this.pendingFlipStartingClientX = undefined;
			this.pendingFlipStartingY = undefined;
			return;
		}
		this.isDragging = true;
		this.pendingFlipStartingPos = this.isVertical
			? event.center.y - (Number.isFinite(event.deltaY) ? event.deltaY : 0)
			: event.center.x - (Number.isFinite(event.deltaX) ? event.deltaX : 0);
		this.pendingFlipStartingClientX = Number.isFinite(event.center.x)
			? event.center.x - (Number.isFinite(event.deltaX) ? event.deltaX : 0)
			: undefined;
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

	private queueManualDragUpdate(event: HammerInput, fromBookmark = false): void {
		const state = this.currentManualFlip;
		if (
			!this.keepPageContentLayout ||
			!state ||
			typeof requestAnimationFrame !== "function" ||
			typeof cancelAnimationFrame !== "function"
		) {
			this.onDragUpdate(event, fromBookmark);
			return;
		}
		// The leading pose stays immediate. Later samples replace work that
		// would otherwise draw several complete folds before the next paint.
		this.pendingManualPose = { event, fromBookmark, state };
		if (this.manualPoseFrame === undefined)
			this.manualPoseFrame = requestAnimationFrame(this.flushPendingManualPose);
	}

	private flushPendingManualPose = (): void => {
		const pending = this.pendingManualPose;
		this.cancelPendingManualPose();
		if (
			pending &&
			this.activeFlips.get(pending.state.leaf.index) === pending.state &&
			!pending.state.isDuringAutoFlip
		) {
			this.onDragUpdate(pending.event, pending.fromBookmark);
		}
	};

	private cancelPendingManualPose(): void {
		if (this.manualPoseFrame !== undefined && typeof cancelAnimationFrame === "function")
			cancelAnimationFrame(this.manualPoseFrame);
		this.manualPoseFrame = undefined;
		this.pendingManualPose = undefined;
	}

	private onDragUpdate(event: HammerInput, fromBookmark = false) {
		if (this.gestureStartedInNoFlipZone) return;
		// Reject pan events that belong to a touch gesture locked to the
		// non-flip axis (scrolling, not flipping).
		const scrollLocked = this.isVertical
			? this.touchDirectionLock === "horizontal"
			: this.touchDirectionLock === "vertical";
		if (scrollLocked && event.pointerType !== "mouse") {
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

		const currentPos = this.isVertical ? event.center.y : event.center.x;
		if (!this.bookElement) return;
		// The established gesture uses the paper's explicit layout dimensions.
		// Reading host geometry after every fold write forces synchronous layout.
		const bookSize = flipState
			? undefined
			: this.isVertical
				? this.bookElement.clientHeight
				: this.bookElement.clientWidth;
		if (bookSize === 0) return;

		// Calculate delta along the flip axis. Vertical forward is an upward
		// drag, matching horizontal LTR's leftward drag — both read as positive.
		const startingPos = flipState?.startingPos ?? this.pendingFlipStartingPos;
		const delta = this.isVertical
			? startingPos - currentPos
			: this.isLTR
				? startingPos - currentPos
				: currentPos - startingPos;
		const perpendicularMove = this.isVertical
			? Number.isFinite(event.center.x) && this.pendingFlipStartingClientX !== undefined
				? event.center.x - this.pendingFlipStartingClientX
				: 0
			: Number.isFinite(event.center.y) && this.pendingFlipStartingY !== undefined
				? event.center.y - this.pendingFlipStartingY
				: 0;
		if (
			!flipState &&
			delta === 0 &&
			(!this.isDragging || perpendicularMove === 0 || event.pointerType === "touch")
		)
			return;

		// Determine direction on first meaningful movement
		const direction =
			flipState?.direction ??
			(this.pendingFlipDirection !== FlipDirection.None
				? this.pendingFlipDirection
				: delta === 0
					? this.isVertical
						? startingPos >= this.getBindingClientY()
							? FlipDirection.Forward
							: FlipDirection.Backward
						: this.isLTR === startingPos >= this.getSpineClientX()
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

			const originY = this.getFoldPointerY(
				leaf,
				direction,
				this.pendingFlipStartingY ?? event.center.y,
			);
			// Read the origin before the snapshot changes scrollbar/selection
			// styles throughout the page; the reverse order forces their layout
			// synchronously inside the first pointer movement.
			leaf.beginFlip();
			// The first manual pose replaces this leaf's hover immediately. Do not
			// redraw its resting pose before geometry/companion preparation reads.
			this.clearHoverShadow(leaf);
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
		if (!this.isVertical && hasDimensions && !rigid && flipState.leaf.pages[1]) {
			const dy =
				Number.isFinite(event.center.y) && flipState.startingY !== undefined
					? event.center.y - flipState.startingY
					: 0;
			flipState.leaf.setManualFold({
				x: (flipState.direction === FlipDirection.Forward ? 1 : -1) - delta / pageWidth,
				y: (flipState.cornerY ?? 1) + dy / pageHeight,
			});
		} else {
			const flipLength = this.isVertical ? pageHeight : pageWidth;
			const travel =
				Number.isFinite(flipLength) && flipLength > 0
					? flipLength * 2
					: (bookSize ?? this.bookElement.clientWidth);
			if (travel <= 0) return;
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

	private getBindingClientY(): number {
		const book = this.bookElement;
		if (!book) return this.bindingY;
		const rect = book.getBoundingClientRect();
		const scale = rect.height > 0 && book.clientHeight > 0 ? rect.height / book.clientHeight : 1;
		return rect.top + this.bindingY * scale;
	}

	private onDragEnd(event: HammerInput, cancelled = false) {
		this.flushPendingManualPose();
		this.gestureStartedInNoFlipZone = undefined;
		this.turnZoneGesture = undefined;
		// Suppress the click that the browser fires after pointerup following a drag.
		this._suppressNextClick = true;

		const flipState = this.currentManualFlip;
		if (!flipState) {
			this.pendingFlipDirection = FlipDirection.None;
			this.pendingFlipStartingPos = 0;
			this.pendingFlipStartingClientX = undefined;
			this.pendingFlipStartingY = undefined;
			this.isDragging = false;
			this.clearHoverShadow();
			return;
		}

		const pps = (this.isVertical ? event.velocityY : event.velocityX) * 1000; // pixels per second
		// Fast-flip velocity toward the flip direction. Vertical forward is an
		// upward drag (negative velocityY), paralleling horizontal LTR's leftward
		// drag (negative velocityX); RTL horizontal mirrors the sign instead.
		const fastForward = this.isVertical
			? pps < -this.fastDeltaThreshold
			: this.isLTR
				? pps < -this.fastDeltaThreshold
				: pps > this.fastDeltaThreshold;
		const fastBackward = this.isVertical
			? pps > this.fastDeltaThreshold
			: this.isLTR
				? pps > this.fastDeltaThreshold
				: pps < -this.fastDeltaThreshold;
		let flipTo: FlipPosition;

		switch (flipState.direction) {
			case FlipDirection.Forward:
				if (!cancelled && (fastForward || flipState.leaf.flipPosition >= 0.5)) {
					flipTo = 1;
				} else {
					flipTo = 0;
				}
				break;
			case FlipDirection.Backward:
				if (!cancelled && (fastBackward || flipState.leaf.flipPosition <= 0.5)) {
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
				this.pendingFlipStartingClientX = undefined;
				this.pendingFlipStartingY = undefined;
				this.isDragging = false;
				this.scheduleContentPreparation();
				return;
		}

		// Mark as auto-flip and reset pending state
		flipState.isDuringAutoFlip = true;
		this.pendingFlipDirection = FlipDirection.None;
		this.pendingFlipStartingPos = 0;
		this.pendingFlipStartingClientX = undefined;
		this.pendingFlipStartingY = undefined;
		this.isDragging = false;

		const targetPageIndex = Math.max(0, 2 * flipState.leaf.index + (flipTo === 1 ? 1 : -1));
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
			this.scheduleContentPreparation();
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
		this.turnZoneGesture = this.isVertical
			? this.isPointInTurnZone(touch.clientY, e.target)
			: undefined;
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

		if (this.isVertical) {
			// Turns only start inside the lower-edge affordance; everywhere else
			// keeps native scrolling. Within the zone a vertical-dominant drag is
			// the turn gesture, so block the browser's scroll takeover.
			if (this.turnZoneGesture === false) return;
			if (this.touchDirectionLock === "vertical") {
				e.preventDefault();
			}
			return;
		}
		if (this.touchDirectionLock === "horizontal") {
			e.preventDefault();
		}
		// 'vertical' or 'none' → let the browser handle native scroll
	};

	private canPreviewHover(event: MouseEvent): boolean {
		return !(
			this.isInsideNoFlipZone(event.target) ||
			this.mouseMode === "select" ||
			event.buttons !== 0 ||
			this.isDragging ||
			this.currentManualFlip ||
			this.activeFlips.size > 0
		);
	}

	private isHoverPointInPage(
		distance: number,
		y: number,
		width: number,
		height: number,
		top: number,
	): boolean {
		if (![distance, y, width, height, top].every(Number.isFinite)) return false;
		return (
			width > 0 &&
			height > 0 &&
			distance >= 0 &&
			distance <= width * EDGE_ZONE_RATIO &&
			y >= top &&
			y <= top + height
		);
	}

	private updateHoverShadow = (event: MouseEvent): void => {
		if (!this.bookElement) return;
		if (!this.canPreviewHover(event)) {
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
		if (this.isVertical) {
			// The turn affordance is the sheet's lower free edge: preview a
			// forward lift while the pointer approaches it from inside.
			const leaf = this.getNextAvailableLeaf(FlipDirection.Forward);
			if (!leaf) {
				this.clearHoverShadow();
				return;
			}
			const page = leaf.pages[0];
			const width = Number.parseFloat(page.style.width);
			const height = Number.parseFloat(page.style.height);
			const top = Number.parseFloat(page.style.top);
			const left = Number.parseFloat(page.style.left);
			const distanceFromEdge = top + height - y;
			const edgeZone = height * EDGE_ZONE_RATIO;
			const inZone =
				Number.isFinite(distanceFromEdge) &&
				distanceFromEdge >= 0 &&
				distanceFromEdge <= edgeZone &&
				x >= left &&
				x <= left + width;
			if (!inZone) {
				this.clearHoverShadow();
				return;
			}
			const edgeProgress = 1 - Math.min(1, distanceFromEdge / edgeZone);
			const hoverStrength = edgeProgress * HOVER_STRENGTH_MAX;
			this.applyHoverPreview(
				leaf,
				hoverStrength,
				width > 0 ? Math.max(0, Math.min(1, (x - left) / width)) : 0.5,
			);
			return;
		}
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
		if (!this.isHoverPointInPage(distanceFromEdge, y, width, height, top)) {
			this.clearHoverShadow();
			return;
		}
		const edgeProgress = 1 - Math.min(1, distanceFromEdge / edgeZone);
		const hoverStrength = edgeProgress * HOVER_STRENGTH_MAX;

		this.applyHoverPreview(leaf, hoverStrength, (y - top) / height);
	};

	private applyHoverPreview(leaf: Leaf, hoverStrength: number, originY: number): void {
		if (this.hoveredLeaf && this.hoveredLeaf !== leaf) {
			this.hoveredLeaf.setHoverShadow(0);
		}
		if (this.hoveredLeaf !== leaf) {
			leaf.setFoldOrigin(originY);
			this.hoveredLeaf = leaf;
			if (this.leavesBuffer === 0) this.updateLeavesBufferVisibility();
		}
		leaf.setHoverShadow(hoverStrength);
	}

	private readonly immediateHover = throttle(MOUSE_MOVE_THROTTLE_MS, this.updateHoverShadow);
	private readonly deferredHover = throttle(MOUSE_MOVE_THROTTLE_MS, this.updateHoverShadow, {
		noLeading: true,
	});
	private handleMouseMove = (event: MouseEvent): void => {
		// Retained readers can cancel a preview when a real press follows it.
		// Keep the same update interval and the original hover geometry.
		if (this.keepPageContentLayout) this.deferredHover(event);
		else this.immediateHover(event);
	};

	private cancelHoverUpdates(): void {
		this.immediateHover.cancel({ upcomingOnly: true });
		this.deferredHover.cancel({ upcomingOnly: true });
	}

	private handleMouseLeave = () => {
		this.cancelHoverUpdates();
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

	private clearHoverShadow(replacedByManualPose?: Leaf) {
		if (this.hoveredLeaf) {
			this.hoveredLeaf.setHoverShadow(0, this.hoveredLeaf !== replacedByManualPose);
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

		const flipState: FlipState = {
			leaf,
			direction: FlipDirection.Forward,
			startingPos: 0,
			delta: 0,
			isDuringAutoFlip: true,
		};
		this.activeFlips.set(leaf.index, flipState);

		try {
			// Capture resting bookmark geometry before revealing page content.
			// The animation nests its own balanced beginFlip/endFlip pair.
			leaf.beginFlip();
			this.clearHoverShadow();
			this.updateLeavesBufferVisibility();
			const targetPageIndex = Math.min(this.pagesCount - 1, leaf.index * 2 + 1);
			this.lastFlipParams = this.buildPageFlipParams(targetPageIndex, "forward");
			if (this.onPageFlipping) this.onPageFlipping(this.lastFlipParams);
			await leaf.flipToPosition(1);
		} finally {
			this.activeFlips.delete(leaf.index);
			leaf.endFlip();
			this.scheduleContentPreparation();
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

		const flipState: FlipState = {
			leaf,
			direction: FlipDirection.Backward,
			startingPos: 0,
			delta: 0,
			isDuringAutoFlip: true,
		};
		this.activeFlips.set(leaf.index, flipState);

		try {
			leaf.beginFlip();
			this.clearHoverShadow();
			this.updateLeavesBufferVisibility();
			const targetPageIndex = leaf.index * 2 - 1;
			this.lastFlipParams = this.buildPageFlipParams(Math.max(0, targetPageIndex), "backward");
			if (this.onPageFlipping) this.onPageFlipping(this.lastFlipParams);
			await leaf.flipToPosition(0);
		} finally {
			this.activeFlips.delete(leaf.index);
			leaf.endFlip();
			this.scheduleContentPreparation();
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
		this.cancelHoverUpdates();
		this.cancelPendingManualPose();
		this.contentPreparationHolds.clear();
		this.cancelContentPreparation();
		this.unwatchPreparationInput();
		this.restoreContentMasks();
		this.preparedContent = new WeakSet();
		this.bufferContentInitialized = false;
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
		for (const leaf of this.leaves) {
			leaf.onBeforeFlip = undefined;
			leaf.onAfterFlip = undefined;
			leaf.onTransform = undefined;
		}
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
			this.bookElement.classList.remove("flipbook--preserve-selection");
			for (const page of this.pageElements) {
				page.removeEventListener("pointerdown", this.handlePageMouseDown);
				page.removeEventListener("mousedown", this.handlePageMouseDown);
				page.removeEventListener("dragstart", this.handlePageDragStart, true);
				page.removeEventListener("selectstart", this.handlePageSelectStart, true);
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
