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

describe("retained content layout", () => {
	let container: HTMLDivElement;
	let pages: HTMLDivElement[];
	let book: FlipBook | undefined;
	let callbacks: Map<number, FrameRequestCallback>;
	let nextFrame: number;

	beforeEach(() => {
		({ container, pages } = createMockContainer(24));
		for (const page of pages) {
			page.innerHTML =
				'<div class="flipbook-page-scrollport"><div class="flipbook-page-content"><button>Original chapter</button></div></div>';
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

	function open(leavesBuffer: number | undefined = 0) {
		book = new FlipBook({
			pagesCount: pages.length,
			initialTurnedLeaves: [0, 1, 2, 3, 4, 5, 6],
			leavesBuffer,
			keepPageContentLayout: true,
			coverPageIndices: "auto",
			enableHistory: false,
		});
		book.render(container);
		return book;
	}

	function port(index: number) {
		return pages[index].firstElementChild as HTMLElement;
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

	it("retains nearby text layout without exposing covered content to input or accessibility", () => {
		open();
		for (const index of [13, 14]) {
			expect(port(index).style.contentVisibility).toBe("visible");
			expect(port(index).hasAttribute("inert")).toBe(false);
			expect(port(index).getAttribute("aria-hidden")).toBeNull();
		}
		expect(port(16).style.contentVisibility).toBe("visible");
		expect(port(16).classList.contains("flipbook-layout-dormant")).toBe(true);
		expect(port(16).hasAttribute("inert")).toBe(true);
		expect(port(16).getAttribute("aria-hidden")).toBe("true");
		expect(pages[18].style.display).not.toBe("none");
		expect(pages[18].classList.contains("flipbook-layout-dormant")).toBe(true);
	});

	it.each([0, 1])("retains the adapter's mounted chapter through a turn (buffer=%s)", (buffer) => {
		const reader = open(buffer);
		const original = port(10).firstChild;
		expect(port(10).style.contentVisibility).toBe("visible");
		reader.jumpToPage(17);
		expect(pages[10].isConnected).toBe(true);
		expect(port(10).firstChild).toBe(original);
		// React still mounts this chapter around the new first visible page.
		// Discarding its layout here makes the next turn rebuild a whole chapter.
		expect(port(10).style.contentVisibility).toBe("visible");
		expect(pages[10].style.display).not.toBe("none");
		expect(port(10).hasAttribute("inert")).toBe(true);
		expect(port(10).getAttribute("aria-hidden")).toBe("true");
		expect(port(2).style.contentVisibility).toBe("hidden");
		finishPreparation();
		expect(port(20).style.contentVisibility).toBe("visible");
		reader.jumpToPage(23);
		expect(port(10).style.contentVisibility).toBe("hidden");
		finishPreparation();
	});

	it("does not mutate unrelated page appearance when refreshing a current chapter", () => {
		const reader = open();
		const observer = new MutationObserver(() => {});
		observer.observe(container, { attributes: true, subtree: true });
		reader.refreshPageContent([13]);
		expect(observer.takeRecords().filter((record) => record.target !== port(13))).toHaveLength(0);
		reader.refreshPageContent([16]);
		expect(observer.takeRecords().some((record) => record.target === port(16))).toBe(true);
		observer.disconnect();
	});

	it("prepares newly materialized covered chapters separately after the critical pose", () => {
		const reader = open();
		reader.refreshPageContent([16, 18]);
		for (const index of [13, 14]) expect(port(index).style.contentVisibility).toBe("visible");
		for (const index of [16, 18]) expect(port(index).style.contentVisibility).toBe("hidden");
		frame();
		for (const index of [16, 18]) expect(port(index).style.contentVisibility).toBe("hidden");
		frame();
		expect(port(16).style.contentVisibility).toBe("visible");
		expect(port(18).style.contentVisibility).toBe("hidden");
		frame();
		expect(port(18).style.contentVisibility).toBe("visible");
		expect(port(18).hasAttribute("inert")).toBe(true);
	});

	it("promotes a newly required face immediately ahead of queued preparation", () => {
		const reader = open();
		reader.refreshPageContent([16, 18]);
		reader.jumpToPage(17);
		expect(port(18).style.contentVisibility).toBe("visible");
		expect(port(18).hasAttribute("inert")).toBe(false);
		expect(port(18).getAttribute("aria-hidden")).toBeNull();
	});

	it("does not prepare stale content after navigation reverses", () => {
		const reader = open();
		reader.refreshPageContent([16, 18]);
		reader.jumpToPage(1);
		finishPreparation();
		for (const index of [16, 18]) expect(port(index).style.contentVisibility).toBe("hidden");
	});

	it.each(["pointerup", "pointercancel", "blur"])(
		"prioritizes a held pointer and resumes after %s",
		(release) => {
			const reader = open();
			reader.refreshPageContent([16, 18]);
			container.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
			for (let index = 0; index < 4; index++) frame();
			expect(callbacks.size).toBe(0);
			for (const index of [16, 18]) expect(port(index).style.contentVisibility).toBe("hidden");
			if (release === "blur") window.dispatchEvent(new Event(release));
			else document.dispatchEvent(new MouseEvent(release, { bubbles: true, button: 0 }));
			frame();
			for (const index of [16, 18]) expect(port(index).style.contentVisibility).toBe("hidden");
			frame();
			expect(port(16).style.contentVisibility).toBe("visible");
			expect(port(18).style.contentVisibility).toBe("hidden");
			finishPreparation();
			for (const index of [16, 18]) expect(port(index).style.contentVisibility).toBe("visible");
		},
	);

	it("keeps moving faces and underlays ready while background preparation is paused", () => {
		const reader = open();
		reader.refreshPageContent([16, 18]);
		container.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
		const engine = getFlipBookInternals(reader);
		engine.onDragStart({ center: { x: 700 } });
		engine.onDragUpdate({ center: { x: 600 } });
		for (const index of [13, 14, 15, 16])
			expect(port(index).style.contentVisibility).toBe("visible");
	});

	it.each(["flipNext", "flipPrev"] as const)(
		"keeps optional chapter layout out of an active %s animation and resumes afterwards",
		async (method) => {
			const reader = open();
			reader.refreshPageContent([18]);
			frame();
			const leaf = getFlipBookInternals(reader).leaves[method === "flipNext" ? 7 : 6];
			let finish!: () => void;
			vi.spyOn(leaf, "flipToPosition").mockImplementation(
				() =>
					new Promise<void>((resolve) => {
						finish = resolve;
					}),
			);
			const turning = reader[method]();
			reader.refreshPageContent([18]);
			const ready = vi.fn();
			reader.onPageContentPrepared(ready);
			try {
				for (let index = 0; index < 4; index++) frame();
				expect(port(18).style.contentVisibility).toBe("hidden");
				expect(ready).not.toHaveBeenCalled();
			} finally {
				finish();
				await turning;
			}
			finishPreparation();
			expect(port(18).style.contentVisibility).toBe("visible");
			expect(ready).toHaveBeenCalledOnce();
		},
	);

	it("resumes optional layout only after the last overlapping turn ends", async () => {
		const reader = open();
		const finish: (() => void)[] = [];
		for (const index of [7, 8]) {
			vi.spyOn(getFlipBookInternals(reader).leaves[index], "flipToPosition").mockImplementation(
				() =>
					new Promise<void>((resolve) => {
						finish.push(resolve);
					}),
			);
		}
		const first = reader.flipNext();
		const second = reader.flipNext();
		expect(getFlipBookInternals(reader).activeFlips.size).toBe(2);
		reader.refreshPageContent([20]);
		try {
			finish[0]();
			await first;
			for (let index = 0; index < 4; index++) frame();
			expect(port(20).style.contentVisibility).toBe("hidden");
		} finally {
			for (const complete of finish) complete();
			await Promise.all([first, second]);
		}
		finishPreparation();
		expect(port(20).style.contentVisibility).toBe("visible");
	});

	it("keeps background layout paused through a drag's release animation", async () => {
		const reader = open();
		const engine = getFlipBookInternals(reader);
		engine.onDragStart({ center: { x: 700 } });
		engine.onDragUpdate({ center: { x: 600 } });
		let finish!: () => void;
		const animation = new Promise<void>((resolve) => {
			finish = resolve;
		});
		vi.spyOn(engine.leaves[7], "flipToPosition").mockReturnValue(animation);
		engine.onDragEnd({ center: { x: 600 }, velocityX: -1 });
		reader.refreshPageContent([18]);
		try {
			for (let index = 0; index < 4; index++) frame();
			expect(port(18).style.contentVisibility).toBe("hidden");
			for (const index of [13, 14, 15, 16])
				expect(port(index).style.contentVisibility).toBe("visible");
		} finally {
			finish();
			await animation;
		}
		finishPreparation();
		expect(port(18).style.contentVisibility).toBe("visible");
	});

	it("restores consumer accessibility and opacity values on promotion and teardown", () => {
		pages[18].style.opacity = "0.6";
		pages[18].setAttribute("inert", "kept");
		pages[18].setAttribute("aria-hidden", "false");
		port(18).setAttribute("aria-hidden", "false");
		const reader = open();
		expect(pages[18].getAttribute("aria-hidden")).toBe("true");
		reader.jumpToPage(17);
		expect(pages[18].style.opacity).toBe("0.6");
		expect(pages[18].getAttribute("inert")).toBe("kept");
		expect(pages[18].getAttribute("aria-hidden")).toBe("false");
		reader.jumpToPage(13);
		reader.destroy();
		expect(pages[18].getAttribute("aria-hidden")).toBe("false");
		expect(port(18).getAttribute("aria-hidden")).toBe("false");
		expect(port(18).hasAttribute("inert")).toBe(false);
		expect(container.querySelectorAll(".flipbook-layout-dormant")).toHaveLength(0);
	});

	it("cancels stale work and restores masks when rendered again or destroyed", () => {
		const reader = open();
		reader.refreshPageContent([16, 18]);
		const stale = Array.from(callbacks.values());
		reader.render(container);
		expect(callbacks.size).toBe(0);
		for (const callback of stale) callback(performance.now());
		expect(callbacks.size).toBe(0);
		reader.refreshPageContent([16, 18]);
		reader.destroy();
		for (const callback of callbacks.values()) callback(performance.now());
		expect(callbacks.size).toBe(0);
		expect(document.querySelectorAll(".flipbook-layout-dormant")).toHaveLength(0);
	});

	it("ignores invalid slots and leaves empty retained slots dormant", () => {
		port(16).firstElementChild?.replaceChildren();
		const reader = open();
		expect(port(16).style.contentVisibility).toBe("hidden");
		reader.refreshPageContent([-1, 1000]);
		reader.refreshPageContent([]);
		expect(port(16).style.contentVisibility).toBe("hidden");
		port(16).firstElementChild?.append(document.createTextNode("Materialized"));
		reader.refreshPageContent([16]);
		finishPreparation();
		expect(port(16).style.contentVisibility).toBe("visible");
	});

	it("lets keyboard input preempt background layout and ignores secondary pointers", () => {
		const reader = open();
		reader.refreshPageContent([16]);
		frame();
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
		frame();
		expect(port(16).style.contentVisibility).toBe("hidden");
		frame();
		expect(port(16).style.contentVisibility).toBe("visible");
		reader.refreshPageContent([16]);
		document.dispatchEvent(new MouseEvent("pointerdown", { button: 2 }));
		finishPreparation();
		expect(port(16).style.contentVisibility).toBe("visible");
		reader.refreshPageContent([16]);
		const secondary = new MouseEvent("pointerdown", { button: 0 });
		Object.defineProperty(secondary, "isPrimary", { value: false });
		document.dispatchEvent(secondary);
		const release = new MouseEvent("pointerup", { button: 0 });
		Object.defineProperty(release, "isPrimary", { value: false });
		document.dispatchEvent(release);
		finishPreparation();
		expect(port(16).style.contentVisibility).toBe("visible");
	});

	it("notifies adapters only after the covered layout queue has drained", () => {
		const reader = open();
		const immediate = vi.fn();
		reader.onPageContentPrepared(immediate)();
		expect(immediate).toHaveBeenCalledOnce();
		reader.refreshPageContent([16, 18]);
		const ready = vi.fn();
		reader.onPageContentPrepared(ready);
		frame();
		frame();
		expect(port(16).style.contentVisibility).toBe("visible");
		expect(port(18).style.contentVisibility).toBe("hidden");
		expect(ready).not.toHaveBeenCalled();
		frame();
		expect(ready).toHaveBeenCalledOnce();
		expect(port(18).style.contentVisibility).toBe("visible");
	});

	it("cancels a retired adapter subscription without dropping other listeners", () => {
		const reader = open();
		reader.refreshPageContent([16]);
		const stale = vi.fn(),
			ready = vi.fn();
		const cancel = reader.onPageContentPrepared(stale);
		reader.onPageContentPrepared(ready);
		cancel();
		cancel();
		finishPreparation();
		expect(stale).not.toHaveBeenCalled();
		expect(ready).toHaveBeenCalledOnce();
	});

	it.each(["render", "destroy"] as const)(
		"releases adapter waiters when preparation is cancelled by %s",
		(method) => {
			const reader = open();
			reader.refreshPageContent([16]);
			const ready = vi.fn();
			reader.onPageContentPrepared(ready);
			if (method === "render") reader.render(container);
			else reader.destroy();
			expect(ready).toHaveBeenCalledOnce();
			expect(callbacks.size).toBe(0);
		},
	);

	it("lets a real press preempt a queued hover without disabling later previews", async () => {
		vi.useFakeTimers();
		try {
			const reader = open();
			vi.spyOn(container, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
			container.dispatchEvent(
				new MouseEvent("mousemove", { bubbles: true, clientX: 750, clientY: 300 }),
			);
			expect(container.querySelector(".page--folded")).toBeNull();
			pages[14].dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
			await vi.advanceTimersByTimeAsync(20);
			expect(container.querySelector(".page--folded")).toBeNull();
			document.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0 }));
			container.dispatchEvent(
				new MouseEvent("mousemove", { bubbles: true, clientX: 750, clientY: 300 }),
			);
			await vi.advanceTimersByTimeAsync(20);
			expect(container.querySelectorAll(".page--folded")).toHaveLength(2);
			reader.destroy();
		} finally {
			vi.useRealTimers();
		}
	});

	it("drops queued previews when the reader is destroyed", async () => {
		vi.useFakeTimers();
		try {
			const reader = open();
			vi.spyOn(container, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
			const initial = vi.getTimerCount();
			container.dispatchEvent(
				new MouseEvent("mousemove", { bubbles: true, clientX: 750, clientY: 300 }),
			);
			expect(vi.getTimerCount()).toBe(initial + 1);
			reader.destroy();
			expect(vi.getTimerCount()).toBe(initial);
			await vi.advanceTimersByTimeAsync(20);
			expect(container.querySelector(".page--folded")).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it("holds background layout through a content commit and resumes behind a fresh barrier", () => {
		const reader = open();
		const release = reader.holdPreparedPageContent();
		expect(release).toBeTypeOf("function");
		const ready = vi.fn();
		reader.onPageContentPrepared(ready);
		expect(ready).not.toHaveBeenCalled();
		reader.refreshPageContent([16]);
		expect(callbacks.size).toBe(0);
		expect(reader.holdPreparedPageContent()).toBeUndefined();
		release?.();
		frame();
		expect(port(16).style.contentVisibility).toBe("hidden");
		frame();
		expect(port(16).style.contentVisibility).toBe("visible");
		expect(ready).toHaveBeenCalledOnce();
		release?.();
		expect(callbacks.size).toBe(0);
	});

	it.each(["render", "destroy"] as const)(
		"expires content holds when %s cancels the update",
		(method) => {
			const reader = open();
			const release = reader.holdPreparedPageContent();
			const ready = vi.fn();
			reader.onPageContentPrepared(ready);
			if (method === "render") reader.render(container);
			else reader.destroy();
			expect(ready).toHaveBeenCalledOnce();
			release?.();
			expect(callbacks.size).toBe(0);
		},
	);

	it("requires an explicit buffer and feature opt-in", () => {
		book = new FlipBook({
			pagesCount: pages.length,
			keepPageContentLayout: true,
			enableHistory: false,
		});
		book.refreshPageContent([1]);
		book.render(container);
		book.refreshPageContent([1]);
		expect(container.querySelectorAll(".flipbook-layout-dormant")).toHaveLength(0);
		book.destroy();
		book = new FlipBook({ pagesCount: pages.length, leavesBuffer: 0, enableHistory: false });
		book.render(container);
		book.refreshPageContent([1]);
		expect(container.querySelectorAll(".flipbook-layout-dormant")).toHaveLength(0);
	});

	it.each(["requestAnimationFrame", "cancelAnimationFrame"])(
		"prepares synchronously when %s is unavailable",
		(name) => {
			vi.stubGlobal(name, undefined);
			const reader = open();
			reader.refreshPageContent([16, 18]);
			for (const index of [16, 18]) expect(port(index).style.contentVisibility).toBe("visible");
		},
	);
});
