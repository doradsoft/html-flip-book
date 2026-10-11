import { throttle } from "throttle-debounce";
import type { IntRange } from "type-fest";
import { FlipDirection } from "./flip-direction";
import {
	computePageFold,
	computePageFoldFromPoint,
	easePageTurn,
	type PageFold,
	type Point,
} from "./page-fold";

/** Schedule a frame callback; fallback for test envs where requestAnimationFrame is missing. Called at invoke time so test mocks apply. */
function scheduleFrame(cb: (timestamp: number) => void): number {
	return typeof requestAnimationFrame !== "undefined"
		? requestAnimationFrame(cb)
		: (setTimeout(() => cb(performance.now()), 0) as unknown as number);
}

/** Multiplier for shadow intensity (slightly stronger than base) */
const SHADOW_STRENGTH_MULTIPLIER = 1.1;
/** Multiplier for highlight intensity (slightly weaker than base) */
const HIGHLIGHT_STRENGTH_MULTIPLIER = 0.9;

// number between 1 to infinity
export type DegreesPerSecond = IntRange<1, typeof Infinity>;
export type FlipPosition = IntRange<0, 2>;
export const FLIPPED = true;
export const NOT_FLIPPED = false;
export class Leaf {
	private currentAnimation: Promise<void> | null = null;
	private targetFlipPosition: FlipPosition | null = null;
	private wrappedFlipPosition: number;
	private hoverShadow = 0;
	/** Ref-count for nested beginFlip/endFlip pairs (drag wrapping animation). */
	private flipRefCount = 0;
	private foldOrigin = 0.75;
	private foldPointer = 0.75;
	private manualNeedsSettlement = false;
	private manualFoldPoint: Point | undefined;

	setFoldOrigin(normalizedY: number): void {
		this.foldOrigin = Math.max(0, Math.min(1, normalizedY));
		this.foldPointer = this.foldOrigin;
	}

	setFoldPointer(normalizedY: number): void {
		this.foldPointer = Math.max(0, Math.min(1, normalizedY));
	}

	/** Follow a held pointer without queuing animations or reporting a completed turn. */
	setManualPosition(position: number): void {
		this.manualFoldPoint = undefined;
		const previous = this.flipPosition;
		this.flipPosition = position;
		this.manualNeedsSettlement ||= previous !== this.flipPosition;
		this.applyTransform(this.flipPosition);
	}

	/** Track the lifted corner in page coordinates, including movement beyond the page edges. */
	setManualFold(point: Point): void {
		const size = this.getPaperSize();
		if (!size) {
			this.setManualPosition(Number.isFinite(point.x) ? (1 - point.x) / 2 : this.flipPosition);
			return;
		}
		const previousPosition = this.flipPosition;
		const previousPoint = this.manualFoldPoint;
		const fold = computePageFoldFromPoint(
			size.width,
			size.height,
			{ x: point.x * size.width, y: point.y * size.height },
			this.foldOrigin < 0.5 ? "top" : "bottom",
		);
		const constrainedPoint = {
			x: fold.destination.x / size.width,
			y: fold.destination.y / size.height,
		};
		this.flipPosition = (1 - constrainedPoint.x) / 2;
		this.manualFoldPoint =
			this.flipPosition === 0 || this.flipPosition === 1 ? undefined : constrainedPoint;
		this.manualNeedsSettlement ||=
			previousPosition !== this.flipPosition ||
			(previousPoint !== undefined && previousPoint.y !== constrainedPoint.y);
		this.applyTransform(this.flipPosition);
	}

	constructor(
		readonly index: number,
		readonly pages: [HTMLElement, HTMLElement | undefined],
		isFlipped: boolean,
		private readonly bookProperties: {
			isLTR: boolean;
			pagesCount: number;
			leavesCount: number;
			pageShadow: boolean;
			snapshotDuringFlip: boolean;
		},
		private readonly onTurned: (direction: FlipDirection) => void,
	) {
		this.wrappedFlipPosition = isFlipped ? 1 : 0;
		// TODO: rethink this
		// if(isFlipped) {
		//   // this.flipToPosition(1);
		// }
	}

	get isTurned(): boolean {
		return this.flipPosition === 1;
	}
	get isTurning(): boolean {
		return this.flipPosition !== 0;
	}
	get isCover(): boolean {
		return this.isFirst || this.isLast;
	}
	get isFirst(): boolean {
		return this.index === 0;
	}
	get isLast(): boolean {
		return this.index === this.bookProperties.leavesCount - 1;
	}
	set flipPosition(value: number) {
		this.wrappedFlipPosition = Math.max(0, Math.min(1, value)) as FlipPosition;
		if (this.wrappedFlipPosition === 0 || this.wrappedFlipPosition === 1) {
			this.manualFoldPoint = undefined;
		}
	}
	get flipPosition(): number {
		return this.wrappedFlipPosition;
	}

	setHoverShadow(progress: number): void {
		const clamped = Math.max(0, Math.min(1, progress));
		if (this.hoverShadow === clamped) return;
		this.hoverShadow = clamped;
		this.applyTransform(this.flipPosition);
	}

	/**
	 * Signal that a flip interaction is starting (drag or animation).
	 * Ref-counted: the snapshot class is added on the first call and
	 * removed only when every `beginFlip` has a matching `endFlip`.
	 * This keeps the GPU layer and scrollbar/selection lockdown stable
	 * across the full drag→release→animation cycle.
	 */
	beginFlip(): void {
		this.flipRefCount++;
		if (this.flipRefCount !== 1) return; // already promoted
		for (const page of this.pages) {
			if (!page) continue;
			page.style.willChange = "transform";
			if (this.bookProperties.snapshotDuringFlip) {
				page.classList.add("page--flipping");
			}
		}
	}

	/**
	 * Signal that a flip interaction finished (drag or animation).
	 * Only releases the GPU layer when every `beginFlip` is balanced.
	 */
	endFlip(): void {
		this.flipRefCount = Math.max(0, this.flipRefCount - 1);
		if (this.flipRefCount !== 0) return; // still active
		if (!this.manualFoldPoint || this.flipPosition === 0 || this.flipPosition === 1) {
			this.manualFoldPoint = undefined;
			this.foldOrigin = 0.75;
			this.foldPointer = this.foldOrigin;
		}
		for (const page of this.pages) {
			if (!page) continue;
			page.style.willChange = "";
			if (this.bookProperties.snapshotDuringFlip) {
				page.classList.remove("page--flipping");
			}
		}
	}

	async flipToPosition(
		flipPosition: FlipPosition,
		velocity: DegreesPerSecond = 225 as DegreesPerSecond,
	) {
		if (this.currentAnimation) {
			await this.currentAnimation;
		}

		if (this.flipPosition === flipPosition) {
			if (flipPosition === 0 || flipPosition === 1) {
				this.manualFoldPoint = undefined;
				this.applyTransform(flipPosition);
			}
			if (this.manualNeedsSettlement && (flipPosition === 0 || flipPosition === 1)) {
				this.manualNeedsSettlement = false;
				this.onTurned(flipPosition === 1 ? FlipDirection.Forward : FlipDirection.Backward);
			}
			return Promise.resolve();
		}

		if (this.targetFlipPosition === flipPosition) {
			return this.currentAnimation ?? Promise.resolve();
		}

		this.targetFlipPosition = flipPosition;
		// Promote to GPU layer before animation starts for smooth compositing
		this.beginFlip();

		this.currentAnimation = new Promise<void>((resolve) => {
			const currentFlipPosition = this.flipPosition;
			const startingFoldPoint = this.manualFoldPoint && { ...this.manualFoldPoint };
			const targetFoldPoint = {
				x: 1 - 2 * flipPosition,
				y: this.foldOrigin < 0.5 ? 0 : 1,
			};
			const distance = Math.abs(flipPosition - currentFlipPosition);
			const duration = ((distance * 180) / velocity) * 1000; // duration in milliseconds

			const start = performance.now();
			const step = (timestamp: number) => {
				const elapsed = timestamp - start;

				if (elapsed < 0) {
					scheduleFrame(step);
					return;
				}

				const progress = Math.min(elapsed / duration, 1);
				const easedProgress = easePageTurn(progress);
				const newPosition =
					currentFlipPosition + easedProgress * (flipPosition - currentFlipPosition);
				if (startingFoldPoint) {
					this.manualFoldPoint = {
						x: startingFoldPoint.x + easedProgress * (targetFoldPoint.x - startingFoldPoint.x),
						y: startingFoldPoint.y + easedProgress * (targetFoldPoint.y - startingFoldPoint.y),
					};
					if (progress === 1 && (flipPosition === 0 || flipPosition === 1)) {
						this.manualFoldPoint = undefined;
					}
				}

				// Ensure the new position is within valid bounds [0, 1]
				this.flipPosition = Math.max(0, Math.min(1, newPosition)) as FlipPosition;
				this.applyTransform(newPosition);
				if (progress < 1) {
					scheduleFrame(step);
				} else {
					this.currentAnimation = null;
					this.targetFlipPosition = null;
					this.manualNeedsSettlement = false;
					if (this.flipPosition === 0 || this.flipPosition === 1) {
						this.onTurned(this.flipPosition === 1 ? FlipDirection.Forward : FlipDirection.Backward);
					}
					// Release GPU layer after animation completes
					this.endFlip();
					resolve();
				}
			};

			scheduleFrame(step);
		});

		return this.currentAnimation;
	}

	async efficientFlipToPosition(
		flipPosition: FlipPosition,
		velocity: DegreesPerSecond = 20000 as DegreesPerSecond,
	) {
		return throttle(1, this.flipToPosition.bind(this))(flipPosition, velocity);
	}

	applyTransform(position: number): void {
		const clampedPosition = Math.max(0, Math.min(1, position));
		const { pageShadow } = this.bookProperties;
		const previewPosition =
			clampedPosition === 0
				? this.hoverShadow * 0.22
				: clampedPosition === 1
					? 1 - this.hoverShadow * 0.22
					: clampedPosition;
		const width = Number.parseFloat(this.pages[0].style.width);
		const height = Number.parseFloat(this.pages[0].style.height);
		const paperSize = this.getPaperSize();
		if (paperSize && this.manualFoldPoint) {
			const fold = computePageFoldFromPoint(
				width,
				height,
				{ x: this.manualFoldPoint.x * width, y: this.manualFoldPoint.y * height },
				this.foldOrigin < 0.5 ? "top" : "bottom",
			);
			this.manualFoldPoint = { x: fold.destination.x / width, y: fold.destination.y / height };
			this.flipPosition = (1 - this.manualFoldPoint.x) / 2;
			if (this.flipPosition > 0 && this.flipPosition < 1) {
				this.applyPaperFold(width, height, this.flipPosition, fold);
				return;
			}
		}
		const usePaperFold = paperSize && previewPosition > 0 && previewPosition < 1;
		if (usePaperFold) {
			this.applyPaperFold(width, height, previewPosition);
			return;
		}

		// Only compute shadow values when shadow is enabled — skipping these
		// saves CSS custom-property mutations per page per animation frame.
		let shadowStrength = 0;
		let highlightStrength = 0;
		if (pageShadow) {
			const shadowFromFlip = Math.sin(clampedPosition * Math.PI);
			const shadowProgress = Math.max(shadowFromFlip, this.hoverShadow);
			shadowStrength = Math.min(1, shadowProgress * SHADOW_STRENGTH_MULTIPLIER);
			highlightStrength = Math.min(1, shadowProgress * HIGHLIGHT_STRENGTH_MULTIPLIER);
		}

		this.pages.forEach((page, index) => {
			const isLTR = this.bookProperties.isLTR;
			if (!page) return;
			page.classList.remove("page--folded");
			page.style.clipPath = "";
			page.style.removeProperty("--fold-shading");

			const isOdd = (index % 2) + 1 === 1;
			const degrees = isOdd
				? isLTR
					? clampedPosition > 0.5
						? 180 - clampedPosition * 180
						: -clampedPosition * 180
					: clampedPosition > 0.5
						? -(180 - clampedPosition * 180)
						: clampedPosition * 180
				: isLTR
					? clampedPosition < 0.5
						? -clampedPosition * 180
						: 180 - clampedPosition * 180
					: clampedPosition < 0.5
						? clampedPosition * 180
						: -(180 - clampedPosition * 180);
			const rotateY = `${degrees}deg`;
			const translateX = `${isOdd ? (isLTR ? "100%" : "-100%") : "0px"}`;
			const scaleX = isOdd ? (clampedPosition > 0.5 ? -1 : 1) : clampedPosition < 0.5 ? -1 : 1;
			const origin = isOdd ? (isLTR ? "left" : "right") : isLTR ? "right" : "left";

			page.style.transform = `translateX(${translateX})rotateY(${rotateY})scaleX(${scaleX})`;
			page.style.transformOrigin = origin;
			page.style.zIndex = this.getSurfaceZIndex(page, clampedPosition, index, false);

			if (pageShadow) {
				const edge = origin === "left" ? "right" : "left";
				page.style.setProperty("--inner-shadow-shadow", shadowStrength.toFixed(3));
				page.style.setProperty("--inner-shadow-highlight", highlightStrength.toFixed(3));
				page.style.setProperty("--inner-shadow-edge", edge);
			}
		});
	}

	private getPaperSize(): { width: number; height: number } | undefined {
		const width = Number.parseFloat(this.pages[0].style.width);
		const height = Number.parseFloat(this.pages[0].style.height);
		if (
			!this.pages[1] ||
			this.pages.some((page) => page?.dataset.isCoverPage === "1") ||
			!Number.isFinite(width) ||
			!Number.isFinite(height) ||
			width <= 0 ||
			height <= 0
		) {
			return undefined;
		}
		return { width, height };
	}

	private getSurfaceZIndex(
		page: HTMLElement,
		position: number,
		side: number,
		folded: boolean,
	): string {
		if (position === 0 || position === 1) {
			return `${
				position === 1
					? page.dataset.pageIndex
					: this.bookProperties.pagesCount - Number(page.dataset.pageIndex)
			}`;
		}
		// All moving leaves share a stack above the flat pages, including rigid boards.
		// Leaf order reverses across the spine; rigid faces also swap their visible side.
		const beforeSpine = position < 0.5;
		const leafOrder = beforeSpine ? -this.index * 2 : this.index * 2;
		const faceOrder = folded || !beforeSpine ? side : 1 - side;
		return `${this.bookProperties.pagesCount * 2 + leafOrder + faceOrder}`;
	}

	private applyPaperFold(
		width: number,
		height: number,
		position: number,
		manualFold?: PageFold,
	): void {
		const fold =
			manualFold ??
			computePageFold(
				width,
				height,
				position,
				this.foldOrigin < 0.5 ? "top" : "bottom",
				this.foldPointer - this.foldOrigin,
			);
		const [a, b, c, d, tx, ty] = fold.reflection;
		const isLTR = this.bookProperties.isLTR;
		for (let side = 0; side < this.pages.length; side++) {
			const page = this.pages[side];
			if (!page) continue;
			const front = side === 0;
			const mirror = front ? !isLTR : isLTR;
			const polygon = (front ? fold.front : fold.folded).map((point) => ({
				x: mirror ? width - point.x : point.x,
				y: point.y,
			}));
			page.classList.add("page--folded");
			page.style.transformOrigin = "0px 0px";
			page.style.transform = front
				? `translateX(${isLTR ? width : -width}px)`
				: isLTR
					? `matrix(${-a}, ${-b}, ${c}, ${d}, ${width + a * width + tx}, ${b * width + ty})`
					: `matrix(${-a}, ${b}, ${-c}, ${d}, ${-tx}, ${ty})`;
			page.style.clipPath =
				polygon.length < 3
					? "polygon(0px 0px, 0px 0px, 0px 0px)"
					: `polygon(${polygon.map((point) => `${point.x.toFixed(3)}px ${point.y.toFixed(3)}px`).join(", ")})`;
			page.style.zIndex = this.getSurfaceZIndex(page, position, side, true);
			if (this.bookProperties.pageShadow) {
				this.applyCreaseShading(
					page,
					width,
					height,
					fold.normal,
					fold.midpoint,
					mirror,
					fold.strength,
					front,
				);
			}
		}
	}

	private applyCreaseShading(
		page: HTMLElement,
		width: number,
		height: number,
		normal: Point,
		midpoint: Point,
		mirror: boolean,
		strength: number,
		front: boolean,
	): void {
		const nx = mirror ? -normal.x : normal.x;
		const mx = mirror ? width - midpoint.x : midpoint.x;
		const span = Math.abs(nx) * width + Math.abs(normal.y) * height;
		const minimum = Math.min(0, nx * width) + Math.min(0, normal.y * height);
		const stop = ((nx * mx + normal.y * midpoint.y - minimum) / span) * 100;
		const angle = (Math.atan2(nx, -normal.y) * 180) / Math.PI;
		const band = Math.min(18, (100 * Math.min(width * 0.12, 48)) / span);
		const opacity = (strength * (front ? 0.24 : 0.3)).toFixed(3);
		page.style.setProperty(
			"--fold-shading",
			front
				? `linear-gradient(${angle}deg, transparent ${stop - band}%, rgba(0,0,0,${opacity}) ${stop}%, transparent ${stop + 0.5}%)`
				: `linear-gradient(${angle}deg, rgba(0,0,0,${opacity}) ${stop}%, rgba(255,255,255,${(strength * 0.35).toFixed(3)}) ${stop + band * 0.3}%, transparent ${stop + band}%)`,
		);
	}
}
