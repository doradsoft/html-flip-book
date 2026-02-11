import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlipDirection } from "../flip-direction";
import { FlipBook } from "../flipbook";
import { createDragEvent, getFlipBookInternals, setFlipBookInternals } from "./test-utils";

// Mock HammerJS - must be hoisted
vi.mock("hammerjs", () => {
	// Create a proper constructor function for Hammer
	function MockHammer() {
		return {
			on: vi.fn(),
			off: vi.fn(),
			destroy: vi.fn(),
		};
	}
	return { default: MockHammer };
});

describe("FlipBook", () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		// Create container with pages
		container = document.createElement("div");
		container.className = "flipbook-container";
		Object.defineProperty(container, "clientWidth", {
			value: 800,
			configurable: true,
		});
		Object.defineProperty(container, "clientHeight", {
			value: 600,
			configurable: true,
		});
		document.body.appendChild(container);

		// Mock requestAnimationFrame
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			setTimeout(() => cb(performance.now()), 0);
			return 0;
		});
	});

	afterEach(() => {
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	function createPages(count: number): HTMLElement[] {
		const pages: HTMLElement[] = [];
		for (let i = 0; i < count; i++) {
			const page = document.createElement("div");
			page.className = "page";
			container.appendChild(page);
			pages.push(page);
		}
		return pages;
	}

	describe("constructor", () => {
		it("should create a FlipBook with default options", () => {
			const flipBook = new FlipBook({ pagesCount: 4 });
			expect(flipBook).toBeDefined();
			expect(flipBook.bookElement).toBeUndefined();
		});

		it("should accept custom aspect ratios", () => {
			const flipBook = new FlipBook({
				pagesCount: 4,
				leafAspectRatio: { width: 3, height: 4 },
				coverAspectRatio: { width: 3.2, height: 4.2 },
			});
			expect(flipBook).toBeDefined();
		});

		it("should accept direction option", () => {
			const flipBookLTR = new FlipBook({ pagesCount: 4, direction: "ltr" });
			const flipBookRTL = new FlipBook({ pagesCount: 4, direction: "rtl" });
			expect(flipBookLTR).toBeDefined();
			expect(flipBookRTL).toBeDefined();
		});

		it("should accept onPageChanged callback", () => {
			const onPageChanged = vi.fn();
			const flipBook = new FlipBook({ pagesCount: 4, onPageChanged });
			expect(flipBook).toBeDefined();
		});

		it("should accept pageSemantics option", () => {
			const pageSemantics = {
				indexToSemanticName: vi.fn().mockReturnValue("page-1"),
				indexToTitle: vi.fn().mockReturnValue("Page 1"),
				semanticNameToIndex: vi.fn().mockReturnValue(1),
			};
			const flipBook = new FlipBook({ pagesCount: 4, pageSemantics });
			expect(flipBook).toBeDefined();
		});
	});

	describe("render", () => {
		it("should throw error if container not found", () => {
			const flipBook = new FlipBook({ pagesCount: 4 });
			expect(() => flipBook.render(".non-existent")).toThrow(
				"Couldn't find container with selector: .non-existent",
			);
		});

		it("should throw error if no pages found", () => {
			const flipBook = new FlipBook({ pagesCount: 4 });
			expect(() => flipBook.render(".flipbook-container")).toThrow("No pages found in flipbook");
		});

		it("should render flipbook with pages", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			expect(flipBook.bookElement).toBe(container);
			expect(container.classList.contains("flipbook")).toBe(true);
		});

		it("should add flipbook class if not present", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			expect(container.classList.contains("flipbook")).toBe(true);
		});

		it("should not add duplicate flipbook class", () => {
			container.classList.add("flipbook");
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const flipbookClassCount = Array.from(container.classList).filter(
				(c) => c === "flipbook",
			).length;
			expect(flipbookClassCount).toBe(1);
		});

		it("should set page styles correctly for LTR", () => {
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4, direction: "ltr" });
			flipBook.render(".flipbook-container");

			pages.forEach((page, index) => {
				expect(page.dataset.pageIndex).toBe(index.toString());
				expect(page.style.width).toBeTruthy();
				expect(page.style.height).toBeTruthy();
			});
		});

		it("should set page styles correctly for RTL", () => {
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4, direction: "rtl" });
			flipBook.render(".flipbook-container");

			pages.forEach((page, index) => {
				expect(page.dataset.pageIndex).toBe(index.toString());
			});
		});

		it("should mark first page as current-page", () => {
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			expect(pages[0].classList.contains("current-page")).toBe(true);
			expect(pages[0].classList.contains("odd")).toBe(true);
		});

		it("should set odd/even classes on pages", () => {
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			expect(pages[0].classList.contains("odd")).toBe(true);
			expect(pages[1].classList.contains("even")).toBe(true);
			expect(pages[2].classList.contains("odd")).toBe(true);
			expect(pages[3].classList.contains("even")).toBe(true);
		});

		it("should set perspective on book element", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			expect(container.style.perspective).toBeTruthy();
		});

		it("should apply pageSemantics to page elements", () => {
			const pages = createPages(4);
			const pageSemantics = {
				indexToSemanticName: vi.fn((idx: number) => `semantic-${idx}`),
				indexToTitle: vi.fn((idx: number) => `Title ${idx}`),
				semanticNameToIndex: vi.fn(() => null),
			};
			const flipBook = new FlipBook({ pagesCount: 4, pageSemantics });
			flipBook.render(".flipbook-container");

			pages.forEach((page, index) => {
				expect(page.dataset.pageSemanticName).toBe(`semantic-${index}`);
				expect(page.dataset.pageTitle).toBe(`Title ${index}`);
			});
		});

		it("should handle pages without pageSemantics", () => {
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			pages.forEach((page) => {
				expect(page.dataset.pageSemanticName).toBe("");
				expect(page.dataset.pageTitle).toBe("");
			});
		});

		it("should render debug bar when debug is true", () => {
			vi.useFakeTimers();
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container", true);
			setFlipBookInternals(flipBook, {
				currentLeaf: getFlipBookInternals(flipBook).leaves[0],
				flipDirection: FlipDirection.Forward,
			});

			vi.advanceTimersByTime(20);

			const debugBar = container.querySelector(".flipbook-debug-bar");
			expect(debugBar).toBeTruthy();

			vi.useRealTimers();
		});

		it("should render debug bar in RTL with no current leaf", () => {
			vi.useFakeTimers();
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4, direction: "rtl" });
			flipBook.render(".flipbook-container", true);

			// fillDebugBar uses setInterval(..., 200); advance so first tick runs
			vi.advanceTimersByTime(200);

			const debugBar = container.querySelector(".flipbook-debug-bar");
			expect(debugBar?.innerHTML).toContain("RTL");
			expect(debugBar?.innerHTML).toContain("None");

			vi.useRealTimers();
		});
	});

	describe("touch events", () => {
		it("should handle touch start", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const touchEvent = new TouchEvent("touchstart", {
				touches: [{ pageX: 100, pageY: 200 } as Touch],
			});
			container.dispatchEvent(touchEvent);

			expect(flipBook.touchStartingPos).toEqual({ x: 100, y: 200 });
		});

		it("should ignore multi-touch on touchstart", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			// First set a position
			const singleTouch = new TouchEvent("touchstart", {
				touches: [{ pageX: 100, pageY: 200 } as Touch],
			});
			container.dispatchEvent(singleTouch);
			expect(flipBook.touchStartingPos).toEqual({ x: 100, y: 200 });

			// Multi-touch should not update position
			const multiTouch = new TouchEvent("touchstart", {
				touches: [{ pageX: 300, pageY: 400 } as Touch, { pageX: 500, pageY: 600 } as Touch],
			});
			container.dispatchEvent(multiTouch);

			// Position should remain unchanged
			expect(flipBook.touchStartingPos).toEqual({ x: 100, y: 200 });
		});

		it("should handle touchmove and prevent default for horizontal swipe", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			// Set starting position
			const touchStart = new TouchEvent("touchstart", {
				touches: [{ pageX: 100, pageY: 200 } as Touch],
			});
			container.dispatchEvent(touchStart);

			// Horizontal swipe
			const touchMove = new TouchEvent("touchmove", {
				cancelable: true,
				touches: [{ pageX: 200, pageY: 210 } as Touch],
			});
			const preventDefaultSpy = vi.spyOn(touchMove, "preventDefault");
			container.dispatchEvent(touchMove);

			expect(preventDefaultSpy).toHaveBeenCalled();
		});

		it("should not prevent default for vertical swipe", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			// Set starting position
			const touchStart = new TouchEvent("touchstart", {
				touches: [{ pageX: 100, pageY: 200 } as Touch],
			});
			container.dispatchEvent(touchStart);

			// Vertical swipe
			const touchMove = new TouchEvent("touchmove", {
				cancelable: true,
				touches: [{ pageX: 110, pageY: 300 } as Touch],
			});
			const preventDefaultSpy = vi.spyOn(touchMove, "preventDefault");
			container.dispatchEvent(touchMove);

			expect(preventDefaultSpy).not.toHaveBeenCalled();
		});

		it("should ignore multi-touch on touchmove", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const touchStart = new TouchEvent("touchstart", {
				touches: [{ pageX: 100, pageY: 200 } as Touch],
			});
			container.dispatchEvent(touchStart);

			const multiTouchMove = new TouchEvent("touchmove", {
				cancelable: true,
				touches: [{ pageX: 200, pageY: 210 } as Touch, { pageX: 300, pageY: 310 } as Touch],
			});
			const preventDefaultSpy = vi.spyOn(multiTouchMove, "preventDefault");
			container.dispatchEvent(multiTouchMove);

			expect(preventDefaultSpy).not.toHaveBeenCalled();
		});
	});

	describe("jumpToPage", () => {
		it("should call onPageChanged callback", () => {
			const onPageChanged = vi.fn();
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4, onPageChanged });
			flipBook.render(".flipbook-container");

			// jumpToPage(2): lastTurnedLeaf = floor((2-1)/2) = 0, visible = [1, 2], currentPageIndex = 1
			flipBook.jumpToPage(2);

			expect(onPageChanged).toHaveBeenCalledWith(1);
		});

		it("should not throw if onPageChanged is not provided", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			expect(() => flipBook.jumpToPage(2)).not.toThrow();
		});
	});

	describe("odd page count", () => {
		it("should handle odd number of pages", () => {
			createPages(5);
			const flipBook = new FlipBook({ pagesCount: 5 });

			expect(() => flipBook.render(".flipbook-container")).not.toThrow();
		});

		it("should handle single page", () => {
			createPages(1);
			const flipBook = new FlipBook({ pagesCount: 1 });

			expect(() => flipBook.render(".flipbook-container")).not.toThrow();
		});

		it("should handle two pages", () => {
			createPages(2);
			const flipBook = new FlipBook({ pagesCount: 2 });

			expect(() => flipBook.render(".flipbook-container")).not.toThrow();
		});
	});

	describe("aspect ratio calculations", () => {
		it("should calculate leaf size from cover aspect ratio", () => {
			const pages = createPages(4);
			const flipBook = new FlipBook({
				pagesCount: 4,
				leafAspectRatio: { width: 2, height: 3 },
				coverAspectRatio: { width: 2.15, height: 3.15 },
			});
			flipBook.render(".flipbook-container");

			// Pages should have width and height set
			pages.forEach((page) => {
				const width = parseFloat(page.style.width);
				const height = parseFloat(page.style.height);
				expect(width).toBeGreaterThan(0);
				expect(height).toBeGreaterThan(0);
			});
		});
	});

	describe("internal state helpers", () => {
		it("should compute current leaves for open book", () => {
			const flipBook = new FlipBook({ pagesCount: 4 });
			const leafA = { index: 0, isTurned: false, isTurning: false };
			const leafB = { index: 1, isTurned: false, isTurning: false };
			setFlipBookInternals(flipBook, { leaves: [leafA, leafB] as never });

			const internals = getFlipBookInternals(flipBook);
			expect(internals.currentLeaves[0]).toBeUndefined();
			expect(internals.currentLeaves[1]).toBe(leafA);
			expect(internals.isClosed).toBe(true);
			expect(internals.isClosedInverted).toBe(false);
		});

		it("should compute current leaves for fully turned book", () => {
			const flipBook = new FlipBook({ pagesCount: 4 });
			const leafA = { index: 0, isTurned: true, isTurning: false };
			const leafB = { index: 1, isTurned: true, isTurning: false };
			setFlipBookInternals(flipBook, { leaves: [leafA, leafB] as never });

			const internals = getFlipBookInternals(flipBook);
			expect(internals.currentLeaves[0]).toBe(leafB);
			expect(internals.currentLeaves[1]).toBeUndefined();
			expect(internals.isClosed).toBe(false);
			expect(internals.isClosedInverted).toBe(true);
		});

		it("should compute current leaves for middle turned leaf", () => {
			const flipBook = new FlipBook({ pagesCount: 6 });
			const leafA = { index: 0, isTurned: false, isTurning: false };
			const leafB = { index: 1, isTurned: true, isTurning: false };
			const leafC = { index: 2, isTurned: false, isTurning: false };
			setFlipBookInternals(flipBook, { leaves: [leafA, leafB, leafC] as never });

			const internals = getFlipBookInternals(flipBook);
			expect(internals.currentLeaves[0]).toBe(leafB);
			expect(internals.currentLeaves[1]).toBe(leafC);
		});

		it("should compute current or turning leaves", () => {
			const flipBook = new FlipBook({ pagesCount: 4 });
			const leafA = { index: 0, isTurned: false, isTurning: true };
			const leafB = { index: 1, isTurned: false, isTurning: false };
			setFlipBookInternals(flipBook, { leaves: [leafA, leafB] as never });

			const internals = getFlipBookInternals(flipBook);
			expect(internals.currentOrTurningLeaves[0]).toBe(leafA);
			expect(internals.currentOrTurningLeaves[1]).toBe(leafB);
		});

		it("should update current-page classes on turn", () => {
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			getFlipBookInternals(flipBook).onTurned([1, 2], [0, 1]);

			expect(pages[1].classList.contains("current-page")).toBe(true);
			expect(pages[2].classList.contains("current-page")).toBe(true);
			expect(pages[0].classList.contains("current-page")).toBe(false);
		});

		it("should avoid removing classes when no previous indices", () => {
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			getFlipBookInternals(flipBook).onTurned([0]);

			expect(pages[0].classList.contains("current-page")).toBe(true);
		});

		it("should skip duplicate visible page update", async () => {
			vi.useFakeTimers();
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			setFlipBookInternals(flipBook, { prevVisiblePageIndices: [1, 2] });

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			const promise = leaf.flipToPosition(1, 10000 as never);
			await vi.runAllTimersAsync();
			await promise;

			expect(getFlipBookInternals(flipBook).prevVisiblePageIndices).toEqual([1, 2]);
			vi.useRealTimers();
		});

		it("should update visible pages on leaf turn", async () => {
			vi.useFakeTimers();
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			const promise = leaf.flipToPosition(1, 10000 as never);
			await vi.runAllTimersAsync();
			await promise;

			expect(getFlipBookInternals(flipBook).prevVisiblePageIndices).toEqual([1, 2]);
			expect(pages[1].classList.contains("current-page")).toBe(true);
			expect(pages[2].classList.contains("current-page")).toBe(true);

			vi.useRealTimers();
		});

		it("should set single visible page on last leaf forward", async () => {
			vi.useFakeTimers();
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[1];
			const promise = leaf.flipToPosition(1, 10000 as never);
			await vi.runAllTimersAsync();
			await promise;

			expect(getFlipBookInternals(flipBook).prevVisiblePageIndices).toEqual([3]);
			expect(pages[3].classList.contains("current-page")).toBe(true);

			vi.useRealTimers();
		});

		it("should set visible pages on backward turn for first leaf", async () => {
			vi.useFakeTimers();
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			const forward = leaf.flipToPosition(1, 10000 as never);
			await vi.runAllTimersAsync();
			await forward;

			const backward = leaf.flipToPosition(0, 10000 as never);
			await vi.runAllTimersAsync();
			await backward;

			expect(getFlipBookInternals(flipBook).prevVisiblePageIndices).toEqual([0]);
			expect(pages[0].classList.contains("current-page")).toBe(true);

			vi.useRealTimers();
		});

		it("should set visible pages on backward turn for middle leaf", async () => {
			vi.useFakeTimers();
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[1];
			const forward = leaf.flipToPosition(1, 10000 as never);
			await vi.runAllTimersAsync();
			await forward;

			const backward = leaf.flipToPosition(0, 10000 as never);
			await vi.runAllTimersAsync();
			await backward;

			expect(getFlipBookInternals(flipBook).prevVisiblePageIndices).toEqual([1, 2]);
			expect(pages[1].classList.contains("current-page")).toBe(true);
			expect(pages[2].classList.contains("current-page")).toBe(true);

			vi.useRealTimers();
		});
	});

	describe("drag handling", () => {
		it("should set flipStartingPos on drag start when idle", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			getFlipBookInternals(flipBook).onDragStart({ center: { x: 120 } });
			expect(getFlipBookInternals(flipBook).flipStartingPos).toBe(120);
		});

		it("should allow new flip during auto flip (concurrent flips)", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			const leaf0 = getFlipBookInternals(flipBook).leaves[0];

			// Set up an existing auto flip on leaf 0
			setFlipBookInternals(flipBook, {
				currentLeaf: leaf0,
				flipDirection: FlipDirection.Forward,
				flipStartingPos: 50,
				isDuringAutoFlip: true,
			});
			// Start a new drag - should record pending position
			getFlipBookInternals(flipBook).onDragStart({ center: { x: 200 } });

			// The auto flip should still be active
			const internals = getFlipBookInternals(flipBook);
			expect(internals.activeFlips.size).toBeGreaterThan(0);
			// New pending position should be recorded
			expect(internals.pendingFlipStartingPos).toBe(200);
		});

		it("should flip forward on drag update", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			const spy = vi.spyOn(leaf, "efficientFlipToPosition");

			setFlipBookInternals(flipBook, { flipStartingPos: 400 });
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 100 } });

			expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.Forward);
			expect(spy).toHaveBeenCalled();
		});

		it("should continue flipping existing leaf on forward drag", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			const spy = vi.spyOn(leaf, "efficientFlipToPosition");

			// Set up pending flip state first (simulating drag start)
			const raw = flipBook as unknown as { pendingFlipStartingPos: number };
			raw.pendingFlipStartingPos = 400;

			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 100 } });

			expect(spy).toHaveBeenCalled();
		});

		it("should compute flipDelta for RTL during drag update", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4, direction: "rtl" });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			const spy = vi.spyOn(leaf, "efficientFlipToPosition");

			setFlipBookInternals(flipBook, { flipStartingPos: 100 });
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 200 } });

			expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.Forward);
			expect(spy).toHaveBeenCalled();
		});

		it("should allow starting new flip while manual flip is active (concurrent flips)", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			// Set up an existing manual flip on leaf 0
			const leaf0 = getFlipBookInternals(flipBook).leaves[0];
			setFlipBookInternals(flipBook, {
				currentLeaf: leaf0,
				flipDirection: FlipDirection.Forward,
				isDuringManualFlip: true,
			});

			// Try to start a new drag
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 200 } });

			// In concurrent flip architecture, a new flip can start on a different leaf
			// The manual flip should still be tracked
			expect(getFlipBookInternals(flipBook).activeFlips.size).toBeGreaterThan(0);
		});

		it("should allow starting new flip while auto flip is active (concurrent flips)", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			// Set up an existing auto flip on leaf 0
			const leaf0 = getFlipBookInternals(flipBook).leaves[0];
			setFlipBookInternals(flipBook, {
				currentLeaf: leaf0,
				flipDirection: FlipDirection.Forward,
				isDuringAutoFlip: true,
			});

			// Start a new drag - should allow it
			const raw = flipBook as unknown as { pendingFlipStartingPos: number };
			raw.pendingFlipStartingPos = 400;
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 100 } });

			// New flip should be started on a different leaf
			expect(getFlipBookInternals(flipBook).activeFlips.size).toBeGreaterThanOrEqual(1);
		});

		it("should block starting opposite direction flip while auto-flip is in progress", () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			const internals = getFlipBookInternals(flipBook);
			const leaf0 = internals.leaves[0];
			const leaf1 = internals.leaves[1];

			// First, flip leaf 0 forward so leaf 1 becomes the "left" leaf
			leaf0.flipPosition = 1;

			// Set up an existing auto flip going FORWARD on leaf 1 (mid-flip)
			leaf1.flipPosition = 0.5;
			internals.activeFlips.set(leaf1.index, {
				leaf: leaf1,
				direction: FlipDirection.Forward,
				startingPos: 400,
				delta: 200,
				isDuringAutoFlip: true,
			});

			// Try to start a new drag in the BACKWARD direction
			// Simulate starting from the left side and dragging right (backward in LTR)
			const raw = flipBook as unknown as { pendingFlipStartingPos: number };
			raw.pendingFlipStartingPos = 100;

			const initialActiveFlipsSize = internals.activeFlips.size;

			// Try to create a backward flip while forward auto-flip is active
			internals.onDragUpdate({ center: { x: 300 } }); // Moving right = backward in LTR

			// The backward flip should be BLOCKED - no new flip should be created
			// Only the existing forward auto-flip should remain
			expect(internals.activeFlips.size).toBe(initialActiveFlipsSize);
			// And there should be no manual flip created
			for (const state of internals.activeFlips.values()) {
				expect(state.isDuringAutoFlip).toBe(true);
			}
		});

		it("should handle drag update when book element is undefined", () => {
			const flipBook = new FlipBook({ pagesCount: 4 });
			setFlipBookInternals(flipBook, { flipStartingPos: 100 });

			expect(() =>
				getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 50 } }),
			).not.toThrow();
			expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.None);
		});

		it("should return early when drag delta exceeds book width", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			setFlipBookInternals(flipBook, { flipStartingPos: 0 });
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 1000 } });

			expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.None);
		});

		it("should return early when drag delta is zero", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			setFlipBookInternals(flipBook, { flipStartingPos: 100 });
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 100 } });

			expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.None);
		});

		it("should return early for forward drag when delta is negative", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			const spy = vi.spyOn(leaf, "efficientFlipToPosition");

			setFlipBookInternals(flipBook, {
				flipDirection: FlipDirection.Forward,
				flipStartingPos: 100,
			});
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 300 } });

			expect(spy).not.toHaveBeenCalled();
		});

		it("should return early when book is closed inverted on forward drag", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[1];
			leaf.flipPosition = 1;

			const spy = vi.spyOn(getFlipBookInternals(flipBook).leaves[0], "efficientFlipToPosition");

			setFlipBookInternals(flipBook, { flipStartingPos: 400 });
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 200 } });

			expect(spy).not.toHaveBeenCalled();
		});

		it("should flip backward on drag update when a leaf is turned", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			leaf.flipPosition = 1;
			const spy = vi.spyOn(leaf, "efficientFlipToPosition");

			setFlipBookInternals(flipBook, { flipStartingPos: 100 });
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 300 } });

			expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.Backward);
			expect(spy).toHaveBeenCalled();
		});

		it("should use existing current leaf on backward drag", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			leaf.flipPosition = 1;
			const spy = vi.spyOn(leaf, "efficientFlipToPosition");

			setFlipBookInternals(flipBook, {
				currentLeaf: leaf,
				flipDirection: FlipDirection.Backward,
				flipStartingPos: 100,
			});
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 300 } });

			expect(spy).toHaveBeenCalled();
		});

		it("should switch to forward when delta becomes positive during backward drag", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			leaf.flipPosition = 1;
			const spy = vi.spyOn(leaf, "efficientFlipToPosition");

			// In the new concurrent architecture, direction is locked on first movement
			// Set up a backward flip state first
			const raw = flipBook as unknown as {
				pendingFlipStartingPos: number;
				pendingFlipDirection: FlipDirection;
			};
			raw.pendingFlipStartingPos = 100;
			raw.pendingFlipDirection = FlipDirection.Backward;

			// Now drag in positive direction - should return early since direction is locked to backward
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 300 } });

			// This should flip backward (delta = 100 - 300 = -200, which is backward for LTR)
			expect(spy).toHaveBeenCalled();
		});

		it("should return early when book is closed on backward drag", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			const spy = vi.spyOn(leaf, "efficientFlipToPosition");

			setFlipBookInternals(flipBook, {
				flipDirection: FlipDirection.Backward,
				flipStartingPos: 100,
			});
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 200 } });

			expect(spy).not.toHaveBeenCalled();
		});

		it("should reset when drag end without current leaf", async () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			setFlipBookInternals(flipBook, { flipDirection: FlipDirection.Forward, flipStartingPos: 50 });

			await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 0 });

			const internals = getFlipBookInternals(flipBook);
			expect(internals.flipDirection).toBe(FlipDirection.None);
			expect(internals.flipStartingPos).toBe(0);
		});

		it("should complete forward flip on drag end", async () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			vi.spyOn(leaf, "flipToPosition").mockResolvedValue(undefined);
			setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Forward });

			await getFlipBookInternals(flipBook).onDragEnd({ velocityX: -1 });

			expect(leaf.flipToPosition).toHaveBeenCalledWith(1);
			expect(getFlipBookInternals(flipBook).currentLeaf).toBeUndefined();
		});

		it("should complete backward flip on drag end", async () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			leaf.flipPosition = 1;
			vi.spyOn(leaf, "flipToPosition").mockResolvedValue(undefined);
			setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Backward });

			await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 1 });

			expect(leaf.flipToPosition).toHaveBeenCalledWith(0);
			expect(getFlipBookInternals(flipBook).currentLeaf).toBeUndefined();
		});

		it("should choose flipTo=0 for slow forward drag", async () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			leaf.flipPosition = 0.2;
			vi.spyOn(leaf, "flipToPosition").mockResolvedValue(undefined);
			setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Forward });

			await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 0 });

			expect(leaf.flipToPosition).toHaveBeenCalledWith(0);
		});

		it("should choose flipTo=1 for slow backward drag", async () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			leaf.flipPosition = 0.8;
			vi.spyOn(leaf, "flipToPosition").mockResolvedValue(undefined);
			setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Backward });

			await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 0 });

			expect(leaf.flipToPosition).toHaveBeenCalledWith(1);
		});

		it("should respect RTL forward velocity threshold", async () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4, direction: "rtl" });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			vi.spyOn(leaf, "flipToPosition").mockResolvedValue(undefined);
			setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Forward });

			await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 1 });

			expect(leaf.flipToPosition).toHaveBeenCalledWith(1);
		});

		it("should respect RTL backward velocity threshold", async () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4, direction: "rtl" });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			leaf.flipPosition = 0.2;
			vi.spyOn(leaf, "flipToPosition").mockResolvedValue(undefined);
			setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.Backward });

			await getFlipBookInternals(flipBook).onDragEnd({ velocityX: -1 });

			expect(leaf.flipToPosition).toHaveBeenCalledWith(0);
		});

		it("should return on drag end when direction is none", async () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			const spy = vi.spyOn(leaf, "flipToPosition");

			setFlipBookInternals(flipBook, { currentLeaf: leaf, flipDirection: FlipDirection.None });

			await getFlipBookInternals(flipBook).onDragEnd({ velocityX: 0 });

			expect(spy).not.toHaveBeenCalled();
		});
	});

	describe("leavesBuffer", () => {
		it("should accept leavesBuffer option", () => {
			const flipBook = new FlipBook({ pagesCount: 20, leavesBuffer: 3 });
			expect(flipBook).toBeDefined();
		});

		it("should render all leaves visible when leavesBuffer is undefined", () => {
			const pages = createPages(20);
			const flipBook = new FlipBook({ pagesCount: 20 });
			flipBook.render(".flipbook-container");

			// All pages should be visible (display is not 'none')
			pages.forEach((page) => {
				expect(page.style.display).not.toBe("none");
			});
		});

		it("should hide leaves outside buffer range on initial render", () => {
			const pages = createPages(20); // 10 leaves
			const flipBook = new FlipBook({ pagesCount: 20, leavesBuffer: 2 });
			flipBook.render(".flipbook-container");

			// With buffer=2 starting at leaf 0, leaves 0,1,2 should be visible (buffer after)
			// Leaves 3-9 should be hidden
			// Leaf 0 = pages 0,1; Leaf 1 = pages 2,3; Leaf 2 = pages 4,5
			expect(pages[0].style.display).not.toBe("none"); // leaf 0
			expect(pages[1].style.display).not.toBe("none"); // leaf 0
			expect(pages[2].style.display).not.toBe("none"); // leaf 1
			expect(pages[3].style.display).not.toBe("none"); // leaf 1
			expect(pages[4].style.display).not.toBe("none"); // leaf 2
			expect(pages[5].style.display).not.toBe("none"); // leaf 2
			expect(pages[6].style.display).toBe("none"); // leaf 3 - outside buffer
			expect(pages[7].style.display).toBe("none"); // leaf 3 - outside buffer
		});

		it("should show leaves within buffer on both sides when starting in middle", () => {
			const pages = createPages(20); // 10 leaves
			const flipBook = new FlipBook({
				pagesCount: 20,
				leavesBuffer: 2,
				initialTurnedLeaves: [0, 1, 2, 3, 4], // Start at leaf 5
			});
			flipBook.render(".flipbook-container");

			// Current position is after leaf 4, so leaves 3,4,5,6,7 should be visible
			// Leaves 0,1,2 and 8,9 should be hidden
			expect(pages[0].style.display).toBe("none"); // leaf 0 - outside buffer
			expect(pages[1].style.display).toBe("none"); // leaf 0 - outside buffer
			expect(pages[4].style.display).toBe("none"); // leaf 2 - outside buffer
			expect(pages[5].style.display).toBe("none"); // leaf 2 - outside buffer
			expect(pages[6].style.display).not.toBe("none"); // leaf 3 - within buffer
			expect(pages[7].style.display).not.toBe("none"); // leaf 3 - within buffer
			expect(pages[8].style.display).not.toBe("none"); // leaf 4 - within buffer
			expect(pages[9].style.display).not.toBe("none"); // leaf 4 - within buffer
			expect(pages[10].style.display).not.toBe("none"); // leaf 5 - current
			expect(pages[11].style.display).not.toBe("none"); // leaf 5 - current
			expect(pages[12].style.display).not.toBe("none"); // leaf 6 - within buffer
			expect(pages[13].style.display).not.toBe("none"); // leaf 6 - within buffer
			expect(pages[14].style.display).not.toBe("none"); // leaf 7 - within buffer
			expect(pages[15].style.display).not.toBe("none"); // leaf 7 - within buffer
			expect(pages[16].style.display).toBe("none"); // leaf 8 - outside buffer
			expect(pages[17].style.display).toBe("none"); // leaf 8 - outside buffer
		});

		it("should clamp buffer to available leaves at start of book", () => {
			const pages = createPages(20); // 10 leaves
			const flipBook = new FlipBook({ pagesCount: 20, leavesBuffer: 5 });
			flipBook.render(".flipbook-container");

			// At start (leaf 0), buffer of 5 means leaves 0-5 should be visible
			// No leaves before 0, so just 0-5 after
			for (let i = 0; i < 12; i++) {
				// leaves 0-5 = pages 0-11
				expect(pages[i].style.display).not.toBe("none");
			}
			// Leaves 6-9 should be hidden
			for (let i = 12; i < 20; i++) {
				expect(pages[i].style.display).toBe("none");
			}
		});

		it("should clamp buffer to available leaves at end of book", () => {
			const pages = createPages(20); // 10 leaves
			const flipBook = new FlipBook({
				pagesCount: 20,
				leavesBuffer: 5,
				initialTurnedLeaves: [0, 1, 2, 3, 4, 5, 6, 7, 8], // All but last turned
			});
			flipBook.render(".flipbook-container");

			// At end (leaf 9), buffer of 5 means leaves 4-9 should be visible
			// Leaves 0-3 should be hidden
			for (let i = 0; i < 8; i++) {
				// leaves 0-3 = pages 0-7
				expect(pages[i].style.display).toBe("none");
			}
			// Leaves 4-9 should be visible
			for (let i = 8; i < 20; i++) {
				expect(pages[i].style.display).not.toBe("none");
			}
		});

		it("should update buffer when flipping forward", async () => {
			const pages = createPages(20); // 10 leaves
			const flipBook = new FlipBook({ pagesCount: 20, leavesBuffer: 2 });
			flipBook.render(".flipbook-container");

			// Initially at leaf 0, leaves 0-2 visible
			expect(pages[6].style.display).toBe("none"); // leaf 3 hidden

			// Flip forward - simulate completing a flip
			const leaf = getFlipBookInternals(flipBook).leaves[0];
			await leaf.flipToPosition(1);

			// Now at leaf 1, leaves 0-3 should be visible (buffer around new position)
			// Actually: current is between leaf 0 (turned) and leaf 1
			// Buffer should now show leaves around the new current position
			expect(pages[6].style.display).not.toBe("none"); // leaf 3 now visible
		});

		it("should update buffer when flipping backward", async () => {
			const pages = createPages(20); // 10 leaves
			const flipBook = new FlipBook({
				pagesCount: 20,
				leavesBuffer: 2,
				initialTurnedLeaves: [0, 1, 2, 3, 4], // Start at middle
			});
			flipBook.render(".flipbook-container");

			// At leaf 5, leaves 3-7 visible, 0-2 and 8-9 hidden
			expect(pages[0].style.display).toBe("none"); // leaf 0 hidden

			// Flip backward - simulate completing a backward flip
			const leaf = getFlipBookInternals(flipBook).leaves[4];
			await leaf.flipToPosition(0);

			// Now buffer should have shifted back
			// Leaf 4 is now not turned, so current is between 3 and 4
			expect(pages[4].style.display).not.toBe("none"); // leaf 2 now visible
		});

		it("should handle buffer size larger than total leaves", () => {
			const pages = createPages(6); // 3 leaves
			const flipBook = new FlipBook({ pagesCount: 6, leavesBuffer: 10 });
			flipBook.render(".flipbook-container");

			// All leaves should be visible since buffer exceeds total
			pages.forEach((page) => {
				expect(page.style.display).not.toBe("none");
			});
		});

		it("should handle buffer size of 0", () => {
			const pages = createPages(20);
			const flipBook = new FlipBook({ pagesCount: 20, leavesBuffer: 0 });
			flipBook.render(".flipbook-container");

			// Only the current leaf (leaf 0) should be visible
			expect(pages[0].style.display).not.toBe("none"); // leaf 0
			expect(pages[1].style.display).not.toBe("none"); // leaf 0
			expect(pages[2].style.display).toBe("none"); // leaf 1 - outside buffer
		});
	});

	describe("navigation properties", () => {
		it("currentPageIndex returns 0 initially", () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			expect(flipBook.currentPageIndex).toBe(0);
		});

		it("currentPageIndex reflects initialTurnedLeaves", () => {
			createPages(10);
			const flipBook = new FlipBook({
				pagesCount: 10,
				initialTurnedLeaves: [0, 1],
			});
			flipBook.render(".flipbook-container");

			expect(flipBook.currentPageIndex).toBe(4); // leaf 2, page 4
		});

		it("totalPages returns correct count", () => {
			createPages(8);
			const flipBook = new FlipBook({ pagesCount: 8 });
			flipBook.render(".flipbook-container");

			expect(flipBook.totalPages).toBe(8);
		});

		it("isFirstPage is true initially", () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			expect(flipBook.isFirstPage).toBe(true);
		});

		it("isFirstPage is false when not at first page", () => {
			createPages(6);
			const flipBook = new FlipBook({
				pagesCount: 6,
				initialTurnedLeaves: [0],
			});
			flipBook.render(".flipbook-container");

			expect(flipBook.isFirstPage).toBe(false);
		});

		it("isLastPage is false initially", () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			expect(flipBook.isLastPage).toBe(false);
		});

		it("isLastPage is true when at last page", () => {
			createPages(6); // 3 leaves
			const flipBook = new FlipBook({
				pagesCount: 6,
				initialTurnedLeaves: [0, 1, 2], // all turned
			});
			flipBook.render(".flipbook-container");

			expect(flipBook.isLastPage).toBe(true);
		});
	});

	describe("flipNext", () => {
		it("flips to the next leaf", async () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			expect(flipBook.currentPageIndex).toBe(0);

			await flipBook.flipNext();
			// Wait for event loop to process callbacks
			await new Promise((resolve) => setTimeout(resolve, 50));

			// After flipping leaf 0, visible pages are [1, 2] (back of leaf 0, front of leaf 1)
			expect(flipBook.currentPageIndex).toBe(1);
		});

		it("does nothing when at last page", async () => {
			createPages(6);
			const flipBook = new FlipBook({
				pagesCount: 6,
				initialTurnedLeaves: [0, 1, 2],
			});
			flipBook.render(".flipbook-container");

			const initialPage = flipBook.currentPageIndex;
			await flipBook.flipNext();

			expect(flipBook.currentPageIndex).toBe(initialPage);
		});

		it("flips multiple times correctly", async () => {
			createPages(8);
			const flipBook = new FlipBook({ pagesCount: 8 });
			flipBook.render(".flipbook-container");

			expect(flipBook.currentPageIndex).toBe(0);

			await flipBook.flipNext();
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(flipBook.currentPageIndex).toBe(1); // [1, 2]

			await flipBook.flipNext();
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(flipBook.currentPageIndex).toBe(3); // [3, 4]

			await flipBook.flipNext();
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(flipBook.currentPageIndex).toBe(5); // [5, 6]
		});
	});

	describe("flipPrev", () => {
		it("flips to the previous leaf", async () => {
			createPages(6);
			const flipBook = new FlipBook({
				pagesCount: 6,
				initialTurnedLeaves: [0],
			});
			flipBook.render(".flipbook-container");

			expect(flipBook.currentPageIndex).toBe(2);

			await flipBook.flipPrev();

			expect(flipBook.currentPageIndex).toBe(0);
		});

		it("does nothing when at first page", async () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			expect(flipBook.currentPageIndex).toBe(0);

			await flipBook.flipPrev();

			expect(flipBook.currentPageIndex).toBe(0);
		});
	});

	describe("flipNext and flipPrev race conditions", () => {
		it("blocks flipPrev during active flipNext auto-flip", async () => {
			createPages(6);
			const flipBook = new FlipBook({
				pagesCount: 6,
				initialTurnedLeaves: [0], // Start with leaf 0 turned (showing pages 1, 2)
			});
			flipBook.render(".flipbook-container");

			const internals = getFlipBookInternals(flipBook);

			// Start flipNext (should flip leaf 1 forward to show pages 3, 4)
			const nextPromise = flipBook.flipNext();

			// During the flip, call flipPrev - should be blocked
			const prevPromise = flipBook.flipPrev();

			// Wait for both to complete
			await Promise.all([nextPromise, prevPromise]);

			// flipNext should have completed, flipPrev should have been blocked
			// So we should be at page 3 (after flipping leaf 1), not back at page 0
			expect(flipBook.currentPageIndex).toBe(3);
			// Leaf 0 and 1 should be turned, leaf 2 should not
			expect(internals.leaves[0].isTurned).toBe(true);
			expect(internals.leaves[1].isTurned).toBe(true);
			expect(internals.leaves[2].isTurned).toBe(false);
		});

		it("does not flip two different leaves simultaneously in opposite directions", async () => {
			createPages(6);
			const flipBook = new FlipBook({
				pagesCount: 6,
				initialTurnedLeaves: [0, 1, 2], // All turned - at last page
			});
			flipBook.render(".flipbook-container");

			// Go back one page
			await flipBook.flipPrev();
			// Now at pages 4, 5 with leaf 2 not turned

			// Start flipNext (flipping leaf 2 forward)
			const nextPromise = flipBook.flipNext();

			// Immediately try flipPrev - should be blocked (leaf 1 should NOT start flipping back)
			const prevPromise = flipBook.flipPrev();

			await Promise.all([nextPromise, prevPromise]);

			// The book should be in a consistent state
			// If flipNext completed, we should be at page 5 (last page, closed reversed)
			// If flipPrev was blocked correctly, only the flipNext should have taken effect
			expect(flipBook.isLastPage).toBe(true);
		});
	});

	describe("flipToPage", () => {
		it("navigates forward to target page", async () => {
			createPages(10);
			const flipBook = new FlipBook({ pagesCount: 10 });
			flipBook.render(".flipbook-container");

			// flipToPage uses leaf-based navigation, so going to page 6 means going to leaf 3
			// After flipping leaves 0, 1, 2, visible pages are [5, 6]
			await flipBook.flipToPage(6);
			// Wait for event loop to process callbacks
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(flipBook.currentPageIndex).toBe(5);
		});

		it("navigates backward to target page", async () => {
			createPages(10);
			const flipBook = new FlipBook({
				pagesCount: 10,
				initialTurnedLeaves: [0, 1, 2, 3],
			});
			flipBook.render(".flipbook-container");

			// Starting at page 8, go to page 2 (leaf 1)
			// After unflipping leaves 3, 2, visible pages should be [1, 2]
			await flipBook.flipToPage(2);
			// Wait for event loop to process callbacks
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(flipBook.currentPageIndex).toBe(1);
		});

		it("logs warning for invalid page index", async () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			await flipBook.flipToPage(-1);
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid page index"));

			await flipBook.flipToPage(10);
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid page index"));
		});
	});

	describe("jumpToPage", () => {
		it("instantly jumps to target page", () => {
			createPages(10);
			const flipBook = new FlipBook({ pagesCount: 10 });
			flipBook.render(".flipbook-container");

			// jumpToPage(6): lastTurnedLeaf = floor((6-1)/2) = 2, visible = [5, 6]
			flipBook.jumpToPage(6);

			expect(flipBook.currentPageIndex).toBe(5);
		});

		it("updates current-page classes", () => {
			const pages = createPages(10);
			const flipBook = new FlipBook({ pagesCount: 10 });
			flipBook.render(".flipbook-container");

			// jumpToPage(4): lastTurnedLeaf = floor((4-1)/2) = 1, visible = [3, 4]
			flipBook.jumpToPage(4);

			expect(pages[3].classList.contains("current-page")).toBe(true);
			expect(pages[4].classList.contains("current-page")).toBe(true);
			expect(pages[0].classList.contains("current-page")).toBe(false);
		});

		it("calls onPageChanged callback", () => {
			const onPageChanged = vi.fn();
			createPages(10);
			const flipBook = new FlipBook({ pagesCount: 10, onPageChanged });
			flipBook.render(".flipbook-container");

			// jumpToPage(6): visible = [5, 6], currentPageIndex = 5
			flipBook.jumpToPage(6);

			expect(onPageChanged).toHaveBeenCalledWith(5);
		});

		it("logs warning for invalid page index", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			flipBook.jumpToPage(-1);
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid page index"));

			flipBook.jumpToPage(10);
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid page index"));
		});

		it("jumps to the last page and closes the book reversed", () => {
			const pages = createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			flipBook.jumpToPage(5); // Last page (index 5)

			// Book should show only the last page (closed reversed)
			expect(flipBook.currentPageIndex).toBe(5);
			expect(flipBook.isLastPage).toBe(true);
			expect(pages[5].classList.contains("current-page")).toBe(true);
			// All leaves should be turned
			const internals = getFlipBookInternals(flipBook);
			for (const leaf of internals.leaves) {
				expect(leaf.isTurned).toBe(true);
			}
		});

		it("does not jump to one-before-last when targeting last page", () => {
			const pages = createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			flipBook.jumpToPage(5); // Last page (index 5)

			// Should NOT show page 4 as the current page
			expect(flipBook.currentPageIndex).not.toBe(4);
			// Should NOT have page 4 visible without page 5
			expect(pages[4].classList.contains("current-page")).toBe(false);
		});

		it("jumpToPage with odd page index shows correct spread (off-by-one regression)", () => {
			// Mirrors the Hebrew perek book layout: 56 pages total
			// Page 0 = front cover, pages 1-54 = perek content/blank pairs, page 55 = back cover
			const pages = createPages(56);
			const flipBook = new FlipBook({ pagesCount: 56 });
			flipBook.render(".flipbook-container");

			// Jump to page 47 (= perek 24 content, which is an odd page)
			// The visible spread after turning leaf 23 is [47, 48]:
			//   - page 47 (back of turned leaf 23) = perek 24 content
			//   - page 48 (front of leaf 24) = perek 24 blank
			flipBook.jumpToPage(47);

			// currentPageIndex should be 47 (first page of the visible spread)
			expect(flipBook.currentPageIndex).toBe(47);
			// Both pages of the spread should be visible
			expect(pages[47].classList.contains("current-page")).toBe(true);
			expect(pages[48].classList.contains("current-page")).toBe(true);
			// The adjacent pages should NOT be visible
			expect(pages[45].classList.contains("current-page")).toBe(false);
			expect(pages[46].classList.contains("current-page")).toBe(false);
			expect(pages[49].classList.contains("current-page")).toBe(false);
		});

		it("jumpToPage with even page index shows the spread containing that page", () => {
			const pages = createPages(56);
			const flipBook = new FlipBook({ pagesCount: 56 });
			flipBook.render(".flipbook-container");

			// Jump to page 46 (= perek 23 blank, even page)
			// lastTurnedLeaf = floor((46-1)/2) = 22, visible = [45, 46]
			flipBook.jumpToPage(46);

			// Page 46 is the second page of the spread [45, 46]
			expect(flipBook.currentPageIndex).toBe(45);
			expect(pages[45].classList.contains("current-page")).toBe(true);
			expect(pages[46].classList.contains("current-page")).toBe(true);
			// Pages from adjacent spreads should not be visible
			expect(pages[44].classList.contains("current-page")).toBe(false);
			expect(pages[47].classList.contains("current-page")).toBe(false);
		});

		it.each([
			// jumpToPage(P): lastTurnedLeaf = floor((P-1)/2), visible = [2k+1, 2k+2] where k=lastTurnedLeaf
			{ targetPage: 1, expectedFirst: 1, description: "page 1 (perek 1)" },
			{
				targetPage: 2,
				expectedFirst: 1,
				description: "page 2 (perek 1 blank, same spread as page 1)",
			},
			{ targetPage: 3, expectedFirst: 3, description: "page 3 (perek 2)" },
			{
				targetPage: 4,
				expectedFirst: 3,
				description: "page 4 (perek 2 blank, same spread as page 3)",
			},
			{ targetPage: 45, expectedFirst: 45, description: "page 45 (perek 23)" },
			{
				targetPage: 46,
				expectedFirst: 45,
				description: "page 46 (perek 23 blank, same spread as page 45)",
			},
			{ targetPage: 47, expectedFirst: 47, description: "page 47 (perek 24)" },
			{
				targetPage: 48,
				expectedFirst: 47,
				description: "page 48 (perek 24 blank, same spread as page 47)",
			},
			{ targetPage: 53, expectedFirst: 53, description: "page 53 (perek 27)" },
		])("jumpToPage($targetPage) for $description → currentPageIndex = $expectedFirst", ({
			targetPage,
			expectedFirst,
		}) => {
			createPages(56);
			const flipBook = new FlipBook({ pagesCount: 56 });
			flipBook.render(".flipbook-container");

			flipBook.jumpToPage(targetPage);

			expect(flipBook.currentPageIndex).toBe(expectedFirst);
		});
	});

	describe("hover shadow", () => {
		/** Helper to get book element with assertion - safe after render() is called */
		function getBookElement(flipBook: FlipBook): HTMLElement {
			expect(flipBook.bookElement).toBeDefined();
			// biome-ignore lint/style/noNonNullAssertion: assertion above ensures defined
			return flipBook.bookElement!;
		}

		it("shows hover shadow when hovering right edge in LTR mode", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const bookElement = getBookElement(flipBook);

			// Mock getBoundingClientRect
			bookElement.getBoundingClientRect = vi.fn().mockReturnValue({
				left: 0,
				width: 800,
				right: 800,
				top: 0,
				bottom: 600,
				height: 600,
			});

			// Simulate mouse move to right edge (within 18% of width = 144px from right)
			const event = new MouseEvent("mousemove", {
				clientX: 750, // 50px from right edge, within edge zone
				clientY: 300,
				bubbles: true,
			});
			bookElement.dispatchEvent(event);

			// Check that leaf has hover shadow applied
			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			// Hover shadow should be set on the first leaf (forward flip direction)
			expect(leaf.pages[0]?.style.getPropertyValue("--inner-shadow-shadow")).not.toBe("0.000");
		});

		it("shows hover shadow when hovering left edge in LTR mode after flipping", async () => {
			vi.useFakeTimers();
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			// Flip to page 2 so backward flip is available
			flipBook.flipNext();
			await vi.runAllTimersAsync();

			const bookElement = getBookElement(flipBook);
			bookElement.getBoundingClientRect = vi.fn().mockReturnValue({
				left: 0,
				width: 800,
				right: 800,
				top: 0,
				bottom: 600,
				height: 600,
			});

			// Simulate mouse move to left edge
			const event = new MouseEvent("mousemove", {
				clientX: 50, // 50px from left edge, within edge zone
				clientY: 300,
				bubbles: true,
			});
			bookElement.dispatchEvent(event);

			// Check that leaf has hover shadow applied
			const internals = getFlipBookInternals(flipBook);
			const turnedLeaf = internals.leaves[0];
			expect(turnedLeaf.pages[0]?.style.getPropertyValue("--inner-shadow-shadow")).not.toBe(
				"0.000",
			);

			vi.useRealTimers();
		});

		it("clears hover shadow when not in edge zone", async () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const bookElement = getBookElement(flipBook);
			bookElement.getBoundingClientRect = vi.fn().mockReturnValue({
				left: 0,
				width: 800,
				right: 800,
				top: 0,
				bottom: 600,
				height: 600,
			});

			// First hover near edge to set shadow
			bookElement.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: 750,
					clientY: 300,
					bubbles: true,
				}),
			);

			// Wait for throttle
			await new Promise((resolve) => setTimeout(resolve, 20));

			// Then move to center (outside edge zones)
			bookElement.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: 400, // center, outside both edge zones
					clientY: 300,
					bubbles: true,
				}),
			);

			// Wait for throttle
			await new Promise((resolve) => setTimeout(resolve, 20));

			// Shadow should be cleared (back to 0)
			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			expect(leaf.pages[0]?.style.getPropertyValue("--inner-shadow-shadow")).toBe("0.000");
		});

		it("clears hover shadow on mouse leave", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const bookElement = getBookElement(flipBook);
			bookElement.getBoundingClientRect = vi.fn().mockReturnValue({
				left: 0,
				width: 800,
				right: 800,
				top: 0,
				bottom: 600,
				height: 600,
			});

			// First hover near edge to set shadow
			bookElement.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: 750,
					clientY: 300,
					bubbles: true,
				}),
			);

			// Then leave the book element
			bookElement.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

			// Shadow should be cleared
			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			expect(leaf.pages[0]?.style.getPropertyValue("--inner-shadow-shadow")).toBe("0.000");
		});

		it("does not show hover shadow when dragging", async () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const bookElement = getBookElement(flipBook);
			bookElement.getBoundingClientRect = vi.fn().mockReturnValue({
				left: 0,
				width: 800,
				right: 800,
				top: 0,
				bottom: 600,
				height: 600,
			});

			// Simulate drag start
			const internals = getFlipBookInternals(flipBook);
			internals.onDragStart({ center: { x: 750 } });

			// Wait for any pending events
			await new Promise((resolve) => setTimeout(resolve, 20));

			// Try to trigger hover shadow
			bookElement.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: 750,
					clientY: 300,
					bubbles: true,
				}),
			);

			// Wait for throttle
			await new Promise((resolve) => setTimeout(resolve, 20));

			// Shadow should still be 0 since drag clears it
			const leaf = internals.leaves[0];
			const shadowValue = leaf.pages[0]?.style.getPropertyValue("--inner-shadow-shadow");
			// Either empty (never set) or "0.000" (cleared by drag) is acceptable
			expect(shadowValue === "" || shadowValue === "0.000").toBe(true);
		});

		it("calculates correct hover strength based on distance from edge", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const bookElement = getBookElement(flipBook);
			bookElement.getBoundingClientRect = vi.fn().mockReturnValue({
				left: 0,
				width: 800,
				right: 800,
				top: 0,
				bottom: 600,
				height: 600,
			});

			// At the very edge (x=800), hover strength should be max
			bookElement.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: 800, // at edge
					clientY: 300,
					bubbles: true,
				}),
			);

			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			const shadowValue = Number.parseFloat(
				leaf.pages[0]?.style.getPropertyValue("--inner-shadow-shadow") || "0",
			);

			// Should have shadow (exact value depends on HOVER_STRENGTH_MAX * 1.1)
			expect(shadowValue).toBeGreaterThan(0);
		});

		it("shows correct edge hover for RTL mode", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4, isRTL: true });
			flipBook.render(".flipbook-container");

			const bookElement = getBookElement(flipBook);
			bookElement.getBoundingClientRect = vi.fn().mockReturnValue({
				left: 0,
				width: 800,
				right: 800,
				top: 0,
				bottom: 600,
				height: 600,
			});

			// In RTL, left edge should trigger forward flip (opposite of LTR)
			bookElement.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: 50, // left edge in RTL = forward
					clientY: 300,
					bubbles: true,
				}),
			);

			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			expect(leaf.pages[0]?.style.getPropertyValue("--inner-shadow-shadow")).not.toBe("0.000");
		});

		it("ignores mouse events when book element has zero width", async () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const bookElement = getBookElement(flipBook);
			bookElement.getBoundingClientRect = vi.fn().mockReturnValue({
				left: 0,
				width: 0, // zero width
				right: 0,
				top: 0,
				bottom: 0,
				height: 0,
			});

			// This should not throw or set any shadow
			bookElement.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: 0,
					clientY: 0,
					bubbles: true,
				}),
			);

			// Wait for throttle
			await new Promise((resolve) => setTimeout(resolve, 20));

			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			const shadowValue = leaf.pages[0]?.style.getPropertyValue("--inner-shadow-shadow");
			// Either empty (never set because guard early-returned) or "0.000" is acceptable
			expect(shadowValue === "" || shadowValue === "0.000").toBe(true);
		});
	});

	describe("click suppression after drag", () => {
		it("should suppress click events on child elements after a drag gesture", () => {
			const pages = createPages(6);
			// Add a button inside page 2 (simulates a TOC entry or any interactive element)
			const button = document.createElement("button");
			button.textContent = "Chapter 1";
			pages[2].appendChild(button);

			const buttonClickSpy = vi.fn();
			button.addEventListener("click", buttonClickSpy);

			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");
			const internals = getFlipBookInternals(flipBook);

			// Simulate a full drag gesture: panstart → panmove → panend
			internals.onDragStart(createDragEvent("start", { x: 500 }));
			internals.onDragUpdate(createDragEvent("move", { x: 350 }));
			internals.onDragEnd(createDragEvent("end", { velocityX: -0.5 }));

			// After panend, the browser would fire a click on the button
			button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

			// The click should have been suppressed
			expect(buttonClickSpy).not.toHaveBeenCalled();

			flipBook.destroy();
		});

		it("should allow click events when no drag occurred", () => {
			const pages = createPages(6);
			const button = document.createElement("button");
			button.textContent = "Chapter 1";
			pages[2].appendChild(button);

			const buttonClickSpy = vi.fn();
			button.addEventListener("click", buttonClickSpy);

			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			// No drag — just a normal click on the button
			button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

			expect(buttonClickSpy).toHaveBeenCalledTimes(1);

			flipBook.destroy();
		});

		it("should only suppress one click after drag, allowing subsequent clicks", () => {
			const pages = createPages(6);
			const button = document.createElement("button");
			button.textContent = "Chapter 1";
			pages[2].appendChild(button);

			const buttonClickSpy = vi.fn();
			button.addEventListener("click", buttonClickSpy);

			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");
			const internals = getFlipBookInternals(flipBook);

			// Drag gesture
			internals.onDragStart(createDragEvent("start", { x: 500 }));
			internals.onDragUpdate(createDragEvent("move", { x: 350 }));
			internals.onDragEnd(createDragEvent("end", { velocityX: -0.5 }));

			// First click — should be suppressed
			button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			expect(buttonClickSpy).not.toHaveBeenCalled();

			// Second click (no drag) — should go through
			button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			expect(buttonClickSpy).toHaveBeenCalledTimes(1);

			flipBook.destroy();
		});
	});

	describe("resize re-layout", () => {
		let resizeCallback: (() => void) | undefined;
		let observedElement: Element | undefined;
		let disconnected: boolean;

		beforeEach(() => {
			resizeCallback = undefined;
			observedElement = undefined;
			disconnected = false;

			// Provide a mock ResizeObserver so the FlipBook can observe container size changes
			globalThis.ResizeObserver = class MockResizeObserver {
				constructor(cb: ResizeObserverCallback) {
					// Store the callback so we can trigger it manually
					resizeCallback = () => cb([], this as unknown as ResizeObserver);
				}
				observe(el: Element) {
					observedElement = el;
				}
				unobserve() {}
				disconnect() {
					disconnected = true;
				}
			} as unknown as typeof ResizeObserver;
		});

		afterEach(() => {
			(globalThis as Record<string, unknown>).ResizeObserver = undefined;
		});

		it("should observe the book element for resize", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			expect(observedElement).toBe(container);
			flipBook.destroy();
		});

		it("should disconnect the observer on destroy", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			flipBook.destroy();

			expect(disconnected).toBe(true);
		});

		it("should recalculate page sizes when container resizes", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			// Grab initial page width
			const page = container.querySelector(".page") as HTMLElement;
			const initialWidth = page.style.width;

			// Resize the container to a larger size
			Object.defineProperty(container, "clientWidth", { value: 1200, configurable: true });
			Object.defineProperty(container, "clientHeight", { value: 900, configurable: true });

			// Trigger the resize observer callback
			expect(resizeCallback).toBeDefined();
			resizeCallback?.();

			// Page dimensions should have changed
			expect(page.style.width).not.toBe(initialWidth);

			flipBook.destroy();
		});

		it("should update perspective on resize", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			// The book element gets a CSS class "flipbook" and is the container itself
			const bookEl = container;
			const initialPerspective = bookEl.style.perspective;

			// Resize
			Object.defineProperty(container, "clientWidth", { value: 1600, configurable: true });
			Object.defineProperty(container, "clientHeight", { value: 1200, configurable: true });
			resizeCallback?.();

			expect(bookEl.style.perspective).not.toBe(initialPerspective);

			flipBook.destroy();
		});
	});
});
