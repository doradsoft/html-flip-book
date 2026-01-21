import "./pages.scss";
import "./flipbook.scss";
import Hammer from "hammerjs";
import type { AspectRatio } from "./aspect-ratio";
import type { FlipBookOptions } from "./flip-book-options";
import { FlipDirection } from "./flip-direction";
import { type FlipPosition, Leaf } from "./leaf";
import type { PageSemantics } from "./page-semantics";
import { Size } from "./size";

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
		this.prevVisiblePageIndices =
			firstVisiblePageIndex + 1 < this.pagesCount
				? [firstVisiblePageIndex, firstVisiblePageIndex + 1]
				: [firstVisiblePageIndex];

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
		if (debug) this.fillDebugBar();
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
		// TODO expose to outside using https://github.com/open-draft/strict-event-emitter, and just be a consumer internally.
		// TODO: set prev-page / next-page classes for prev/next pages as accordingally
	}
	jumpToPage(pageIndex: number) {
		// TODO: drop as probably totally replaced ith onTurned. maybe change onTurned name to onPageChanged.
		if (this.onPageChanged) {
			this.onPageChanged(pageIndex);
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
