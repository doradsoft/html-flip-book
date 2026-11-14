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
			const pageIndex = Number(this.dataset.pageIndex);
			const height = Number.parseFloat(this.style.height) || 600;
			const top = (Number.parseFloat(this.style.top) || 0) - (pageIndex % 2 === 1 ? height : 0);
			return {
				x: 0,
				y: 0,
				top,
				left: 0,
				right: 800,
				bottom: top + height,
				width: 800,
				height,
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
		const target = pages[fromY < toY ? 1 : 0];
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

	it("keeps both faces on the same sheet with opposite binding origins", () => {
		const book = renderVertical(8);
		const front = pages[0].style.transform;
		const back = pages[1].style.transform;
		expect(front).toContain("rotateX");
		expect(front).not.toContain("rotateY");
		expect(front).toContain("translateY(0px)");
		expect(back).toContain("translateY(-100%)");
		expect(pages[0].style.transformOrigin).toBe("top");
		expect(pages[1].style.transformOrigin).toBe("bottom");
		const leaf = getFlipBookInternals(book).leaves[0];
		for (const position of [0, 0.25, 0.5, 0.75, 1]) {
			leaf.setManualPosition(position);
			expect(pages[0].style.transform).toContain(`rotateX(${position * 180}deg)`);
			expect(pages[1].style.transform).toContain(`rotateX(${position * 180 - 180}deg)`);
			expect(pages[0].style.transform).not.toContain("scaleY");
			expect(pages[1].style.transform).not.toContain("scaleY");
		}
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
		expect(pages[1].style.transform).toContain("rotateX(0deg)");
		expect(pages[1].style.transform).toContain("translateY(-100%)");
		book.destroy();
		vi.useRealTimers();
	});

	it("limits the binding to the centered sheet stack", () => {
		const book = renderVertical();
		const left = Number.parseFloat(container.style.getPropertyValue("--flipbook-binding-left"));
		const width = Number.parseFloat(container.style.getPropertyValue("--flipbook-binding-width"));
		expect(left).toBeGreaterThan(0);
		expect(width).toBeCloseTo(Number.parseFloat(pages[0].style.width));
		expect(left + width / 2).toBeCloseTo(400);
		book.destroy();
	});

	it("draws resting paper below the wire and lifted faces above it throughout a turn", () => {
		const book = renderVertical(8);
		const binding = Number(container.style.getPropertyValue("--flipbook-binding-z-index"));
		const leaf = getFlipBookInternals(book).leaves[1];
		for (const position of [0, 0.25, 0.5, 0.75, 1]) {
			leaf.setManualPosition(position);
			for (const face of leaf.pages) {
				if (!face) continue;
				if (position === 0 || position === 1)
					expect(Number(face.style.zIndex)).toBeLessThan(binding);
				else expect(Number(face.style.zIndex)).toBeGreaterThan(binding);
			}
		}
		book.destroy();
	});

	it("hides covered and rear-facing pages from keyboard and assistive technology", () => {
		const book = renderVertical();
		expect(pages[0].getAttribute("aria-hidden")).toBe("false");
		for (const page of pages.slice(1)) {
			expect(page.getAttribute("aria-hidden")).toBe("true");
			expect(page.inert).toBe(true);
		}
		book.jumpToPage(4);
		expect(pages[3].inert).toBe(false);
		expect(pages[4].inert).toBe(false);
		expect(pages[0].inert).toBe(true);
		book.destroy();
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
		const end = pan(book, 40, 560);
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

	it("returns a cancelled turn to its original sheet without a page-change event", async () => {
		vi.useFakeTimers();
		const changed = vi.fn();
		const book = renderVertical(8, { onPageChanged: changed });
		const internals = getFlipBookInternals(book);
		const srcEvent = { target: pages[0], type: "mousedown" } as unknown as Event;
		internals.onDragStart({
			center: { x: 400, y: 570 },
			deltaY: 0,
			pointerType: "mouse",
			srcEvent,
		} as never);
		internals.onDragUpdate({
			center: { x: 400, y: 100 },
			deltaY: -470,
			pointerType: "mouse",
			srcEvent,
		} as never);
		expect(internals.leaves[0].flipPosition).toBeGreaterThan(0.5);
		(internals.onDragEnd as (event: unknown, cancelled: boolean) => void)(
			{ velocityY: -2, pointerType: "mouse", srcEvent },
			true,
		);
		await vi.runAllTimersAsync();
		expect(book.currentPageIndex).toBe(0);
		expect(internals.leaves[0].flipPosition).toBe(0);
		expect(changed).not.toHaveBeenCalled();
		book.destroy();
		vi.useRealTimers();
	});

	it("reports the jumped spread and restores history without writing another entry", () => {
		const flipped = vi.fn();
		const push = vi.spyOn(History.prototype, "pushState");
		const book = renderVertical(8, { onPageFlipped: flipped, enableHistory: true });
		book.jumpToPage(4);
		expect(flipped).toHaveBeenLastCalledWith(
			expect.objectContaining({ pageIndices: [3, 4], direction: "forward" }),
		);
		const writes = push.mock.calls.length;
		book.restorePage(2);
		expect(flipped).toHaveBeenLastCalledWith(
			expect.objectContaining({ pageIndices: [1, 2], direction: "backward" }),
		);
		expect(push).toHaveBeenCalledTimes(writes);
		book.destroy();
	});

	it("does not turn an unpaired final front into a nonexistent reverse", async () => {
		vi.useFakeTimers();
		const book = renderVertical(5);
		book.jumpToPage(4);
		const next = book.flipNext();
		await vi.runAllTimersAsync();
		await next;
		expect(book.isLastPage).toBe(true);
		expect(book.currentPageIndex).toBe(3);
		book.destroy();
		vi.useRealTimers();
	});

	it("preserves consumer accessibility opt-outs and restores attributes on destroy", () => {
		createPages(6);
		pages[0].inert = true;
		pages[0].setAttribute("aria-hidden", "true");
		const book = new FlipBook({ pagesCount: 6, flipAxis: "vertical", enableHistory: false });
		book.render(container);
		expect(pages[0].inert).toBe(true);
		expect(pages[0].getAttribute("aria-hidden")).toBe("true");
		book.destroy();
		expect(pages[0].inert).toBe(true);
		expect(pages[1].inert).toBe(false);
		expect(pages[1].getAttribute("aria-hidden")).toBeNull();
	});
});
