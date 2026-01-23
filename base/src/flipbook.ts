import "./pages.scss";
import "./flipbook.scss";
import Hammer from "hammerjs";
import type { AspectRatio } from "./aspect-ratio";
import type { FlipBookOptions } from "./flip-book-options";
import { FlipDirection } from "./flip-direction";
import { type FlipPosition, Leaf } from "./leaf";
import type { PageSemantics } from "./page-semantics";
import { Size } from "./size";

/** Default threshold for fast flip detection (in ms) */
const DEFAULT_FAST_DELTA = 500;

/** State for a single flip operation - enables concurrent page flipping */
interface FlipState {
	leaf: Leaf;
	direction: FlipDirection;
	startingPos: number;
	delta: number;
	isDuringAutoFlip: boolean;
}
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
	private readonly pageSemantics: PageSemantics | undefined;
	private readonly leavesBuffer?: number;
	private leaves: Leaf[] = [];
	// flipping state - supports concurrent page flipping
	private activeFlips: Map<number, FlipState> = new Map();
	private pendingFlipStartingPos = 0;
	private pendingFlipDirection: FlipDirection = FlipDirection.None;
	touchStartingPos = { x: 0, y: 0 };
	private prevVisiblePageIndices: [number] | [number, number] | undefined;
	// Hammer instance for cleanup
	private hammer: HammerManager | undefined;
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
		this.leavesBuffer = options.leavesBuffer;
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

		const pageElements = bookElement.querySelectorAll(".page");
		if (!pageElements.length) {
			throw new Error("No pages found in flipbook");
		}
		this.pageElements = Array.from(pageElements) as HTMLElement[];
		this.leaves.splice(0, this.leaves.length);
		const leavesCount = Math.ceil(this.pagesCount / 2);
		const maxCoverSize = new Size(this.bookElement.clientWidth / 2, this.bookElement.clientHeight);
		const coverSize = maxCoverSize.aspectRatioFit(this.coverAspectRatio);
		const leafSize = new Size(
			(coverSize.width * this.leafAspectRatio.width) / this.coverAspectRatio.width,
			(coverSize.height * this.leafAspectRatio.height) / this.coverAspectRatio.height,
		);
		this.bookElement.style.perspective = `${Math.min(leafSize.width * 2, leafSize.height) * 2}px`;
		this.pageElements.forEach((pageElement, pageIndex) => {
			pageElement.style.width = `${leafSize.width}px`;
			pageElement.style.height = `${leafSize.height}px`;

			pageElement.style.zIndex = `${this.pagesCount - pageIndex}`;
			pageElement.dataset.pageIndex = pageIndex.toString();
			pageElement.style[this.isLTR ? "left" : "right"] =
				`${(bookElement.clientWidth - 2 * leafSize.width) / 2}px`;
			pageElement.style.top = `${(bookElement.clientHeight - leafSize.height) / 2}px`;
			pageElement.dataset.pageSemanticName =
				this.pageSemantics?.indexToSemanticName(pageIndex) ?? "";
			pageElement.dataset.pageTitle = this.pageSemantics?.indexToTitle(pageIndex) ?? "";

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
		// Apply initial leaves buffer visibility
		this.updateLeavesBufferVisibility();
		if (debug) this.fillDebugBar();
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

		// Update visibility of all leaves
		for (let i = 0; i < leavesCount; i++) {
			const leaf = this.leaves[i];
			const isWithinBuffer = i >= bufferStart && i <= bufferEnd;

			// Update both pages of the leaf
			for (const page of leaf.pages) {
				if (page) {
					page.style.display = isWithinBuffer ? "" : "none";
				}
			}
		}
	}

	private fillDebugBar() {
		const debugBar = document.createElement("div");
		debugBar.className = "flipbook-debug-bar";
		this.bookElement?.appendChild(debugBar);
		setInterval(() => {
			// Populate debug bar with relevant information
			const activeFlipsInfo = Array.from(this.activeFlips.entries())
				.map(([idx, state]) => `${idx}:${state.leaf.flipPosition.toFixed(2)}`)
				.join(", ");
			debugBar.innerHTML = `
          <div>Direction: ${this.isLTR ? "LTR" : "RTL"}</div>
          <div>Active Flips: ${this.activeFlips.size} [${activeFlipsInfo}]</div>
          <div>Pending Flip dir: ${this.pendingFlipDirection}</div>
        `;
		}, 10);
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
		// Allow starting a new flip even if others are in auto-flip mode
		// Only block if we already have a manual flip in progress
		if (this.currentManualFlip) {
			this.pendingFlipDirection = FlipDirection.None;
			this.pendingFlipStartingPos = 0;
			return;
		}
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
		const flipState = this.currentManualFlip;
		if (!flipState) {
			this.pendingFlipDirection = FlipDirection.None;
			this.pendingFlipStartingPos = 0;
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
	};

	private handleTouchMove = (e: TouchEvent) => {
		if (e.touches.length > 1) {
			return;
		}
		const touch = e.touches[0];
		const deltaX = touch.pageX - this.touchStartingPos.x;
		const deltaY = touch.pageY - this.touchStartingPos.y;
		// only allow vertical scrolling, as if allowing horizontal scrolling, it will interfere with the flip gesture (for touch devices)
		// TODO: allow horizontal scrolling if the user is not trying to flip, say if is scrolling an overflowed element
		if (Math.abs(deltaX) > Math.abs(deltaY)) {
			e.preventDefault();
		}
	};
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
	 * Animate flip to the next page.
	 * @returns Promise that resolves when the flip animation completes
	 */
	async flipNext(): Promise<void> {
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
	async goToPage(pageIndex: number): Promise<void> {
		if (pageIndex < 0 || pageIndex >= this.pagesCount) {
			console.warn(
				`goToPage: Invalid page index ${pageIndex}. Must be between 0 and ${this.pagesCount - 1}.`,
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

		const targetLeafIndex = Math.floor(pageIndex / 2);
		const isLastPage = pageIndex === this.pagesCount - 1;
		const isOddPage = pageIndex % 2 === 1;
		// If targeting the last page and it's odd (back of leaf), close the book reversed
		const closeBookReversed = isLastPage && isOddPage;

		// Set all leaves before target as turned, all after as not turned
		for (let i = 0; i < this.leaves.length; i++) {
			const leaf = this.leaves[i];
			// Turn leaves before target, or the target leaf itself if closing book reversed
			const shouldBeTurned = i < targetLeafIndex || (closeBookReversed && i === targetLeafIndex);

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
		} else {
			const firstVisiblePageIndex = targetLeafIndex * 2;
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

		// Notify callback
		if (this.onPageChanged) {
			this.onPageChanged(this.currentPageIndex);
		}
	}

	/**
	 * Apply transform styles to a leaf's pages for a given flip position.
	 * Used for instant positioning (jumpToPage).
	 */
	private applyLeafTransform(leaf: Leaf, position: number): void {
		const isLTR = this.isLTR;

		for (let index = 0; index < leaf.pages.length; index++) {
			const page = leaf.pages[index];
			if (!page) continue;

			const isOdd = (index % 2) + 1 === 1;
			const degrees = isOdd
				? isLTR
					? position > 0.5
						? 180 - position * 180
						: -position * 180
					: position > 0.5
						? -(180 - position * 180)
						: position * 180
				: isLTR
					? position < 0.5
						? -position * 180
						: 180 - position * 180
					: position < 0.5
						? position * 180
						: -(180 - position * 180);

			const rotateY = `${degrees}deg`;
			const translateX = `${isOdd ? (isLTR ? "100%" : "-100%") : isLTR ? "0px" : "0px"}`;
			const scaleX = isOdd ? (position > 0.5 ? -1 : 1) : position < 0.5 ? -1 : 1;

			page.style.transform = `translateX(${translateX})rotateY(${rotateY})scaleX(${scaleX})`;
			page.style.transformOrigin = isOdd
				? `${isLTR ? "left" : "right"}`
				: `${isLTR ? "right" : "left"}`;
			page.style.zIndex = `${
				position > 0.5
					? page.dataset.pageIndex
					: this.pagesCount - (page.dataset.pageIndex as unknown as number)
			}`;
		}
	}

	/**
	 * Clean up event listeners and Hammer instance.
	 * Should be called when the FlipBook is no longer needed.
	 */
	destroy() {
		if (this.hammer) {
			this.hammer.destroy();
			this.hammer = undefined;
		}
		if (this.bookElement) {
			this.bookElement.removeEventListener("touchstart", this.handleTouchStart as EventListener);
			this.bookElement.removeEventListener("touchmove", this.handleTouchMove as EventListener);
		}
	}
}

export { FlipBook, type PageSemantics };
