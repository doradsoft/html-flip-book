import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlipDirection } from "../flip-direction";
import { FlipBook } from "../flipbook";
import { createDragEvent, getFlipBookInternals, setFlipBookInternals } from "./test-utils";

// Mock HammerJS - must be hoisted
vi.mock("hammerjs", () => {
	// Create a proper constructor function for Hammer
	function MockHammer(_element: HTMLElement, options?: { touchAction: string }) {
		return {
			options,
			on: vi.fn(),
			off: vi.fn(),
			destroy: vi.fn(),
			get: vi.fn(() => ({ set: vi.fn() })),
		};
	}
	MockHammer.DIRECTION_HORIZONTAL = 6;
	MockHammer.DIRECTION_ALL = 30;
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

	describe("native content dragging", () => {
		function renderContent(kind: "image" | "link" | "linked-image") {
			const pages = createPages(4);
			const book = new FlipBook({ pagesCount: 4 });
			book.render(".flipbook-container");
			const content = document.createElement(kind === "image" ? "img" : "a");
			const target = kind === "linked-image" ? document.createElement("img") : content;
			if (kind !== "image") content.setAttribute("href", "#example");
			if (target !== content) content.append(target);
			pages[0].append(content);
			return { book, content, target };
		}

		function startNativeDrag(target: HTMLElement) {
			const event = new Event("dragstart", { bubbles: true, cancelable: true });
			target.dispatchEvent(event);
			return event;
		}

		it.each(["image", "link", "linked-image"] as const)(
			"cancels native %s dragging in default turn mode",
			(kind) => {
				const { book, target } = renderContent(kind);
				expect(startNativeDrag(target).defaultPrevented).toBe(true);
				book.destroy();
			},
		);

		it.each(["image", "link", "linked-image"] as const)(
			"preserves native %s dragging in selection mode",
			(kind) => {
				const { book, target } = renderContent(kind);
				book.setMouseMode("select");
				expect(startNativeDrag(target).defaultPrevented).toBe(false);
				book.setMouseMode("turn");
				expect(startNativeDrag(target).defaultPrevented).toBe(true);
				book.destroy();
			},
		);

		it.each(["image", "link", "linked-image"] as const)(
			"preserves native %s dragging inside an excluded ancestor",
			(kind) => {
				const { book, content, target } = renderContent(kind);
				const excluded = document.createElement("div");
				excluded.dataset.flipbookNoFlip = "";
				content.replaceWith(excluded);
				excluded.append(content);
				expect(startNativeDrag(target).defaultPrevented).toBe(false);
				book.destroy();
			},
		);

		it("cancels the drag before a child stops event propagation", () => {
			const { book, target } = renderContent("linked-image");
			target.addEventListener("dragstart", (event) => event.stopPropagation());
			expect(startNativeDrag(target).defaultPrevented).toBe(true);
			book.destroy();
		});

		it("keeps ordinary clicks and explicit draggable attributes intact", () => {
			const { book, target } = renderContent("link");
			target.draggable = true;
			const click = new MouseEvent("click", { bubbles: true, cancelable: true });
			target.dispatchEvent(click);
			expect(click.defaultPrevented).toBe(false);
			expect(startNativeDrag(target).defaultPrevented).toBe(true);
			expect(target.draggable).toBe(true);
			book.destroy();
		});

		it("does not cancel drags outside pages or after destroy", () => {
			const { book, target } = renderContent("image");
			const outside = document.createElement("img");
			container.append(outside);
			expect(startNativeDrag(outside).defaultPrevented).toBe(false);
			book.destroy();
			expect(startNativeDrag(target).defaultPrevented).toBe(false);
		});
	});

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
		it("accepts an owned element instead of a selector", () => {
			createPages(4);
			const book = new FlipBook({ pagesCount: 4 });
			try {
				book.render(container);
				expect(container.classList.contains("flipbook")).toBe(true);
			} finally {
				book.destroy();
			}
		});

		it("preserves SPA framework history state on initial and later page routes", () => {
			createPages(6);
			const originalState = window.history.state;
			const originalUrl = window.location.href;
			const frameworkState = {
				__NA: true,
				__PRIVATE_NEXTJS_INTERNALS_TREE: ["book"],
				custom: "keep me",
			};
			History.prototype.replaceState.call(window.history, frameworkState, "", "/book/start");
			const book = new FlipBook({
				pagesCount: 6,
				historyMapper: {
					pageToRoute: (pageIndex) => `/book/${pageIndex}`,
					routeToPage: (route) => Number(route.split("/").at(-1)),
				},
			});
			try {
				book.render(".flipbook-container");
				expect(window.history.state).toMatchObject({ ...frameworkState, route: "/book/0" });
				book.jumpToPage(3);
				expect(window.history.state).toMatchObject({ ...frameworkState, route: "/book/3" });
			} finally {
				book.destroy();
				History.prototype.replaceState.call(window.history, originalState, "", originalUrl);
			}
		});

		it("restores a router-selected page without adding a history entry", () => {
			createPages(6);
			const originalState = window.history.state;
			const originalUrl = window.location.href;
			const onPageChanged = vi.fn();
			const book = new FlipBook({
				pagesCount: 6,
				onPageChanged,
				historyMapper: {
					pageToRoute: (pageIndex) => `/book/${pageIndex}`,
					routeToPage: (route) => Number(route.split("/").at(-1)),
				},
			});
			try {
				book.render(".flipbook-container");
				const originalBookState = window.history.state;
				book.restorePage(3);
				expect(book.currentPageIndex).toBe(3);
				expect(onPageChanged).toHaveBeenCalledWith(3);
				expect(window.history.state).toEqual(originalBookState);
				expect(window.location.pathname).toBe("/book/0");
				book.jumpToPage(5);
				expect(window.location.pathname).toBe("/book/5");
			} finally {
				book.destroy();
				History.prototype.replaceState.call(window.history, originalState, "", originalUrl);
			}
		});

		it("restores its own history entries before a SPA router can remount the book", () => {
			createPages(6);
			const originalState = window.history.state;
			const originalUrl = window.location.href;
			const frameworkPopstate = vi.fn();
			window.addEventListener("popstate", frameworkPopstate);
			const book = new FlipBook({
				pagesCount: 6,
				historyMapper: {
					pageToRoute: (pageIndex) => `/book/${pageIndex}`,
					routeToPage: (route) => {
						const index = Number(route.split("/").at(-1));
						return Number.isNaN(index) ? null : index;
					},
				},
			});
			try {
				book.render(".flipbook-container");
				const firstEntry = window.history.state;
				book.jumpToPage(3);
				const laterEntry = window.history.state;
				History.prototype.replaceState.call(window.history, firstEntry, "", "/book/0");
				window.dispatchEvent(new PopStateEvent("popstate", { state: firstEntry }));
				expect(book.currentPageIndex).toBe(0);
				expect(frameworkPopstate).not.toHaveBeenCalled();
				expect(window.location.pathname).toBe("/book/0");

				// Unrelated entries still reach the application's router.
				History.prototype.replaceState.call(window.history, { route: "/book/3" }, "", "/book/3");
				window.dispatchEvent(new PopStateEvent("popstate", { state: { route: "/book/3" } }));
				expect(frameworkPopstate).toHaveBeenCalledOnce();
				expect(book.currentPageIndex).toBe(0);
				expect(laterEntry.__flipBookOwner).toBe(firstEntry.__flipBookOwner);
			} finally {
				book.destroy();
				window.removeEventListener("popstate", frameworkPopstate);
				History.prototype.replaceState.call(window.history, originalState, "", originalUrl);
			}
		});

		it("switches mouse selection without changing touch or default mouse dragging", () => {
			const pages = createPages(4);
			const text = document.createElement("span");
			text.textContent = "Select this text";
			pages[0].appendChild(text);
			const bookDown = vi.fn();
			container.addEventListener("mousedown", bookDown);
			container.addEventListener("pointerdown", bookDown);
			container.addEventListener("touchstart", bookDown);
			const book = new FlipBook({ pagesCount: 4 });
			book.render(".flipbook-container");
			text.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
			expect(bookDown).toHaveBeenCalledTimes(1);
			book.setMouseMode("select");
			expect(book.getMouseMode()).toBe("select");
			expect(container.classList.contains("flipbook--select-text")).toBe(true);
			text.dispatchEvent(
				new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }),
			);
			text.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
			expect(bookDown).toHaveBeenCalledTimes(1);
			text.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
			expect(bookDown).toHaveBeenCalledTimes(2);
			book.setMouseMode("turn");
			text.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
			expect(bookDown).toHaveBeenCalledTimes(3);
			book.destroy();
		});
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

		it.each([
			{ direction: "ltr" as const, sides: ["left", "right", "left", "right"] },
			{ direction: "rtl" as const, sides: ["right", "left", "right", "left"] },
		])("places every $direction page scrollbar at its spine edge", ({ direction, sides }) => {
			const pages = createPages(4);
			const originalDirections = pages.map(
				(page) => window.getComputedStyle(page).direction || direction,
			);
			const book = new FlipBook({ pagesCount: 4, direction });
			book.render(".flipbook-container");
			expect(pages.map((page) => page.dataset.scrollbarSide)).toEqual(sides);
			expect(pages.map((page) => page.dataset.readingDirection)).toEqual(originalDirections);
			book.destroy();
		});

		it("preserves explicit page reading directions and the original consumer nodes", () => {
			const pages = createPages(4);
			pages[0].dir = "rtl";
			pages[1].style.direction = "rtl";
			const consumer = document.createElement("article");
			consumer.dir = "rtl";
			consumer.textContent = "תוכן מקורי";
			pages[0].append(consumer);
			const book = new FlipBook({ pagesCount: 4, direction: "ltr" });
			book.render(".flipbook-container");
			expect(pages[0].dataset.readingDirection).toBe("rtl");
			expect(pages[1].dataset.readingDirection).toBe("rtl");
			expect(pages[0].querySelector(".flipbook-page-content")?.firstElementChild).toBe(consumer);
			expect(consumer.dir).toBe("rtl");
			expect(pages[0].dataset.scrollbarSide).toBe("left");
			book.destroy();
		});

		it("wraps plain DOM text and elements once while preserving their identity and event listeners", () => {
			const pages = createPages(4);
			const text = document.createTextNode("Direct original text ");
			const link = document.createElement("a");
			link.href = "#chapter";
			link.dir = "rtl";
			link.textContent = "פרק";
			const click = vi.fn();
			link.addEventListener("click", click);
			pages[0].append(text, link);
			const book = new FlipBook({ pagesCount: 4 });
			book.render(".flipbook-container");
			const content = pages[0].querySelector(".flipbook-page-content");
			expect(content?.firstChild).toBe(text);
			expect(content?.lastChild).toBe(link);
			expect(link.dir).toBe("rtl");
			link.click();
			expect(click).toHaveBeenCalledTimes(1);
			expect(pages[0].style.overflow).toBe("hidden");
			book.render(".flipbook-container");
			expect(pages[0].querySelectorAll(".flipbook-page-scrollport")).toHaveLength(1);
			expect(pages[0].querySelectorAll(".flipbook-page-content")).toHaveLength(1);
			expect(content?.lastChild).toBe(link);
			book.destroy();
		});

		it("keeps declaratively supplied scrollports and content in place", () => {
			const pages = createPages(4);
			const scrollport = document.createElement("div");
			scrollport.className = "flipbook-page-scrollport";
			const content = document.createElement("div");
			content.className = "flipbook-page-content";
			content.dir = "rtl";
			content.textContent = "Declared content";
			scrollport.append(content);
			pages[0].append(scrollport);
			const book = new FlipBook({ pagesCount: 4 });
			book.render(".flipbook-container");
			expect(pages[0].firstElementChild).toBe(scrollport);
			expect(scrollport.firstElementChild).toBe(content);
			expect(content.dir).toBe("rtl");
			expect(pages[0].querySelectorAll(".flipbook-page-scrollport")).toHaveLength(1);
			book.destroy();
		});

		it("should mark first page as current-page", () => {
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			expect(pages[0].classList.contains("current-page")).toBe(true);
			expect(pages[0].classList.contains("odd")).toBe(true);
		});

		it.each(["ltr", "rtl"] as const)(
			"marks only the active %s spread after initialization, a turn, and a remount",
			async (direction) => {
				vi.useFakeTimers();
				const pages = createPages(22);
				const flipBook = new FlipBook({
					pagesCount: pages.length,
					direction,
					initialTurnedLeaves: Array.from({ length: 8 }, (_, index) => index),
					enableHistory: false,
				});
				const currentPages = () =>
					pages.flatMap((page, index) => (page.classList.contains("current-page") ? [index] : []));
				try {
					flipBook.render(".flipbook-container");
					expect(flipBook.currentPageIndex).toBe(15);
					expect(currentPages()).toEqual([15, 16]);

					const turn = flipBook.flipNext();
					await vi.advanceTimersByTimeAsync(1000);
					await turn;
					expect(flipBook.currentPageIndex).toBe(17);
					expect(currentPages()).toEqual([17, 18]);

					flipBook.destroy();
					flipBook.render(".flipbook-container");
					expect(flipBook.currentPageIndex).toBe(15);
					expect(currentPages()).toEqual([15, 16]);
				} finally {
					flipBook.destroy();
					vi.useRealTimers();
				}
			},
		);

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

		it("stops debug updates and removes the bar on destroy", () => {
			vi.useFakeTimers();
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4, enableHistory: false });
			try {
				flipBook.render(".flipbook-container", true);
				vi.advanceTimersByTime(200);
				const debugBar = container.querySelector(".flipbook-debug-bar");
				expect(debugBar?.textContent).toContain("LTR");

				flipBook.destroy();
				if (debugBar) debugBar.textContent = "stopped";
				vi.advanceTimersByTime(600);
				expect(debugBar?.textContent).toBe("stopped");
				expect(container.querySelector(".flipbook-debug-bar")).toBeNull();
				expect(vi.getTimerCount()).toBe(0);
			} finally {
				flipBook.destroy();
				vi.useRealTimers();
			}
		});

		it("keeps one debug timer across destroy and render cycles", () => {
			vi.useFakeTimers();
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4, enableHistory: false });
			try {
				for (let cycle = 0; cycle < 3; cycle++) {
					flipBook.render(".flipbook-container", true);
					vi.advanceTimersByTime(200);
					expect(container.querySelectorAll(".flipbook-debug-bar").length).toBe(1);
					expect(vi.getTimerCount()).toBe(1);
					flipBook.destroy();
					expect(vi.getTimerCount()).toBe(0);
				}
				flipBook.render(".flipbook-container", false);
				expect(container.querySelector(".flipbook-debug-bar")).toBeNull();
				expect(vi.getTimerCount()).toBe(0);
			} finally {
				flipBook.destroy();
				vi.useRealTimers();
			}
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

		it("releases touch interception when the book is destroyed", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			const startPosition = { ...flipBook.touchStartingPos };
			flipBook.destroy();
			container.dispatchEvent(
				new TouchEvent("touchstart", {
					touches: [{ pageX: 100, pageY: 200 } as Touch],
				}),
			);
			const move = new TouchEvent("touchmove", {
				cancelable: true,
				touches: [{ pageX: 200, pageY: 210 } as Touch],
			});
			container.dispatchEvent(move);
			expect(flipBook.touchStartingPos).toEqual(startPosition);
			expect(move.defaultPrevented).toBe(false);
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
		function dispatchMousePress(target: HTMLElement, pressType: string) {
			target.dispatchEvent(
				new PointerEvent(pressType, {
					bubbles: true,
					button: 0,
					pointerType: "mouse",
					clientX: 100,
					clientY: 200,
				}),
			);
		}

		function dispatchTouchPress(target: HTMLElement) {
			target.dispatchEvent(
				new TouchEvent("touchstart", {
					bubbles: true,
					touches: [{ pageX: 700, pageY: 200 } as Touch],
				}),
			);
		}

		it.each(["pointerdown", "mousedown", "touchstart"])(
			"keeps a turnable %s origin active when recognition enters a no-flip child",
			async (pressType) => {
				vi.useFakeTimers();
				const pages = createPages(8);
				const excluded = document.createElement("div");
				excluded.dataset.flipbookNoFlip = "";
				pages[2].append(excluded);
				const flipBook = new FlipBook({
					pagesCount: pages.length,
					direction: "rtl",
					initialTurnedLeaves: [0],
					enableHistory: false,
				});
				try {
					flipBook.render(".flipbook-container");
					const touch = pressType === "touchstart";
					if (touch) dispatchTouchPress(pages[2]);
					else dispatchMousePress(pages[2], pressType);
					const start = touch ? 700 : 100;
					const movement = new PointerEvent("pointermove", {
						bubbles: true,
						pointerType: touch ? "touch" : "mouse",
						clientX: start + 80,
						clientY: 200,
					});
					excluded.dispatchEvent(movement);
					const recognized = {
						...createDragEvent("start", { x: start + 80, y: 200 }),
						deltaX: 80,
						deltaY: 0,
						pointerType: touch ? "touch" : "mouse",
						srcEvent: movement,
					};
					const internals = getFlipBookInternals(flipBook);
					internals.onDragStart(recognized);
					expect(internals.activeFlips.size).toBe(1);
					internals.onDragUpdate({ ...recognized, center: { x: start + 600, y: 200 } });
					internals.onDragEnd(createDragEvent("end", { velocityX: 1 }));
					await vi.runAllTimersAsync();
					expect(flipBook.currentPageIndex).toBe(3);
				} finally {
					flipBook.destroy();
					vi.useRealTimers();
				}
			},
		);

		it("uses the pan target to exclude synthetic gestures without a recorded press", () => {
			const pages = createPages(6);
			const excluded = document.createElement("div");
			excluded.dataset.flipbookNoFlip = "";
			pages[0].append(excluded);
			const flipBook = new FlipBook({ pagesCount: pages.length, enableHistory: false });
			try {
				flipBook.render(".flipbook-container");
				const movement = new MouseEvent("mousemove", { bubbles: true });
				excluded.dispatchEvent(movement);
				const internals = getFlipBookInternals(flipBook);
				const event = {
					...createDragEvent("start", { x: 600, y: 200 }),
					deltaX: -100,
					pointerType: "mouse",
					srcEvent: movement,
				};
				internals.onDragStart(event);
				internals.onDragUpdate(event);
				expect(internals.activeFlips.size).toBe(0);
			} finally {
				flipBook.destroy();
			}
		});

		it.each(["pointerdown", "mousedown"])(
			"keeps a %s origin in a no-flip child excluded after leaving it",
			async (pressType) => {
				vi.useFakeTimers();
				try {
					const pages = createPages(6);
					const excluded = document.createElement("button");
					excluded.dataset.flipbookNoFlip = "";
					pages[1].appendChild(excluded);
					const onPageChanged = vi.fn();
					const flipBook = new FlipBook({ pagesCount: 6, initialTurnedLeaves: [0], onPageChanged });
					flipBook.render(".flipbook-container");
					const internals = getFlipBookInternals(flipBook);
					dispatchMousePress(excluded, pressType);
					const outside = new MouseEvent("mousemove", {
						bubbles: true,
						clientX: 500,
						clientY: 200,
					});
					pages[2].dispatchEvent(outside);
					const recognized = {
						...createDragEvent("start", { x: 500, y: 200 }),
						deltaX: 400,
						deltaY: 0,
						pointerType: "mouse",
						srcEvent: outside,
					};
					internals.onDragStart(recognized);
					internals.onDragUpdate({ ...recognized, center: { x: 700, y: 200 } });

					expect(internals.activeFlips.size).toBe(0);
					expect(internals.leaves[0].flipPosition).toBe(1);
					expect(onPageChanged).not.toHaveBeenCalled();
					internals.onDragEnd(createDragEvent("end", { velocityX: 1 }));

					dispatchMousePress(pages[1], pressType);
					const permitted = new MouseEvent("mousemove", {
						bubbles: true,
						clientX: 140,
						clientY: 200,
					});
					pages[1].dispatchEvent(permitted);
					internals.onDragStart({
						...createDragEvent("start", { x: 140, y: 200 }),
						deltaX: 40,
						deltaY: 0,
						pointerType: "mouse",
						srcEvent: permitted,
					});
					expect(internals.activeFlips.size).toBe(1);
					expect(internals.leaves[0].flipPosition).toBeLessThan(1);
					internals.onDragEnd(createDragEvent("end"));
					await vi.runAllTimersAsync();
					flipBook.destroy();
				} finally {
					vi.useRealTimers();
				}
			},
		);

		it("preserves a touch no-flip origin while allowing a later touch to turn", async () => {
			vi.useFakeTimers();
			try {
				const pages = createPages(6);
				const excluded = document.createElement("div");
				excluded.dataset.flipbookNoFlip = "";
				pages[2].appendChild(excluded);
				const flipBook = new FlipBook({ pagesCount: 6 });
				flipBook.render(".flipbook-container");
				const internals = getFlipBookInternals(flipBook);
				dispatchTouchPress(excluded);
				const outside = new PointerEvent("pointermove", { bubbles: true, pointerType: "touch" });
				pages[0].dispatchEvent(outside);
				const recognized = {
					...createDragEvent("start", { x: 650, y: 200 }),
					deltaX: -50,
					deltaY: 0,
					pointerType: "touch",
					srcEvent: outside,
				};
				internals.onDragStart(recognized);
				internals.onDragUpdate({ ...recognized, center: { x: 400, y: 200 } });
				const movement = new TouchEvent("touchmove", {
					bubbles: true,
					cancelable: true,
					touches: [{ pageX: 400, pageY: 200 } as Touch],
				});
				excluded.dispatchEvent(movement);
				expect(movement.defaultPrevented).toBe(false);
				expect(internals.activeFlips.size).toBe(0);
				internals.onDragEnd(createDragEvent("end"));

				dispatchTouchPress(pages[0]);
				internals.onDragStart(recognized);
				expect(internals.activeFlips.size).toBe(1);
				internals.onDragEnd(createDragEvent("end"));
				await vi.runAllTimersAsync();
				flipBook.destroy();
			} finally {
				vi.useRealTimers();
			}
		});

		it.each([
			{ direction: "ltr" as const, backward: false },
			{ direction: "rtl" as const, backward: false },
			{ direction: "ltr" as const, backward: true },
			{ direction: "rtl" as const, backward: true },
		])(
			"tracks actual page widths in a wide $direction container (backward=$backward)",
			({ direction, backward }) => {
				Object.defineProperty(container, "clientWidth", { value: 1200, configurable: true });
				const pages = createPages(6);
				const flipBook = new FlipBook({
					pagesCount: 6,
					direction,
					initialTurnedLeaves: backward ? [0] : [],
				});
				flipBook.render(".flipbook-container");
				vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
					left: 50,
					top: 0,
				} as DOMRect);
				for (const page of [pages[0], pages[1]]) {
					page.style.width = "240px";
					page.style.height = "400px";
					page.style.top = "100px";
				}
				const internals = getFlipBookInternals(flipBook);
				const leaf = internals.leaves[0];
				const movement = (direction === "ltr") !== backward ? -1 : 1;
				const startX = movement < 0 ? 890 : 410;
				internals.onDragStart(createDragEvent("start", { x: startX, y: 120 }));

				internals.onDragUpdate(createDragEvent("move", { x: startX + movement * 240, y: 120 }));
				expect(leaf.flipPosition).toBeCloseTo(0.5);
				internals.onDragUpdate(createDragEvent("move", { x: startX + movement * 480, y: 120 }));
				expect(leaf.flipPosition).toBe(backward ? 0 : 1);
				expect(flipBook.currentPageIndex).toBe(backward ? 1 : 0);
				flipBook.destroy();
			},
		);

		it("uses the original press coordinates and renders the first recognized motion", () => {
			const pages = createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");
			pages[0].style.width = "240px";
			pages[0].style.height = "400px";
			pages[0].style.top = "100px";
			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			const origin = vi.spyOn(leaf, "setFoldOrigin");
			const pointer = vi.spyOn(leaf, "setManualFold");
			const recognized = {
				...createDragEvent("start", { x: 770, y: 160 }),
				deltaX: -30,
				deltaY: 40,
				pointerType: "mouse",
			};

			internals.onDragStart(recognized);

			expect(internals.flipStartingPos).toBe(800);
			expect(origin).toHaveBeenCalledExactlyOnceWith(0.05);
			expect(pointer).toHaveBeenLastCalledWith({ x: 0.875, y: 0.1 });
			expect(leaf.flipPosition).toBeGreaterThan(0);
			flipBook.destroy();
		});

		it("responds to vertical mouse motion while held, including outside the page bounds", () => {
			const pages = createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");
			pages[0].style.width = "240px";
			pages[0].style.height = "400px";
			pages[0].style.top = "100px";
			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			const pointer = vi.spyOn(leaf, "setManualFold");
			const verticalPull = {
				...createDragEvent("start", { x: 600, y: 160 }),
				deltaX: 0,
				deltaY: 40,
				pointerType: "mouse",
			};
			internals.onDragStart(verticalPull);
			expect(internals.flipDirection).toBe(FlipDirection.Forward);
			expect(pointer).toHaveBeenLastCalledWith({ x: 1, y: 0.1 });
			const firstCrease = pages[0].style.clipPath;

			internals.onDragUpdate(createDragEvent("move", { x: 600, y: 260 }));
			expect(pointer).toHaveBeenLastCalledWith({ x: 1, y: 0.35 });
			expect(pages[0].style.clipPath).not.toBe(firstCrease);
			internals.onDragUpdate(createDragEvent("move", { x: 600, y: 660 }));
			expect(pointer).toHaveBeenLastCalledWith({ x: 1, y: 1.35 });
			internals.onDragUpdate(createDragEvent("move", { x: 600, y: 120 }));
			expect(pointer).toHaveBeenLastCalledWith({ x: 1, y: 0 });
			flipBook.destroy();
		});

		it("clamps a pull beyond the spread and follows its reversal without freezing", () => {
			const pages = createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");
			pages[0].style.width = "240px";
			pages[0].style.height = "400px";
			pages[0].style.top = "100px";
			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			internals.onDragStart(createDragEvent("start", { x: 700, y: 120 }));
			internals.onDragUpdate(createDragEvent("move", { x: -600, y: 120 }));
			expect(leaf.flipPosition).toBe(1);

			internals.onDragUpdate(createDragEvent("move", { x: 580, y: 120 }));
			expect(leaf.flipPosition).toBeCloseTo(0.25);
			internals.onDragUpdate(createDragEvent("move", { x: 720, y: 120 }));
			expect(leaf.flipPosition).toBe(0);
			flipBook.destroy();
		});

		it.each([
			{ distance: 235, velocity: 0, turned: false },
			{ distance: 245, velocity: 0, turned: true },
			{ distance: 100, velocity: -0.6, turned: true },
		])(
			"settles a $distance px physical pull with velocity $velocity to turned=$turned",
			async ({ distance, velocity, turned }) => {
				vi.useFakeTimers();
				try {
					Object.defineProperty(container, "clientWidth", { value: 1200, configurable: true });
					const pages = createPages(6);
					const flipBook = new FlipBook({ pagesCount: 6 });
					flipBook.render(".flipbook-container");
					pages[0].style.width = "240px";
					pages[0].style.height = "400px";
					pages[0].style.top = "100px";
					const internals = getFlipBookInternals(flipBook);
					internals.onDragStart(createDragEvent("start", { x: 800, y: 120 }));
					internals.onDragUpdate(createDragEvent("move", { x: 800 - distance, y: 120 }));
					internals.onDragEnd(createDragEvent("end", { velocityX: velocity }));
					await vi.runAllTimersAsync();

					expect(internals.leaves[0].isTurned).toBe(turned);
					expect(flipBook.currentPageIndex).toBe(turned ? 1 : 0);
					expect(internals.activeFlips.size).toBe(0);
					flipBook.destroy();
				} finally {
					vi.useRealTimers();
				}
			},
		);

		it("uses the rigid cover's physical width for its drag", () => {
			const pages = createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6, coverPageIndices: [0] });
			flipBook.render(".flipbook-container");
			pages[0].style.width = "240px";
			const internals = getFlipBookInternals(flipBook);
			internals.onDragStart(createDragEvent("start", { x: 700, y: 120 }));
			internals.onDragUpdate(createDragEvent("move", { x: 460, y: 120 }));

			expect(internals.leaves[0].flipPosition).toBe(0.5);
			expect(pages[0].classList.contains("page--folded")).toBe(false);
			flipBook.destroy();
		});

		it("recognizes mouse motion in both axes while leaving vertical touch scrolling native", () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");
			const raw = flipBook as unknown as {
				hammer: { options: { touchAction: string }; get: ReturnType<typeof vi.fn> };
			};
			expect(raw.hammer.options.touchAction).toBe("pan-y");
			expect(raw.hammer.get.mock.results[0].value.set).toHaveBeenCalledWith({ direction: 30 });
			const internals = getFlipBookInternals(flipBook);
			container.dispatchEvent(
				new TouchEvent("touchstart", { touches: [{ pageX: 600, pageY: 120 } as Touch] }),
			);
			const touchPan = {
				...createDragEvent("start", { x: 600, y: 160 }),
				deltaX: 0,
				deltaY: 40,
				pointerType: "touch",
			};
			internals.onDragStart(touchPan);
			const movement = new TouchEvent("touchmove", {
				cancelable: true,
				touches: [{ pageX: 600, pageY: 160 } as Touch],
			});
			container.dispatchEvent(movement);

			expect(movement.defaultPrevented).toBe(false);
			expect(flipBook.touchDirectionLock).toBe("vertical");
			expect(internals.activeFlips.size).toBe(0);
			flipBook.destroy();
		});

		it("follows the pointer immediately and preserves the chosen fold corner", () => {
			const pages = createPages(4);
			const onPageChanged = vi.fn();
			const flipBook = new FlipBook({ pagesCount: 4, onPageChanged });
			flipBook.render(".flipbook-container");
			vi.spyOn(container, "getBoundingClientRect").mockReturnValue({ top: 90 } as DOMRect);
			pages[0].style.top = "40px";
			pages[0].style.width = "400px";
			pages[0].style.height = "400px";
			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			const origin = vi.spyOn(leaf, "setFoldOrigin");
			const pointer = vi.spyOn(leaf, "setManualFold");

			internals.onDragStart(createDragEvent("start", { x: 740, y: 170 }));
			internals.onDragUpdate(createDragEvent("move", { x: 700, y: 170 }));
			expect(leaf.flipPosition).toBeCloseTo(0.05);
			internals.onDragUpdate(createDragEvent("move", { x: 500, y: 370 }));

			expect(leaf.flipPosition).toBeCloseTo(0.3);
			expect(origin).toHaveBeenCalledExactlyOnceWith(0.1);
			expect(pointer).toHaveBeenLastCalledWith({ x: 0.4, y: 0.5 });
			expect(onPageChanged).not.toHaveBeenCalled();
			expect(flipBook.currentPageIndex).toBe(0);
			flipBook.destroy();
		});

		it("uses a stable lower corner when page dimensions are unavailable", () => {
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			pages[0].style.height = "0px";
			const internals = getFlipBookInternals(flipBook);
			const origin = vi.spyOn(internals.leaves[0], "setFoldOrigin");

			internals.onDragStart(createDragEvent("start", { x: 740, y: 170 }));
			internals.onDragUpdate(createDragEvent("move", { x: 700, y: 170 }));

			expect(origin).toHaveBeenCalledExactlyOnceWith(0.75);
			flipBook.destroy();
		});

		it.each([
			{ direction: "ltr" as const, backward: false },
			{ direction: "rtl" as const, backward: false },
			{ direction: "ltr" as const, backward: true },
			{ direction: "rtl" as const, backward: true },
		])(
			"returns an interrupted $direction drag to its starting side (backward=$backward)",
			async ({ direction, backward }) => {
				vi.useFakeTimers();
				try {
					const pages = createPages(4);
					const flipBook = new FlipBook({
						pagesCount: 4,
						direction,
						initialTurnedLeaves: backward ? [0] : [],
					});
					flipBook.render(".flipbook-container");
					pages[0].style.width = "400px";
					pages[1].style.width = "400px";
					const internals = getFlipBookInternals(flipBook);
					const leaf = internals.leaves[0];
					const movement = (direction === "ltr") !== backward ? -1 : 1;
					const startX = movement < 0 ? 740 : 60;
					const firstMoveX = startX + movement * 40;
					internals.onDragStart(createDragEvent("start", { x: startX }));
					internals.onDragUpdate(createDragEvent("move", { x: firstMoveX }));
					internals.onDragUpdate(createDragEvent("move", { x: firstMoveX + movement * 520 }));
					expect(leaf.flipPosition).toBeCloseTo(backward ? 0.3 : 0.7);
					expect(pages[0].classList.contains("page--flipping")).toBe(true);

					const raw = flipBook as unknown as {
						hammer: { on: ReturnType<typeof vi.fn> };
					};
					const cancellation = raw.hammer.on.mock.calls.find(([name]) => name === "pancancel")?.[1];
					expect(cancellation).toBeTypeOf("function");
					cancellation(createDragEvent("end", { velocityX: movement * 2 }));
					await vi.runAllTimersAsync();

					expect(leaf.flipPosition).toBe(backward ? 1 : 0);
					expect(internals.activeFlips.size).toBe(0);
					expect(pages[0].classList.contains("page--flipping")).toBe(false);
					expect(pages[0].style.willChange).toBe("");
					flipBook.destroy();
				} finally {
					vi.useRealTimers();
				}
			},
		);

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
			const spy = vi.spyOn(leaf, "setManualFold");

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
			const spy = vi.spyOn(leaf, "setManualFold");

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
			const spy = vi.spyOn(leaf, "setManualFold");

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

		it("does not start an unavailable backward leaf even when pulled beyond the container", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			setFlipBookInternals(flipBook, { flipStartingPos: 0 });
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 1000 } });

			expect(getFlipBookInternals(flipBook).activeFlips.size).toBe(0);
			expect(getFlipBookInternals(flipBook).leaves[0].flipPosition).toBe(0);
		});

		it("should return early when drag delta is zero", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			setFlipBookInternals(flipBook, { flipStartingPos: 100 });
			getFlipBookInternals(flipBook).onDragUpdate({ center: { x: 100 } });

			expect(getFlipBookInternals(flipBook).flipDirection).toBe(FlipDirection.None);
		});

		it("keeps a forward pull on its starting side when movement reverses past the grab point", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[0];
			const spy = vi.spyOn(leaf, "setManualFold");

			const internals = getFlipBookInternals(flipBook);
			internals.onDragStart(createDragEvent("start", { x: 600 }));
			internals.onDragUpdate(createDragEvent("move", { x: 500 }));
			internals.onDragUpdate(createDragEvent("move", { x: 700 }));

			expect(spy).toHaveBeenCalledWith({ x: expect.any(Number), y: expect.any(Number) });
			expect(leaf.flipPosition).toBe(0);
		});

		it("should return early when book is closed inverted on forward drag", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");

			const leaf = getFlipBookInternals(flipBook).leaves[1];
			leaf.flipPosition = 1;

			const spy = vi.spyOn(getFlipBookInternals(flipBook).leaves[0], "setManualFold");

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
			const spy = vi.spyOn(leaf, "setManualFold");

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
			const spy = vi.spyOn(leaf, "setManualFold");

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
			const spy = vi.spyOn(leaf, "setManualFold");

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
			const spy = vi.spyOn(leaf, "setManualFold");

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

	describe("vertical scroll must not interfere with flip", () => {
		/** Dispatch a touchstart on the container to set touchStartingPos and reset direction lock. */
		function touchStart(target: HTMLElement, x: number, y: number) {
			target.dispatchEvent(
				new TouchEvent("touchstart", { touches: [{ pageX: x, pageY: y } as Touch] }),
			);
		}
		/** Dispatch a touchmove on the container — triggers direction lock logic. */
		function touchMove(target: HTMLElement, x: number, y: number) {
			target.dispatchEvent(
				new TouchEvent("touchmove", {
					cancelable: true,
					touches: [{ pageX: x, pageY: y } as Touch],
				}),
			);
		}

		it("should lock direction to vertical on first significant downward touch", () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			touchStart(container, 400, 300);
			// Move 50 px down, 2 px right — clearly vertical
			touchMove(container, 402, 350);

			expect(flipBook.touchDirectionLock).toBe("vertical");
		});

		it("should lock direction to horizontal on first significant sideways touch", () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");

			touchStart(container, 400, 300);
			// Move 50 px left, 2 px down — clearly horizontal
			touchMove(container, 350, 302);

			expect(flipBook.touchDirectionLock).toBe("horizontal");
		});

		it("should reject onDragStart when touch is locked to vertical", () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");
			const internals = getFlipBookInternals(flipBook);

			// Simulate vertical scroll via real touch events
			touchStart(container, 400, 300);
			touchMove(container, 402, 450); // vertical lock

			// Hammer panstart fires due to horizontal jitter
			internals.onDragStart({ center: { x: 402 } });

			// isDragging should NOT have been set — the drag was rejected
			expect((flipBook as unknown as { isDragging: boolean }).isDragging).toBe(false);
		});

		it("should reject onDragUpdate when touch is locked to vertical — no flip state created", () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");
			const internals = getFlipBookInternals(flipBook);

			// Simulate vertical scroll
			touchStart(container, 400, 300);
			touchMove(container, 395, 500); // vertical lock

			// Even if onDragStart slipped through (e.g. before lock was set)
			internals.onDragStart({ center: { x: 400 } });
			// panmove with small forward delta (400 → 395 = 5 px forward in LTR)
			internals.onDragUpdate({ center: { x: 395 } });

			// No flip state should have been created
			expect(internals.activeFlips.size).toBe(0);
			expect(internals.isDuringManualFlip).toBe(false);
		});

		it("should reset direction lock on new touchstart — allowing a subsequent flip", () => {
			createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");
			const internals = getFlipBookInternals(flipBook);

			// 1. Vertical scroll gesture
			touchStart(container, 400, 300);
			touchMove(container, 402, 500); // vertical lock
			expect(flipBook.touchDirectionLock).toBe("vertical");

			// 2. New gesture — touchstart resets the lock
			touchStart(container, 700, 300);
			touchMove(container, 600, 302); // horizontal lock
			expect(flipBook.touchDirectionLock).toBe("horizontal");

			// 3. Now Hammer fires panstart/panmove for horizontal flip
			internals.onDragStart({ center: { x: 700 } });
			internals.onDragUpdate({ center: { x: 400 } });

			// The real flip should work
			expect(internals.isDuringManualFlip).toBe(true);
			expect(internals.flipDirection).toBe(FlipDirection.Forward);
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

		it("should always keep cover leaves visible when coverPageIndices is set, even outside buffer", () => {
			const pages = createPages(56); // 28 leaves (like a Sefer with covers)
			const flipBook = new FlipBook({
				pagesCount: 56,
				leavesBuffer: 7,
				initialTurnedLeaves: [
					0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
				],
				coverPageIndices: "auto", // covers at pages 0 and 55
			});
			flipBook.render(".flipbook-container");

			// Current position is leaf 21 (page 42). Buffer=7 → leaves 14-28 visible.
			// Cover leaf 0 (pages 0,1) and cover leaf 27 (pages 54,55) are FAR outside buffer
			// but must remain visible because they are cover boards.
			expect(pages[0].style.display).not.toBe("none"); // front cover (leaf 0) - cover exempt
			expect(pages[1].style.display).not.toBe("none"); // front cover interior (leaf 0)
			expect(pages[54].style.display).not.toBe("none"); // back cover interior (leaf 27) - cover exempt
			expect(pages[55].style.display).not.toBe("none"); // back cover (leaf 27)

			// Non-cover leaves outside buffer should be hidden
			expect(pages[2].style.display).toBe("none"); // leaf 1 - outside buffer, not cover
			expect(pages[3].style.display).toBe("none"); // leaf 1
			expect(pages[24].style.display).toBe("none"); // leaf 12 - just outside buffer (14-2=12 margin would include, but let's check leaf 11)

			// Pages within buffer should be visible
			expect(pages[42].style.display).not.toBe("none"); // leaf 21 - current
			expect(pages[43].style.display).not.toBe("none"); // leaf 21
		});

		it("should apply coverSize (not leafSize) to cover pages on initial render", () => {
			const pages = createPages(20); // 10 leaves
			const flipBook = new FlipBook({
				pagesCount: 20,
				coverPageIndices: "auto", // pages 0 and 19
			});
			flipBook.render(".flipbook-container");

			// Cover pages should have dataset.isCoverPage set BEFORE sizing is computed
			expect(pages[0].dataset.isCoverPage).toBe("1");
			expect(pages[19].dataset.isCoverPage).toBe("1");
			// Non-cover pages
			expect(pages[1].dataset.isCoverPage).toBe("");
			expect(pages[10].dataset.isCoverPage).toBe("");

			// Covers should be wider than non-cover pages (coverAspectRatio > leafAspectRatio)
			const coverWidth = parseFloat(pages[0].style.width);
			const leafWidth = parseFloat(pages[2].style.width);
			expect(coverWidth).toBeGreaterThan(leafWidth);
		});

		it("keeps flipping leaves visible while their animation is in flight (issue #167)", async () => {
			vi.useFakeTimers();
			const pages = createPages(20); // 10 leaves
			const flipBook = new FlipBook({
				pagesCount: 20,
				leavesBuffer: 2,
				initialTurnedLeaves: [0, 1, 2, 3, 4, 5, 6], // current spread starts at leaf 7
			});
			flipBook.render(".flipbook-container");
			const internals = getFlipBookInternals(flipBook);

			// Buffer window covers leaves 5-9; leaves 2-4 start hidden.
			expect(pages[4].style.display).toBe("none"); // leaf 2
			expect(pages[8].style.display).toBe("none"); // leaf 4

			const assertFlippingLeavesVisible = () => {
				const flipping = internals.leaves.filter(
					(leaf) => leaf.isFlipping || internals.activeFlips.has(leaf.index),
				);
				expect(flipping.length).toBeGreaterThan(0);
				for (const leaf of flipping) {
					for (const page of leaf.pages) {
						expect(page?.style.display).not.toBe("none");
						expect(page?.style.contentVisibility).not.toBe("hidden");
					}
				}
			};

			// Fire rapid backward flips — each picks the next turned leaf (6..2),
			// and leaves 2-4 sit outside the buffer window when picked.
			const flips: Promise<void>[] = [];
			for (let i = 0; i < 5; i++) {
				flips.push(flipBook.flipPrev());
				await vi.advanceTimersByTimeAsync(50);
			}

			// A leaf picked while buffer-hidden must be revealed the moment its
			// flip starts — hiding it makes the turning page vanish and reappear.
			assertFlippingLeavesVisible();

			// As the earliest flips land the buffer window slides past leaves that
			// are still mid-flight below it; they must stay visible too.
			await vi.advanceTimersByTimeAsync(700);
			assertFlippingLeavesVisible();

			await vi.runAllTimersAsync();
			await Promise.all(flips);
			vi.useRealTimers();
			flipBook.destroy();
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

			// With leaves [0,1] turned, visible spread is:
			//   back of leaf 1 (page 3) + front of leaf 2 (page 4)
			// currentPageIndex should be the leftmost visible page.
			expect(flipBook.currentPageIndex).toBe(3);
		});

		it("currentPageIndex matches post-flip model for initialTurnedLeaves", () => {
			// Regression: init used to report [2K, 2K+1] instead of
			// [(K-1)*2+1, (K-1)*2+2] causing the page indicator to be
			// off-by-one from the actual visible spread.
			createPages(72); // like a 34-chapter Sefer: cover(0), interior(1), toc(2), 34×2 content+blank, backCover
			const turnedCount = 31; // want to see page 61 (chapter 30 content)
			const initialTurnedLeaves = Array.from({ length: turnedCount }, (_, i) => i);
			const flipBook = new FlipBook({
				pagesCount: 72,
				initialTurnedLeaves,
			});
			flipBook.render(".flipbook-container");

			// Visible spread: back of leaf 30 (page 61) + front of leaf 31 (page 62)
			expect(flipBook.currentPageIndex).toBe(61);
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

			// With [0] turned: visible spread is [1, 2], currentPageIndex = 1
			expect(flipBook.currentPageIndex).toBe(1);

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

			// Init: [0,1,2,3] turned → spread [7,8], currentPageIndex = 7
			// flipToPage(2): target lastTurned = 0, so unflip 3 leaves (3,2,1)
			// Result: spread [1,2], currentPageIndex = 1
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
		])(
			"jumpToPage($targetPage) for $description → currentPageIndex = $expectedFirst",
			({ targetPage, expectedFirst }) => {
				createPages(56);
				const flipBook = new FlipBook({ pagesCount: 56 });
				flipBook.render(".flipbook-container");

				flipBook.jumpToPage(targetPage);

				expect(flipBook.currentPageIndex).toBe(expectedFirst);
			},
		);
	});

	describe("asymmetric bookmark geometry", () => {
		const cases = [
			{ direction: "ltr" as const, placement: "left" as const, scale: 1, side: "left" },
			{ direction: "ltr" as const, placement: "right" as const, scale: 1, side: "right" },
			{ direction: "rtl" as const, placement: "left" as const, scale: 0.5, side: "right" },
			{ direction: "rtl" as const, placement: "right" as const, scale: 2, side: "left" },
		];

		function renderOffsetBook(configuration: (typeof cases)[number]) {
			const pages = createPages(8);
			container.style.setProperty("--flipbook-bookmark-depth", "80px");
			const book = new FlipBook({
				pagesCount: 8,
				direction: configuration.direction,
				initialTurnedLeaves: [0, 1],
				enableBookmarks: true,
				bookmarkProvider: {
					getBookmarks: () => [{ id: "chapter", pageIndex: 4, label: "Chapter" }],
					placement: configuration.placement,
				},
			});
			book.render(".flipbook-container");
			vi.spyOn(container, "getBoundingClientRect").mockReturnValue(
				new DOMRect(100, 50, 800 * configuration.scale, 600 * configuration.scale),
			);
			const page = pages[4];
			const width = Number.parseFloat(page.style.width);
			const spine =
				configuration.direction === "ltr"
					? Number.parseFloat(page.style.left) + width
					: 800 - Number.parseFloat(page.style.right) - width;
			return { book, pages, spine };
		}

		it.each(cases)(
			"$direction $placement: keeps scaled hover zones on the actual resting edges",
			async (configuration) => {
				vi.useFakeTimers();
				const { book, pages, spine } = renderOffsetBook(configuration);
				try {
					for (const sign of [-1, 1]) {
						const forward = (sign === 1) === (configuration.direction === "ltr");
						const page = pages[forward ? 4 : 3];
						const edge = spine + sign * Number.parseFloat(page.style.width);
						const y = Number.parseFloat(page.style.top) + Number.parseFloat(page.style.height) / 2;
						const move = async (x: number) => {
							container.dispatchEvent(
								new MouseEvent("mousemove", {
									clientX: 100 + x * configuration.scale,
									clientY: 50 + y * configuration.scale,
								}),
							);
							await vi.advanceTimersByTimeAsync(20);
						};
						await move(edge + sign * 5);
						expect(pages.some((element) => element.classList.contains("page--folded"))).toBe(false);
						await move(edge - sign * 2);
						expect(page.classList.contains("page--folded")).toBe(true);
					}
				} finally {
					book.destroy();
					vi.useRealTimers();
				}
			},
		);

		it.each(cases)(
			"$direction $placement: chooses a vertical pull's page from the shifted scaled spine",
			(configuration) => {
				const { book, spine } = renderOffsetBook(configuration);
				try {
					const right = configuration.side === "right";
					const x = 100 + (spine + (right ? 10 : -10)) * configuration.scale;
					const event = {
						...createDragEvent("start", { x, y: 300 }),
						deltaX: 0,
						deltaY: 24,
						pointerType: "mouse",
					};
					const internals = getFlipBookInternals(book);
					internals.onDragStart(event);
					const forward = right === (configuration.direction === "ltr");
					expect(internals.flipDirection).toBe(
						forward ? FlipDirection.Forward : FlipDirection.Backward,
					);
					expect(internals.currentLeaf?.index).toBe(forward ? 2 : 1);
				} finally {
					book.destroy();
				}
			},
		);
	});

	it("keeps bookmark navigation from resizing every leaf unless its clearance changes", () => {
		const pages = createPages(8);
		let visible = true;
		const book = new FlipBook({
			pagesCount: 8,
			enableBookmarks: true,
			bookmarkProvider: {
				getBookmarks: () => (visible ? [{ id: "chapter", pageIndex: 4, label: "Chapter" }] : []),
				placement: "left",
			},
		});
		book.render(".flipbook-container");
		const transforms = getFlipBookInternals(book).leaves.map((leaf) =>
			vi.spyOn(leaf, "applyTransform"),
		);
		const width = pages[0].style.width;
		book.jumpToPage(0);
		for (const transform of transforms) expect(transform).not.toHaveBeenCalled();
		visible = false;
		book.jumpToPage(0);
		expect(pages[0].style.width).not.toBe(width);
		for (const transform of transforms) expect(transform).toHaveBeenCalledOnce();
		book.destroy();
	});

	it.each([false, true])(
		"attaches bookmarks to the resting paper edge with covers=%s",
		(covers) => {
			const pages = createPages(8);
			const book = new FlipBook({
				pagesCount: 8,
				coverPageIndices: covers ? "auto" : undefined,
				enableBookmarks: true,
				bookmarkProvider: {
					getBookmarks: () => [{ id: "chapter", pageIndex: 4, label: "Chapter" }],
					placement: "left",
				},
			});
			book.render(".flipbook-container");
			const rail = container.querySelector<HTMLElement>('[data-edge="left"]');
			if (!rail) throw new Error("Left bookmark rail is missing");
			const edge = Number.parseFloat(rail.style.left) + Number.parseFloat(rail.style.width);
			expect(edge).toBeCloseTo(Number.parseFloat(pages[4].style.left));
			book.destroy();
		},
	);

	describe("hover shadow", () => {
		it("keeps queued hover updates cleared after leaving and allows a later preview", async () => {
			vi.useFakeTimers();
			const pages = createPages(4);
			const book = new FlipBook({ pagesCount: 4 });
			try {
				book.render(".flipbook-container");
				vi.spyOn(container, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
				container.dispatchEvent(new MouseEvent("mousemove", { clientX: 750, clientY: 100 }));
				expect(pages[0].classList.contains("page--folded")).toBe(true);
				container.dispatchEvent(new MouseEvent("mousemove", { clientX: 751, clientY: 100 }));
				container.dispatchEvent(new MouseEvent("mouseleave"));
				await vi.advanceTimersByTimeAsync(20);
				expect(pages[0].classList.contains("page--folded")).toBe(false);
				container.dispatchEvent(new MouseEvent("mousemove", { clientX: 750, clientY: 100 }));
				await vi.advanceTimersByTimeAsync(20);
				expect(pages[0].classList.contains("page--folded")).toBe(true);
			} finally {
				book.destroy();
				vi.useRealTimers();
			}
		});

		it.each([
			{ direction: "ltr" as const, side: "left", scale: 1, isForward: false, edgeSign: -1 },
			{ direction: "ltr" as const, side: "right", scale: 1, isForward: true, edgeSign: 1 },
			{ direction: "rtl" as const, side: "left", scale: 0.5, isForward: true, edgeSign: -1 },
			{ direction: "rtl" as const, side: "right", scale: 0.5, isForward: false, edgeSign: 1 },
		])(
			"$direction $side: confines hover previews to the visible page edge",
			async ({ direction, scale, isForward, edgeSign }) => {
				vi.useFakeTimers();
				Object.defineProperty(container, "clientWidth", { value: 1200, configurable: true });
				const pages = createPages(8);
				const onPageChanged = vi.fn();
				const book = new FlipBook({
					pagesCount: 8,
					direction,
					initialTurnedLeaves: [0, 1],
					onPageChanged,
				});
				try {
					book.render(".flipbook-container");
					onPageChanged.mockClear();
					vi.spyOn(container, "getBoundingClientRect").mockReturnValue(
						new DOMRect(100, 50, 1200 * scale, 600 * scale),
					);
					const page = isForward ? pages[4] : pages[3];
					const width = Number.parseFloat(page.style.width);
					const height = Number.parseFloat(page.style.height);
					const top = Number.parseFloat(page.style.top);
					const edgeX = 600 + edgeSign * width;
					const insideX = edgeX - edgeSign * 3;
					const move = async (x: number, y: number) => {
						container.dispatchEvent(
							new MouseEvent("mousemove", { clientX: 100 + x * scale, clientY: 50 + y * scale }),
						);
						await vi.advanceTimersByTimeAsync(20);
					};

					for (const [x, y] of [
						[600 + edgeSign * 590, 300],
						[edgeX + edgeSign * 5, 300],
						[insideX, top - 5],
						[insideX, top + height + 5],
						[600, 300],
					]) {
						await move(x, y);
						expect(pages.some((element) => element.classList.contains("page--folded"))).toBe(false);
					}
					for (let i = 0; i < 3; i++) {
						await move(insideX, top + height * 0.1);
						expect(page.classList.contains("page--folded")).toBe(true);
					}
					await move(edgeX + edgeSign * 5, 300);
					expect(pages.some((element) => element.classList.contains("page--folded"))).toBe(false);
					await move(insideX, top + height * 0.9);
					expect(page.classList.contains("page--folded")).toBe(true);
					expect(onPageChanged).not.toHaveBeenCalled();
				} finally {
					book.destroy();
					vi.useRealTimers();
				}
			},
		);

		/** Helper to get book element with assertion - safe after render() is called */
		function getBookElement(flipBook: FlipBook): HTMLElement {
			expect(flipBook.bookElement).toBeDefined();
			// biome-ignore lint/style/noNonNullAssertion: assertion above ensures defined
			return flipBook.bookElement!;
		}

		it("keeps an excluded mouse press flat and resumes idle preview without a pan event", async () => {
			vi.useFakeTimers();
			try {
				const pages = createPages(6);
				const excluded = document.createElement("button");
				excluded.dataset.flipbookNoFlip = "";
				pages[0].appendChild(excluded);
				const flipBook = new FlipBook({ pagesCount: 6 });
				flipBook.render(".flipbook-container");
				vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
					left: 0,
					top: 0,
					width: 800,
					height: 600,
				} as DOMRect);
				container.dispatchEvent(new MouseEvent("mousemove", { clientX: 750, clientY: 100 }));
				expect(pages[0].classList.contains("page--folded")).toBe(true);

				excluded.dispatchEvent(
					new MouseEvent("mousedown", { bubbles: true, button: 0, buttons: 1 }),
				);
				expect(pages[0].classList.contains("page--folded")).toBe(false);
				container.dispatchEvent(
					new MouseEvent("mousemove", { buttons: 1, clientX: 750, clientY: 200 }),
				);
				await vi.advanceTimersByTimeAsync(20);
				expect(pages[0].classList.contains("page--folded")).toBe(false);
				expect(pages[0].style.clipPath).toBe("");
				expect(pages[0].style.getPropertyValue("--fold-shading")).toBe("");
				expect(getFlipBookInternals(flipBook).activeFlips.size).toBe(0);

				excluded.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0, buttons: 0 }));
				container.dispatchEvent(
					new MouseEvent("mousemove", { buttons: 0, clientX: 750, clientY: 200 }),
				);
				await vi.advanceTimersByTimeAsync(20);
				expect(pages[0].classList.contains("page--folded")).toBe(true);
				expect(getFlipBookInternals(flipBook).leaves[0].flipPosition).toBe(0);
				flipBook.destroy();
			} finally {
				vi.useRealTimers();
			}
		});

		it("clears a corner preview and keeps text stationary while selecting", async () => {
			vi.useFakeTimers();
			try {
				const pages = createPages(6);
				const text = document.createElement("span");
				text.textContent = "Select this text";
				pages[0].appendChild(text);
				const flipBook = new FlipBook({ pagesCount: 6 });
				flipBook.render(".flipbook-container");
				vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
					left: 0,
					top: 0,
					width: 800,
					height: 600,
				} as DOMRect);
				container.dispatchEvent(new MouseEvent("mousemove", { clientX: 750, clientY: 100 }));
				expect(pages[0].classList.contains("page--folded")).toBe(true);

				flipBook.setMouseMode("select");
				expect(pages[0].style.clipPath).toBe("");
				expect(pages[0].style.getPropertyValue("--fold-shading")).toBe("");
				expect(pages[0].classList.contains("page--folded")).toBe(false);
				const restingTransform = pages[0].style.transform;
				text.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
				text.dispatchEvent(
					new MouseEvent("mousemove", { bubbles: true, buttons: 1, clientX: 750, clientY: 300 }),
				);
				await vi.advanceTimersByTimeAsync(20);

				expect(pages[0].style.transform).toBe(restingTransform);
				expect(pages[0].style.clipPath).toBe("");
				expect(pages[0].style.getPropertyValue("--fold-shading")).toBe("");
				expect(pages[0].classList.contains("page--folded")).toBe(false);
				expect(getFlipBookInternals(flipBook).activeFlips.size).toBe(0);

				flipBook.setMouseMode("turn");
				container.dispatchEvent(new MouseEvent("mousemove", { clientX: 750, clientY: 100 }));
				await vi.advanceTimersByTimeAsync(20);
				expect(pages[0].classList.contains("page--folded")).toBe(true);
				flipBook.destroy();
			} finally {
				vi.useRealTimers();
			}
		});

		it.each([
			{ method: "flipNext" as const, backward: false, expectedPage: 1 },
			{ method: "flipPrev" as const, backward: true, expectedPage: 0 },
		])(
			"settles $method cleanly after an unmoved corner preview",
			async ({ method, backward, expectedPage }) => {
				vi.useFakeTimers();
				try {
					const pages = createPages(6);
					const onPageChanged = vi.fn();
					const flipBook = new FlipBook({
						pagesCount: 6,
						initialTurnedLeaves: backward ? [0] : [],
						onPageChanged,
					});
					flipBook.render(".flipbook-container");
					vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
						left: 0,
						top: 0,
						width: 800,
						height: 600,
					} as DOMRect);
					const leaf = getFlipBookInternals(flipBook).leaves[0];
					const restingPosition = backward ? 1 : 0;

					container.dispatchEvent(
						new MouseEvent("mousemove", { clientX: backward ? 50 : 750, clientY: 100 }),
					);
					expect(leaf.flipPosition).toBe(restingPosition);
					expect(pages[0].classList.contains("page--folded")).toBe(true);
					expect(pages[0].style.clipPath).not.toBe("");
					expect(pages[0].style.getPropertyValue("--fold-shading")).toContain("linear-gradient");
					expect(onPageChanged).not.toHaveBeenCalled();

					const settled = flipBook[method]();
					await vi.runAllTimersAsync();
					await settled;

					expect(leaf.flipPosition).toBe(1 - restingPosition);
					expect(flipBook.currentPageIndex).toBe(expectedPage);
					expect(pages[expectedPage].classList.contains("current-page")).toBe(true);
					expect(onPageChanged).toHaveBeenCalledExactlyOnceWith(expectedPage);
					for (const page of [pages[0], pages[1]]) {
						expect(page.classList.contains("page--folded")).toBe(false);
						expect(page.classList.contains("page--flipping")).toBe(false);
						expect(page.style.clipPath).toBe("");
						expect(page.style.getPropertyValue("--fold-shading")).toBe("");
						expect(page.style.willChange).toBe("");
					}
					flipBook.destroy();
				} finally {
					vi.useRealTimers();
				}
			},
		);

		it.each([0.1, 0.9])("selects the hovered corner at normalized height %s", (normalizedY) => {
			const pages = createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4 });
			flipBook.render(".flipbook-container");
			vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
				left: 0,
				top: 90,
				width: 800,
				height: 600,
			} as DOMRect);
			pages[0].style.top = "40px";
			pages[0].style.height = "400px";
			const origin = vi.spyOn(getFlipBookInternals(flipBook).leaves[0], "setFoldOrigin");

			container.dispatchEvent(
				new MouseEvent("mousemove", { clientX: 750, clientY: 130 + normalizedY * 400 }),
			);

			expect(origin).toHaveBeenCalledExactlyOnceWith(normalizedY);
			flipBook.destroy();
		});

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

			// Simulate mouse movement inside the visible page edge.
			const event = new MouseEvent("mousemove", {
				clientX: 750, // inside the page edge zone
				clientY: 300,
				bubbles: true,
			});
			bookElement.dispatchEvent(event);

			// Check that leaf has hover shadow applied
			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			// Hover shadow should be set on the first leaf (forward flip direction)
			expect(leaf.pages[0]?.style.getPropertyValue("--fold-shading")).toContain("linear-gradient");
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
			expect(turnedLeaf.pages[0]?.style.getPropertyValue("--fold-shading")).toContain(
				"linear-gradient",
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
			expect(leaf.pages[0]?.style.getPropertyValue("--fold-shading")).toBe("");
			expect(leaf.pages[0]?.style.clipPath).toBe("");
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
			expect(leaf.pages[0]?.style.getPropertyValue("--fold-shading")).toBe("");
			expect(leaf.pages[0]?.style.clipPath).toBe("");
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
			expect(leaf.pages[0]?.style.getPropertyValue("--fold-shading")).toBe("");
		});

		it("calculates correct hover strength based on distance from edge", () => {
			const pages = createPages(4);
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

			// Hover just inside the physical page edge.
			bookElement.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: 400 + Number.parseFloat(pages[0].style.width) - 1,
					clientY: 300,
					bubbles: true,
				}),
			);

			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[0];
			const shadowValue = Number.parseFloat(
				leaf.pages[0]?.style
					.getPropertyValue("--fold-shading")
					.match(/rgba\(0,0,0,([\d.]+)\)/)?.[1] || "0",
			);

			// The preview's crease should cast a visible shadow.
			expect(shadowValue).toBeGreaterThan(0);
		});

		it("shows correct edge hover for RTL mode", () => {
			createPages(4);
			const flipBook = new FlipBook({ pagesCount: 4, direction: "rtl" });
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
			expect(leaf.pages[0]?.style.getPropertyValue("--fold-shading")).toContain("linear-gradient");
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
		it.each(["pointerdown", "mousedown", "touchstart"])(
			"allows the first click from a new %s gesture when the drag emitted no click",
			(downEvent) => {
				const pages = createPages(6);
				const button = document.createElement("button");
				pages[2].appendChild(button);
				const click = vi.fn();
				button.addEventListener("click", click);
				const flipBook = new FlipBook({ pagesCount: 6 });
				flipBook.render(".flipbook-container");
				const internals = getFlipBookInternals(flipBook);
				internals.onDragStart(createDragEvent("start", { x: 500 }));
				internals.onDragUpdate(createDragEvent("move", { x: 350 }));
				internals.onDragEnd(createDragEvent("end", { velocityX: -0.5 }));
				const start = new Event(downEvent, { bubbles: true });
				if (downEvent === "touchstart") {
					Object.defineProperty(start, "touches", { value: [{ pageX: 350, pageY: 250 }] });
				}
				button.dispatchEvent(start);
				button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
				expect(click).toHaveBeenCalledTimes(1);
				flipBook.destroy();
			},
		);

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

		it("keeps a held fold at the same position while fitting the new page dimensions", () => {
			const pages = createPages(6);
			const flipBook = new FlipBook({ pagesCount: 6 });
			flipBook.render(".flipbook-container");
			const internals = getFlipBookInternals(flipBook);
			const leaf = internals.leaves[1];
			leaf.setFoldOrigin(0.2);
			leaf.setManualPosition(0.3);
			const initialClip = pages[2].style.clipPath;
			expect(initialClip).not.toBe("");

			Object.defineProperty(container, "clientWidth", { value: 1200, configurable: true });
			Object.defineProperty(container, "clientHeight", { value: 900, configurable: true });
			resizeCallback?.();

			expect(leaf.flipPosition).toBe(0.3);
			expect(pages[2].style.clipPath).not.toBe(initialClip);
			expect(pages[2].classList.contains("page--folded")).toBe(true);
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
