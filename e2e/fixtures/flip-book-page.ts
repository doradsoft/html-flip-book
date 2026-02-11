import type { Page } from "@playwright/test";
import {
	TEST_PARAM_FAST_DELTA_THRESHOLD,
	TEST_PARAM_INITIAL_TURNED_LEAVES,
} from "../../react/example/src/test-url-params";
import { type FlipBookDOMState, getFlipBookDOMState } from "./dom-inspection";

export interface FlipBookPageOptions {
	/** Base URL for the test app */
	baseUrl?: string;
	/** Direction of the book */
	direction?: "ltr" | "rtl";
	/** Number of pages */
	pagesCount?: number;
	/** Fast delta threshold for velocity detection */
	fastDeltaThreshold?: number;
	/** Indices of leaves that should start in the turned state */
	initialTurnedLeaves?: number[];
}

/**
 * Page Object Model for FlipBook E2E tests
 * Encapsulates common interactions and state queries
 */
export class FlipBookPage {
	readonly page: Page;
	readonly options: Required<Omit<FlipBookPageOptions, "initialTurnedLeaves">> & {
		initialTurnedLeaves: number[];
	};
	private readonly containerSelector: string;

	constructor(page: Page, options: FlipBookPageOptions = {}) {
		this.page = page;
		this.options = {
			baseUrl: options.baseUrl ?? "http://localhost:5173",
			direction: options.direction ?? "ltr",
			pagesCount: options.pagesCount ?? 10,
			fastDeltaThreshold: options.fastDeltaThreshold ?? 500,
			initialTurnedLeaves: options.initialTurnedLeaves ?? [],
		};
		// Use .en-book for LTR, .he-book for RTL
		this.containerSelector =
			this.options.direction === "ltr" ? ".en-book.flipbook" : ".he-book.flipbook";
	}

	/** Navigate to the test app with configured options */
	async goto(): Promise<void> {
		const url = new URL(this.options.baseUrl);
		if (this.options.initialTurnedLeaves.length > 0) {
			url.searchParams.set(
				TEST_PARAM_INITIAL_TURNED_LEAVES,
				this.options.initialTurnedLeaves.join(","),
			);
		}
		if (this.options.fastDeltaThreshold !== 500) {
			url.searchParams.set(
				TEST_PARAM_FAST_DELTA_THRESHOLD,
				this.options.fastDeltaThreshold.toString(),
			);
		}
		await this.page.goto(url.toString());
		await this.waitForReady();
	}

	/** Wait for flipbook to be fully rendered */
	async waitForReady(): Promise<void> {
		await this.page.waitForSelector(`${this.containerSelector} .page`);
	}

	/** Get the flipbook container locator */
	get container() {
		return this.page.locator(this.containerSelector);
	}

	/** Get a specific page by index */
	getPage(index: number) {
		return this.page.locator(`${this.containerSelector} .page[data-page-index="${index}"]`);
	}

	/** Get the center coordinates of the flipbook */
	async getCenter(): Promise<{ x: number; y: number }> {
		const box = await this.container.boundingBox();
		if (!box) throw new Error("Flipbook container not found");
		return {
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		};
	}

	/** Get the current DOM state of all pages */
	async getDOMState(): Promise<FlipBookDOMState> {
		return getFlipBookDOMState(this.page, this.containerSelector);
	}

	/**
	 * Perform a drag gesture on the flipbook
	 * @param startOffset - Offset from center for start position
	 * @param endOffset - Offset from center for end position
	 * @param options - Drag options
	 */
	async drag(
		startOffset: { x: number; y: number },
		endOffset: { x: number; y: number },
		options: { steps?: number; hold?: boolean } = {},
	): Promise<void> {
		const { steps = 10, hold = false } = options;
		const center = await this.getCenter();

		const startX = center.x + startOffset.x;
		const startY = center.y + startOffset.y;
		const endX = center.x + endOffset.x;
		const endY = center.y + endOffset.y;

		await this.page.mouse.move(startX, startY);
		await this.page.mouse.down();

		// Move in steps to simulate realistic drag
		for (let i = 1; i <= steps; i++) {
			const progress = i / steps;
			const x = startX + (endX - startX) * progress;
			const y = startY + (endY - startY) * progress;
			await this.page.mouse.move(x, y);
		}

		if (!hold) {
			await this.page.mouse.up();
		}
	}

	/**
	 * Perform a forward flip drag (LTR: right to left, RTL: left to right)
	 * @param dropPosition - 0-1 indicating where to release (0=start, 1=full flip)
	 * @param velocity - 'slow' or 'fast' relative to fastDeltaThreshold
	 */
	async flipForward(dropPosition: number, velocity: "slow" | "fast" = "slow"): Promise<void> {
		const box = await this.container.boundingBox();
		if (!box) throw new Error("Container not found");

		const dragDistance = box.width * dropPosition * 0.4; // 40% of width per full flip
		const startX = this.options.direction === "ltr" ? box.width * 0.3 : -box.width * 0.3;
		const endX = this.options.direction === "ltr" ? startX - dragDistance : startX + dragDistance;

		const steps = velocity === "slow" ? 20 : 5; // Fewer steps = faster velocity

		await this.drag({ x: startX, y: 0 }, { x: endX, y: 0 }, { steps });
	}

	/**
	 * Perform a backward flip drag
	 * @param dropPosition - 0-1 indicating where to release
	 * @param velocity - 'slow' or 'fast'
	 */
	async flipBackward(dropPosition: number, velocity: "slow" | "fast" = "slow"): Promise<void> {
		const box = await this.container.boundingBox();
		if (!box) throw new Error("Container not found");

		const dragDistance = box.width * dropPosition * 0.4;
		const startX = this.options.direction === "ltr" ? -box.width * 0.3 : box.width * 0.3;
		const endX = this.options.direction === "ltr" ? startX + dragDistance : startX - dragDistance;

		const steps = velocity === "slow" ? 20 : 5;

		await this.drag({ x: startX, y: 0 }, { x: endX, y: 0 }, { steps });
	}

	/**
	 * Wait for any flip animation to complete
	 */
	async waitForAnimationComplete(timeout = 2000): Promise<void> {
		// Wait for no transform changes over a period
		await this.page
			.waitForFunction(
				() => {
					const pages = document.querySelectorAll(".page");
					const transforms = Array.from(pages).map((p) => window.getComputedStyle(p).transform);
					return transforms.every((t) => !t.includes("rotateY") || t === "none");
				},
				{ timeout },
			)
			.catch(() => {
				// Animation may have completed already
			});
	}
}
