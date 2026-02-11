import "./pages.scss";
import "./flipbook.scss";
import Hammer from "hammerjs";
import { throttle } from "throttle-debounce";
import type { AspectRatio } from "./aspect-ratio";
import type { DownloadConfig } from "./download/types";
import type {
	FlipBookOptions,
	FlipPageSemantic,
	HistoryMapper,
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

/** Percentage of book width that triggers hover shadow effect */
const EDGE_ZONE_RATIO = 0.18;
/** Maximum hover shadow strength (0-1) */
const HOVER_STRENGTH_MAX = 0.12;
/** Throttle interval for mouse move handler in ms */
const MOUSE_MOVE_THROTTLE_MS = 16;

/** State for a single flip operation - enables concurrent page flipping */
interface FlipState {
	leaf: Leaf;
	direction: FlipDirection;
	startingPos: number;
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
	private readonly fastDeltaThreshold: number = DEFAULT_FAST_DELTA;
	private readonly initialTurnedLeaves: Set<number> = new Set();
	private readonly onPageChanged?: (pageIndex: number) => void;
	private readonly onPageFlipping?: (params: PageFlipParams) => void;
	private readonly onPageFlipped?: (params: PageFlipParams) => void;
	private readonly historyMapper?: HistoryMapper;
	private lastFlipParams: PageFlipParams | undefined;
	private _historyInitialized = false;
	private _isRestoringFromHistory = false;
	private _boundPopstate: (() => void) | undefined;
	private readonly pageSemantics: PageSemantics | undefined;
	private readonly leavesBuffer?: number;
	private readonly coverPageIndices?: number[] | "auto";
	private readonly downloadConfig: DownloadConfig | undefined;
	private readonly pageShadow: boolean;
	private leaves: Leaf[] = [];
	// flipping state - supports concurrent page flipping
	private activeFlips: Map<number, FlipState> = new Map();
	private pendingFlipStartingPos = 0;
	private pendingFlipDirection: FlipDirection = FlipDirection.None;
	private isDragging = false;
	/** Set after a drag ends; the next click event is suppressed so child buttons/links don't fire. */
	private _suppressNextClick = false;
	private hoveredLeaf: Leaf | undefined;
	touchStartingPos = { x: 0, y: 0 };
	/** True when the current touch started inside a [data-flipbook-no-flip] element (e.g. carousel). */
	private touchStartedInNoFlipZone = false;
	private prevVisiblePageIndices: [number] | [number, number] | undefined;
	// Hammer instance for cleanup
	private hammer: HammerManager | undefined;
	// Resize observer for re-layout on container size changes
	private resizeObserver: ResizeObserver | undefined;

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
		const pageIndex = this.currentPageIndex;
		const semantic = this.getSemanticForPage(pageIndex);
		if (this.onPageChanged) this.onPageChanged(pageIndex);
		const params = this.lastFlipParams ?? this.buildPageFlipParams(pageIndex, "forward");
		if (this.onPageFlipped) this.onPageFlipped(params);
		if (typeof window !== "undefined" && this.historyMapper && !this._isRestoringFromHistory) {
			const route = this.historyMapper.pageToRoute(pageIndex, semantic);
			const state = { route };
			const url = route.startsWith("#")
				? `${window.location.pathname}${window.location.search}${route}`
				: route;
			if (isInitial || !this._historyInitialized) {
				window.history.replaceState(state, "", url);
				this._historyInitialized = true;
			} else {
				window.history.pushState(state, "", url);
			}
		}
	}

	private handlePopstate = (): void => {
		if (!this.historyMapper || typeof window === "undefined") return;
		const route =
			(typeof window.history.state === "object" && window.history.state?.route) ||
			window.location.pathname + window.location.search + window.location.hash;
		const pageIndex = this.historyMapper.routeToPage(route);
		if (pageIndex !== null && pageIndex >= 0 && pageIndex < this.pagesCount) {
			this._isRestoringFromHistory = true;
			try {
				this.jumpToPage(pageIndex);
			} finally {
				this._isRestoringFromHistory = false;
			}
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
		this.fastDeltaThreshold = options.fastDeltaThreshold ?? this.fastDeltaThreshold;
		this.initialTurnedLeaves = new Set(options.initialTurnedLeaves ?? []);
		this.pageSemantics = options.pageSemantics;
		this.onPageChanged = options.onPageChanged;
		this.onPageFlipping = options.onPageFlipping;
		this.onPageFlipped = options.onPageFlipped;
		this.historyMapper = options.enableHistory !== false ? options.historyMapper : undefined;
		this.leavesBuffer = options.leavesBuffer;
		this.coverPageIndices = options.coverPageIndices;
		this.downloadConfig = options.enableDownload !== false ? options.downloadConfig : undefined;
		this.pageShadow = options.pageShadow ?? true;
		setTocPageIndex(options.tocPageIndex ?? 4);
	}

	/** Download config (handlers and filename hints). Used by toolbar. */
	getDownloadConfig(): DownloadConfig | undefined {
		return this.downloadConfig;
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

		const maxCoverSize = new Size(this.bookElement.clientWidth / 2, this.bookElement.clientHeight);
		const coverSize = maxCoverSize.aspectRatioFit(this.coverAspectRatio);
		const leafSize = new Size(
			(coverSize.width * this.leafAspectRatio.width) / this.coverAspectRatio.width,
			(coverSize.height * this.leafAspectRatio.height) / this.coverAspectRatio.height,
		);
		this.bookElement.style.perspective = `${Math.min(leafSize.width * 2, leafSize.height) * 2}px`;

		const containerWidth = this.bookElement.clientWidth;
		const containerHeight = this.bookElement.clientHeight;

		for (const pageElement of this.pageElements) {
			const isCoverPage = pageElement.dataset.isCoverPage === "1";
			const pageSize = isCoverPage ? coverSize : leafSize;

			pageElement.style.width = `${pageSize.width}px`;
			pageElement.style.height = `${pageSize.height}px`;
			pageElement.style[this.isLTR ? "left" : "right"] =
				`${(containerWidth - 2 * pageSize.width) / 2}px`;
			pageElement.style.top = `${(containerHeight - pageSize.height) / 2}px`;
		}
	}

	render(selector: string, debug = false) {
		const bookElement = document.querySelector(selector);
		if (!bookElement) {
			throw new Error(`Couldn't find container with selector: ${selector}`);
		}
		this.bookElement = bookElement as HTMLElement;
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
		this.leaves.splice(0, this.leaves.length);
		const leavesCount = Math.ceil(this.pagesCount / 2);

		// Compute and apply sizes (also called on resize)
		this.recalculateSizes();

		// Determine which specific pages are cover exteriors (use coverSize).
		// Interior sides of cover leaves use leafSize — physically, the endpaper is
		// glued to the inside of the board and matches the text-block page size.
		const coverPageIndicesSet = this.buildCoverPageIndicesSet();

		this.pageElements.forEach((pageElement, pageIndex) => {
			const leafIndex = Math.floor(pageIndex / 2);

			pageElement.dataset.pageIndex = pageIndex.toString();
			pageElement.dataset.pageSemanticName =
				this.pageSemantics?.indexToSemanticName(pageIndex) ?? "";
			pageElement.dataset.pageTitle = this.pageSemantics?.indexToTitle(pageIndex) ?? "";
			pageElement.dataset.isCoverPage = coverPageIndicesSet.has(pageIndex) ? "1" : "";

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
				// Apply correct initial transform based on turned state
				if (isInitiallyTurned) {
					// Fully turned: rotateY(180) or similar based on direction
					const scaleX = -1;
					const transform = `translateX(${this.isLTR ? "100%" : "-100%"})rotateY(${this.isLTR ? "180deg" : "-180deg"})scaleX(${scaleX})`;
					pageElement.style.transform = transform;
					pageElement.style.transformOrigin = this.isLTR ? "left" : "right";
					pageElement.style.zIndex = `${pageIndex}`; // Turned pages have lower z-index
				} else {
					pageElement.style.transform = `translateX(${this.isLTR ? `` : `-`}100%)`;
					pageElement.style.zIndex = `${this.pagesCount - pageIndex}`;
				}

				this.leaves[leafIndex] = new Leaf(
					leafIndex,
					[pageElement, undefined],
					isInitiallyTurned,
					{
						isLTR: this.isLTR,
						leavesCount: leavesCount,
						pagesCount: this.pagesCount,
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
				// Even page (back side of leaf)
				if (isInitiallyTurned) {
					// Fully turned: apply matching transform for back side
					const scaleX = 1;
					pageElement.style.transform = `translateX(0px)rotateY(${this.isLTR ? "180deg" : "-180deg"})scaleX(${scaleX})`;
					pageElement.style.transformOrigin = this.isLTR ? "right" : "left";
					pageElement.style.zIndex = `${pageIndex}`; // Turned pages have lower z-index
				} else {
					pageElement.style.transform = `scaleX(-1)translateX(${this.isLTR ? `-` : ``}100%)`;
					pageElement.style.zIndex = `${this.pagesCount - pageIndex}`;
				}
				this.leaves[leafIndex].pages[1] = pageElement;
			}
		});

		// Set initial visible page indices based on initially turned leaves
		const firstVisibleLeafIndex =
			this.initialTurnedLeaves.size > 0 ? Math.max(...this.initialTurnedLeaves) + 1 : 0;
		const firstVisiblePageIndex = firstVisibleLeafIndex * 2;

		// Handle edge case where all leaves are turned (showing last page only)
		if (firstVisiblePageIndex >= this.pagesCount) {
			// All leaves are turned - show the last page(s)
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

		// Observe container size changes and re-layout automatically.
		if (typeof ResizeObserver !== "undefined") {
			this.resizeObserver = new ResizeObserver(() => {
				this.recalculateSizes();
			});
			this.resizeObserver.observe(this.bookElement);
		}

		this.hammer = new Hammer(this.bookElement);
		this.hammer.on("panstart", this.onDragStart.bind(this));
		this.hammer.on("panmove", this.onDragUpdate.bind(this));
		this.hammer.on("panend", this.onDragEnd.bind(this));
		this.bookElement.addEventListener("touchstart", this.handleTouchStart.bind(this), {
			passive: false,
		});
		this.bookElement.addEventListener("touchmove", this.handleTouchMove.bind(this), {
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

		// History: initial replaceState and popstate listener
		if (typeof window !== "undefined" && this.historyMapper) {
			this.syncHistoryAndNotifyFlipped(true);
			this._boundPopstate = this.handlePopstate.bind(this);
			window.addEventListener("popstate", this._boundPopstate);
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

			// Cover leaves are always visible; other leaves follow the buffer range.
			const visible = isCoverLeaf || isWithinBuffer;

			// Update both pages of the leaf
			for (const page of leaf.pages) {
				if (page) {
					page.style.display = visible ? "" : "none";
				}
			}
		}
	}

	private fillDebugBar() {
		const debugBar = document.createElement("div");
		debugBar.className = "flipbook-debug-bar flipbook-debug-bar--hidden";
		this.bookElement?.appendChild(debugBar);
		setInterval(() => {
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

	private onDragStart(event: HammerInput) {
		// Do not start flip when gesture begins inside a no-flip zone (e.g. horizontal carousel)
		if (this.isInsideNoFlipZone(event.srcEvent?.target ?? null)) {
			return;
		}
		// Allow starting a new flip even if others are in auto-flip mode
		// Only block if we already have a manual flip in progress
		if (this.currentManualFlip) {
			this.pendingFlipDirection = FlipDirection.None;
			this.pendingFlipStartingPos = 0;
			return;
		}
		this.isDragging = true;
		this.clearHoverShadow();
		this.pendingFlipStartingPos = event.center.x;
		this.pendingFlipDirection = FlipDirection.None;
	}

	private onDragUpdate(event: HammerInput) {
		// Get or create the current manual flip state
		let flipState = this.currentManualFlip;

		const currentPos = event.center.x;
		const bookWidth = this.bookElement?.clientWidth ?? 0;

		// Calculate delta
		const delta = this.isLTR
			? this.pendingFlipStartingPos - currentPos
			: currentPos - this.pendingFlipStartingPos;

		if (Math.abs(delta) > bookWidth) return;
		if (delta === 0) return;

		// Determine direction on first meaningful movement
		const direction =
			this.pendingFlipDirection !== FlipDirection.None
				? this.pendingFlipDirection
				: delta > 0
					? FlipDirection.Forward
					: FlipDirection.Backward;

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

			flipState = {
				leaf,
				direction,
				startingPos: this.pendingFlipStartingPos,
				delta: 0,
				isDuringAutoFlip: false,
			};
			this.activeFlips.set(leaf.index, flipState);
		}

		// Update delta
		flipState.delta = delta;

		// Calculate and apply flip position
		switch (flipState.direction) {
			case FlipDirection.Forward: {
				const posForward = (delta / bookWidth) as FlipPosition;
				if (posForward > 1 || delta < 0) return;
				flipState.leaf.efficientFlipToPosition(posForward);
				break;
			}
			case FlipDirection.Backward: {
				const posBackward = (1 - Math.abs(delta) / bookWidth) as FlipPosition;
				if (posBackward < 0 || delta > 0) return;
				flipState.leaf.efficientFlipToPosition(posBackward);
				break;
			}
		}
	}

	private onDragEnd(event: HammerInput) {
		// Suppress the click that the browser fires after pointerup following a drag.
		this._suppressNextClick = true;

		const flipState = this.currentManualFlip;
		if (!flipState) {
			this.pendingFlipDirection = FlipDirection.None;
			this.pendingFlipStartingPos = 0;
			this.isDragging = false;
			this.clearHoverShadow();
			return;
		}

		const ppsX = event.velocityX * 1000; // pixels per second
		let flipTo: FlipPosition;

		switch (flipState.direction) {
			case FlipDirection.Forward:
				if (
					(this.isLTR ? ppsX < -this.fastDeltaThreshold : ppsX > this.fastDeltaThreshold) ||
					flipState.leaf.flipPosition >= 0.5
				) {
					flipTo = 1;
				} else {
					flipTo = 0;
				}
				break;
			case FlipDirection.Backward:
				if (
					(this.isLTR ? ppsX > this.fastDeltaThreshold : ppsX < -this.fastDeltaThreshold) ||
					flipState.leaf.flipPosition <= 0.5
				) {
					flipTo = 0;
				} else {
					flipTo = 1;
				}
				break;
			default:
				return;
		}

		// Mark as auto-flip and reset pending state
		flipState.isDuringAutoFlip = true;
		this.pendingFlipDirection = FlipDirection.None;
		this.pendingFlipStartingPos = 0;
		this.isDragging = false;

		const targetPageIndex =
			flipTo === 1 ? 2 * (flipState.leaf.index + 1) : 2 * flipState.leaf.index;
		const direction: PageFlipDirection = flipTo === 1 ? "forward" : "backward";
		this.lastFlipParams = this.buildPageFlipParams(targetPageIndex, direction);
		if (this.onPageFlipping) this.onPageFlipping(this.lastFlipParams);

		// Complete the flip asynchronously - don't block new flips!
		flipState.leaf.flipToPosition(flipTo).then(() => {
			this.activeFlips.delete(flipState.leaf.index);
		});
	}

	private handleTouchStart = (e: TouchEvent) => {
		if (e.touches.length > 1) {
			return;
		}
		const touch = e.touches[0];
		this.touchStartingPos = { x: touch.pageX, y: touch.pageY };
		this.touchStartedInNoFlipZone = this.isInsideNoFlipZone(e.target);
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
		// only allow vertical scrolling, as if allowing horizontal scrolling, it will interfere with the flip gesture (for touch devices)
		if (Math.abs(deltaX) > Math.abs(deltaY)) {
			e.preventDefault();
		}
	};

	private handleMouseMove = throttle(MOUSE_MOVE_THROTTLE_MS, (event: MouseEvent) => {
		if (!this.bookElement) return;
		if (this.isDragging || this.currentManualFlip || this.activeFlips.size > 0) {
			this.clearHoverShadow();
			return;
		}

		const rect = this.bookElement.getBoundingClientRect();
		if (rect.width <= 0) return;

		const x = event.clientX - rect.left;
		const edgeZone = rect.width * EDGE_ZONE_RATIO;
		const isLeftEdge = x <= edgeZone;
		const isRightEdge = x >= rect.width - edgeZone;

		if (!isLeftEdge && !isRightEdge) {
			this.clearHoverShadow();
			return;
		}

		const isForward = this.isLTR ? isRightEdge : isLeftEdge;
		const direction = isForward ? FlipDirection.Forward : FlipDirection.Backward;
		const leaf = this.getNextAvailableLeaf(direction);
		if (!leaf) {
			this.clearHoverShadow();
			return;
		}

		const distanceFromEdge = isForward
			? this.isLTR
				? rect.width - x
				: x
			: this.isLTR
				? x
				: rect.width - x;
		const edgeProgress = 1 - Math.min(1, distanceFromEdge / edgeZone);
		const hoverStrength = edgeProgress * HOVER_STRENGTH_MAX;

		if (this.hoveredLeaf && this.hoveredLeaf !== leaf) {
			this.hoveredLeaf.setHoverShadow(0);
		}
		this.hoveredLeaf = leaf;
		leaf.setHoverShadow(hoverStrength);
	});

	private handleMouseLeave = () => {
		this.clearHoverShadow();
	};

	/**
	 * Capture-phase click handler that suppresses clicks fired by the browser
	 * immediately after a drag gesture ends. Without this, releasing the pointer
	 * on an interactive element (button, link) inside a page would trigger both
	 * the flip animation AND the element's click handler.
	 */
	private handleClickAfterDrag = (e: Event) => {
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

		const flipState: FlipState = {
			leaf,
			direction: FlipDirection.Forward,
			startingPos: 0,
			delta: 0,
			isDuringAutoFlip: true,
		};
		this.activeFlips.set(leaf.index, flipState);
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

		const flipState: FlipState = {
			leaf,
			direction: FlipDirection.Backward,
			startingPos: 0,
			delta: 0,
			isDuringAutoFlip: true,
		};
		this.activeFlips.set(leaf.index, flipState);
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

		const targetLeafIndex = Math.floor(pageIndex / 2);
		const currentLeafIndex = Math.floor(this.currentPageIndex / 2);

		if (targetLeafIndex === currentLeafIndex) {
			return; // Already at the target page
		}

		if (targetLeafIndex > currentLeafIndex) {
			// Flip forward
			for (let i = currentLeafIndex; i < targetLeafIndex; i++) {
				await this.flipNext();
			}
		} else {
			// Flip backward
			for (let i = currentLeafIndex; i > targetLeafIndex; i--) {
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
		if (typeof window !== "undefined" && this._boundPopstate) {
			window.removeEventListener("popstate", this._boundPopstate);
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

export { FlipBook, type PageSemantics };
export type {
	FlipPageSemantic,
	HistoryMapper,
	PageFlipDirection,
	PageFlipParams,
} from "./flip-book-options";
