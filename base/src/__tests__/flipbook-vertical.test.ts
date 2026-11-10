import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlipBook } from "../flipbook";
import { getFlipBookInternals, getLeafState } from "./test-utils";

// Vertical (top-bound) flip-axis coverage: layout seam, upright transforms,
// drag direction/velocity, turn-zone affordance, boundaries and events.

describe("FlipBook flipAxis 'vertical'", () => {
	let container: HTMLDivElement;
	let pages: HTMLElement[];

	beforeEach(() => {
		container = document.createElement("div");
		Object.defineProperty(container, "clientWidth", { value: 800, configurable: true });
		Object.defineProperty(container, "clientHeight", { value: 600, configurable: true });
		document.body.appendChild(container);
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			setTimeout(() => cb(performance.now()), 0);
			return 0;
		});
		// jsdom reports zero rects; give pages a real box so the turn-zone
		// affordance (bottom 22% of the sheet) can be evaluated.
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
			this: HTMLElement,
		) {
			return {
				x: 0,
				y: 0,
				top: 0,
				left: 0,
				right: 800,
				bottom: 600,
				width: 800,
				height: 600,
				toJSON: () => ({}),
			} as DOMRect;
		});
	});

	afterEach(() => {
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	function createPages(count: number): HTMLElement[] {
		pages = [];
		for (let i = 0; i < count; i++) {
			const page = document.createElement("div");
			page.className = "page";
			container.appendChild(page);
			pages.push(page);
		}
		return pages;
	}

	function renderVertical(pagesCount = 8, extra: Record<string, unknown> = {}) {
		createPages(pagesCount);
		const book = new FlipBook({ pagesCount, flipAxis: "vertical", ...extra });
		book.render(container);
		return book;
	}

	function pan(book: FlipBook, fromY: number, toY: number, velocityY = 0) {
		const internals = getFlipBookInternals(book);
		const target = pages[0];
		const srcEvent = { target, type: "mousedown" } as unknown as Event;
		internals.onDragStart({
			center: { x: 400, y: fromY },
			deltaX: 0,
			deltaY: 0,
			pointerType: "mouse",
			srcEvent,
		} as never);
		internals.onDragUpdate({
			center: { x: 400, y: toY },
			deltaX: 0,
			deltaY: toY - fromY,
			pointerType: "mouse",
			srcEvent,
		} as never);
		return internals.onDragEnd({
			center: { x: 400, y: toY },
			velocityX: 0,
			velocityY,
			pointerType: "mouse",
			srcEvent,
		} as never);
	}

	it("marks the book vertical and centers the binding seam", () => {
		const book = renderVertical(8);
		expect(container.classList.contains("flipbook--vertical")).toBe(true);
		// bindingY = insets.top + clientHeight/2 = 300
		expect(container.style.getPropertyValue("--flipbook-binding-y")).toBe("300px");
		// live sheets hang from the seam
		expect(pages[0].style.top).toBe("300px");
		book.destroy();
	});

	it("keeps content upright: rotateX + translateY/scaleY, never rotateY", () => {
		const book = renderVertical(8);
		const front = pages[0].style.transform;
		const back = pages[1].style.transform;
		expect(front).toContain("rotateX");
		expect(front).not.toContain("rotateY");
		expect(front).toContain("translateY(0px)");
		expect(back).toContain("translateY(-100%)");
		expect(pages[0].style.transformOrigin).toBe("top");
		book.destroy();
	});

	it("does not mark horizontal books vertical by default", () => {
		createPages(8);
		const book = new FlipBook({ pagesCount: 8 });
		book.render(container);
		expect(container.classList.contains("flipbook--vertical")).toBe(false);
		expect(pages[0].style.transform).toContain("rotateY");
		book.destroy();
	});

	it("flipNext advances one face and reveals the turned back in the top zone", async () => {
		vi.useFakeTimers();
		const book = renderVertical(8);
		const flip = book.flipNext();
		await vi.runAllTimersAsync();
		await flip;
		expect(book.currentPageIndex).toBe(1);
		// pages[1] is the back of leaf 0 — now the visible turned face.
		expect(pages[1].style.transform).toContain("scaleY(1)");
		expect(pages[1].style.transform).toContain("translateY(-100%)");
		book.destroy();
		vi.useRealTimers();
	});

	it("dragging the lower edge upward completes a forward turn", async () => {
		vi.useFakeTimers();
		const book = renderVertical(8);
		// pan from the bottom-edge turn zone (rect bottom=600, zone>=468) upward.
		const end = pan(book, 560, 180);
		await end;
		await vi.runAllTimersAsync();
		expect(book.currentPageIndex).toBe(1);
		book.destroy();
		vi.useRealTimers();
	});

	it("dragging downward reverses a turn (backward)", async () => {
		vi.useFakeTimers();
		const book = renderVertical(8);
		const flip = book.flipNext();
		await vi.runAllTimersAsync();
		await flip;
		expect(book.currentPageIndex).toBe(1);
		// now drag the turned sheet's lower edge back down
		const end = pan(book, 180, 560);
		await end;
		await vi.runAllTimersAsync();
		expect(book.currentPageIndex).toBe(0);
		book.destroy();
		vi.useRealTimers();
	});

	it("ignores gestures that start outside the lower-edge turn zone", async () => {
		vi.useFakeTimers();
		const book = renderVertical(8);
		const internals = getFlipBookInternals(book);
		const target = pages[0];
		const srcEvent = { target, type: "mousedown" } as unknown as Event;
		// center.y=120 is above the bottom 22% affordance → no flip starts.
		internals.onDragStart({
			center: { x: 400, y: 120 },
			deltaX: 0,
			deltaY: 0,
			pointerType: "mouse",
			srcEvent,
		} as never);
		internals.onDragUpdate({
			center: { x: 400, y: 20 },
			deltaX: 0,
			deltaY: -100,
			pointerType: "mouse",
			srcEvent,
		} as never);
		expect(internals.activeFlips.size).toBe(0);
		internals.onDragEnd({
			center: { x: 400, y: 20 },
			velocityX: 0,
			velocityY: -2,
			pointerType: "mouse",
			srcEvent,
		} as never);
		await vi.runAllTimersAsync();
		expect(book.currentPageIndex).toBe(0);
		book.destroy();
		vi.useRealTimers();
	});

	it("respects first/last page boundaries", async () => {
		vi.useFakeTimers();
		const book = renderVertical(4);
		expect(book.isFirstPage).toBe(true);
		const prev = book.flipPrev();
		await vi.runAllTimersAsync();
		await prev;
		expect(book.currentPageIndex).toBe(0);
		// 4 pages = 2 leaves; flipping both lands on the last face (index 3).
		const f1 = book.flipNext();
		const f2 = book.flipNext();
		await vi.runAllTimersAsync();
		await Promise.all([f1, f2]);
		expect(book.currentPageIndex).toBe(3);
		// Already at the last page — further flips are no-ops.
		const f3 = book.flipNext();
		await vi.runAllTimersAsync();
		await f3;
		expect(book.currentPageIndex).toBe(3);
		book.destroy();
		vi.useRealTimers();
	});

	it("reports the same page-index events as horizontal books", async () => {
		vi.useFakeTimers();
		const changed: number[] = [];
		const flipping: { leafIndex: number; pageIndices: [number, number]; direction: string }[] = [];
		const flipped: { leafIndex: number; pageIndices: [number, number]; direction: string }[] = [];
		createPages(8);
		const book = new FlipBook({
			pagesCount: 8,
			flipAxis: "vertical",
			onPageChanged: (i) => changed.push(i),
			onPageFlipping: (p) => flipping.push(p),
			onPageFlipped: (p) => flipped.push(p),
		});
		book.render(container);
		const flip = book.flipNext();
		await vi.runAllTimersAsync();
		await flip;
		// Page-index mapping matches horizontal semantics: turning leaf 0
		// forward lands on page 1 and reports the [1, 2] spread.
		expect(changed).toEqual([1]);
		expect(flipping.at(-1)).toMatchObject({
			leafIndex: 0,
			pageIndices: [1, 2],
			direction: "forward",
		});
		expect(flipped.at(-1)).toMatchObject({
			leafIndex: 0,
			pageIndices: [1, 2],
			direction: "forward",
		});
		book.destroy();
		vi.useRealTimers();
	});

	it("exposes leaf transforms through the public leaf state", () => {
		const book = renderVertical(8);
		const internals = getFlipBookInternals(book);
		const leaf = internals.leaves[0];
		expect(getLeafState(leaf).flipPosition).toBe(0);
		expect(leaf.isTurned).toBe(false);
		book.destroy();
	});
});
