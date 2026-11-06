import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlipBook } from "../flipbook";
import { createMockContainer, getFlipBookInternals } from "./test-utils";

vi.mock("hammerjs", () => {
	function MockHammer() {
		return { on: vi.fn(), off: vi.fn(), destroy: vi.fn(), get: () => ({ set: vi.fn() }) };
	}
	MockHammer.DIRECTION_HORIZONTAL = 6;
	MockHammer.DIRECTION_ALL = 30;
	return { default: MockHammer };
});

describe("covered page preparation", () => {
	let container: HTMLDivElement;
	let pages: HTMLDivElement[];
	let book: FlipBook | undefined;
	let callbacks: Map<number, FrameRequestCallback>;
	let nextFrame: number;

	beforeEach(() => {
		({ container, pages } = createMockContainer(24));
		for (const page of pages) {
			page.innerHTML = '<div class="flipbook-page-scrollport">Original reader content</div>';
		}
		callbacks = new Map();
		nextFrame = 0;
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
			callbacks.set(++nextFrame, callback);
			return nextFrame;
		});
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
			callbacks.delete(id);
		});
	});

	afterEach(() => {
		book?.destroy();
		book = undefined;
		container.remove();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	function open(direction: "ltr" | "rtl" = "ltr", leavesBuffer = 1, keepPageContentLayout = false) {
		book = new FlipBook({
			pagesCount: pages.length,
			initialTurnedLeaves: [0, 1, 2, 3, 4, 5, 6],
			leavesBuffer,
			keepPageContentLayout,
			coverPageIndices: "auto",
			enableHistory: false,
			direction,
		});
		book.render(container);
		return book;
	}

	function visibility(index: number) {
		return (pages[index].firstElementChild as HTMLElement).style.contentVisibility;
	}

	function frame() {
		const current = Array.from(callbacks.values());
		callbacks.clear();
		for (const callback of current) callback(performance.now());
	}

	function finishPreparation() {
		for (let index = 0; callbacks.size && index < pages.length; index++) frame();
		expect(callbacks.size).toBe(0);
	}

	it("keeps the initial spread and its preparation window ready synchronously", () => {
		open();
		for (const index of [0, 12, 13, 14, 15, 16, 23]) {
			expect(visibility(index)).toBe("visible");
		}
		expect(callbacks.size).toBe(0);
	});

	it("prepares at most one covered page per frame after the current spread can paint", () => {
		const reader = open();
		reader.jumpToPage(17);
		for (const index of [17, 18]) expect(visibility(index)).toBe("visible");
		for (const index of [19, 20]) expect(visibility(index)).toBe("hidden");
		frame();
		for (const index of [19, 20]) expect(visibility(index)).toBe("hidden");
		frame();
		expect(visibility(19)).toBe("visible");
		expect(visibility(20)).toBe("hidden");
		frame();
		expect(visibility(20)).toBe("visible");
		expect(callbacks.size).toBe(0);
		for (const index of [0, 23]) expect(visibility(index)).toBe("visible");
	});

	it.each([
		["ltr", 0],
		["rtl", 0],
		["ltr", 1],
		["rtl", 1],
	] as const)(
		"reveals both moving faces and their immediate underlay for %s with buffer %s",
		(direction, leavesBuffer) => {
			const reader = open(direction, leavesBuffer);
			reader.jumpToPage(17);
			expect(visibility(19)).toBe("hidden");
			const start = direction === "ltr" ? 700 : 100;
			const move = direction === "ltr" ? 600 : 200;
			const engine = getFlipBookInternals(reader);
			engine.onDragStart({ center: { x: start } });
			engine.onDragUpdate({ center: { x: move } });
			for (const index of [17, 18, 19, 20]) {
				expect(visibility(index)).toBe("visible");
				expect(pages[index].style.display).not.toBe("none");
			}
		},
	);

	it.each([
		["ltr", 0],
		["rtl", 0],
		["ltr", 1],
		["rtl", 1],
	] as const)(
		"reveals the whole paper underneath a retained backward turn for %s with buffer %s",
		(direction, leavesBuffer) => {
			const reader = open(direction, leavesBuffer, true);
			const underlay = pages[11];
			const pane = underlay.firstElementChild as HTMLElement;
			// The preceding paper is outside the ordinary paper buffer at rest.
			expect(underlay.style.opacity).toBe("0");
			const engine = getFlipBookInternals(reader);
			const start = direction === "ltr" ? 100 : 700;
			const move = direction === "ltr" ? 200 : 600;
			engine.onDragStart({ center: { x: start } });
			engine.onDragUpdate({ center: { x: move } });
			// Revealing only the pane is insufficient when its paper is transparent.
			for (const element of [underlay, pane]) {
				expect(element.style.opacity).not.toBe("0");
				expect(element.style.display).not.toBe("none");
				expect(element.style.contentVisibility).not.toBe("hidden");
				expect(element.classList.contains("flipbook-layout-dormant")).toBe(false);
				expect(element.hasAttribute("inert")).toBe(false);
				expect(element.hasAttribute("aria-hidden")).toBe(false);
			}
			// Distant content stays dormant; the fix exposes only the required paper.
			expect(pages[7].style.opacity).toBe("0");
		},
	);

	it("keeps both facing pages visible with a zero content buffer", () => {
		const reader = open("ltr", 0);
		for (const index of [13, 14]) {
			expect(pages[index].style.display).not.toBe("none");
			expect(visibility(index)).toBe("visible");
		}
		reader.jumpToPage(17);
		for (const index of [17, 18]) {
			expect(pages[index].style.display).not.toBe("none");
			expect(visibility(index)).toBe("visible");
		}
	});

	it("retains the original paper edges while skipping covered zero-buffer content", () => {
		const reader = open();
		const paperStyles = pages.map((page) => page.style.cssText);
		reader.destroy();
		open("ltr", 0);
		expect(pages.map((page) => page.style.cssText)).toEqual(paperStyles);
		for (const index of [12, 13, 14, 15]) expect(visibility(index)).toBe("visible");
		expect(visibility(16)).toBe("hidden");
	});

	it("prepares a zero-buffer hover underlay before drawing its curl", () => {
		open("ltr", 0);
		expect(visibility(16)).toBe("hidden");
		vi.spyOn(container, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
		const width = Number.parseFloat(pages[14].style.width);
		const height = Number.parseFloat(pages[14].style.height);
		const top = Number.parseFloat(pages[14].style.top);
		container.dispatchEvent(
			new MouseEvent("mousemove", {
				clientX: 400 + width - 2,
				clientY: top + height * 0.8,
				buttons: 0,
				bubbles: true,
			}),
		);
		expect(visibility(16)).toBe("visible");
		expect(pages[16].style.display).not.toBe("none");
		expect(visibility(17)).toBe("hidden");
	});

	it("promotes newly current pages immediately when the next turn beats preparation", () => {
		const reader = open();
		reader.jumpToPage(17);
		expect(visibility(19)).toBe("hidden");
		reader.jumpToPage(19);
		for (const index of [19, 20]) expect(visibility(index)).toBe("visible");
		finishPreparation();
		for (const index of [19, 20]) expect(visibility(index)).toBe("visible");
	});

	it("discards stale preparation when navigation changes direction", () => {
		const reader = open();
		reader.jumpToPage(17);
		reader.jumpToPage(5);
		for (const index of [5, 6]) expect(visibility(index)).toBe("visible");
		finishPreparation();
		for (const index of [19, 20]) expect(visibility(index)).toBe("hidden");
	});

	it.each(["first paint", "preparation"] as const)(
		"cancels a stale %s callback on destroy",
		(stage) => {
			const reader = open();
			reader.jumpToPage(17);
			if (stage === "preparation") frame();
			const stale = Array.from(callbacks.values());
			expect(stale).toHaveLength(1);
			reader.destroy();
			expect(callbacks.size).toBe(0);
			for (const callback of stale) callback(performance.now());
			expect(callbacks.size).toBe(0);
			for (const index of [19, 20]) expect(visibility(index)).toBe("hidden");
		},
	);

	it("restores synchronous initial preparation when the engine renders again", () => {
		const reader = open();
		reader.jumpToPage(17);
		expect(callbacks.size).toBe(1);
		reader.destroy();
		reader.render(container);
		for (const index of [12, 13, 14, 15, 16]) expect(visibility(index)).toBe("visible");
		expect(callbacks.size).toBe(0);
	});

	it("skips a covered page removed before its preparation frame", () => {
		open().jumpToPage(17);
		const removed = pages[19].firstElementChild as HTMLElement;
		removed.remove();
		finishPreparation();
		expect(removed.style.contentVisibility).toBe("hidden");
		expect(visibility(20)).toBe("visible");
	});

	it("falls back to synchronous preparation when animation frames are unavailable", () => {
		vi.stubGlobal("requestAnimationFrame", undefined);
		open().jumpToPage(17);
		for (const index of [17, 18, 19, 20]) expect(visibility(index)).toBe("visible");
		expect(callbacks.size).toBe(0);
	});

	it("falls back to synchronous preparation when queued frames cannot be cancelled", () => {
		vi.stubGlobal("cancelAnimationFrame", undefined);
		open().jumpToPage(17);
		for (const index of [17, 18, 19, 20]) expect(visibility(index)).toBe("visible");
		expect(callbacks.size).toBe(0);
	});
});
