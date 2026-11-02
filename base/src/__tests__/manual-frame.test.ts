import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlipBook } from "../flipbook";
import { createDragEvent, getFlipBookInternals } from "./test-utils";

const input = vi.hoisted(() => ({ handlers: new Map<string, (event: unknown) => void>() }));
vi.mock("hammerjs", () => {
	function MockHammer(_element: HTMLElement, options?: { touchAction: string }) {
		return {
			options,
			on: vi.fn((name: string, handler: (event: unknown) => void) =>
				input.handlers.set(name, handler),
			),
			off: vi.fn(),
			destroy: vi.fn(),
			get: vi.fn(() => ({ set: vi.fn() })),
		};
	}
	MockHammer.DIRECTION_HORIZONTAL = 6;
	MockHammer.DIRECTION_ALL = 30;
	return { default: MockHammer };
});

describe("manual frame work", () => {
	let book: FlipBook;
	let container: HTMLDivElement;
	let nextFrame: number;
	const frames = new Map<number, FrameRequestCallback>();
	const send = (type: string, x: number) => {
		const handler = input.handlers.get(type);
		if (!handler) throw new Error(`Missing ${type} input handler`);
		handler(createDragEvent(type === "panend" ? "end" : "move", { x }));
	};
	const step = () => {
		const callbacks = Array.from(frames.values());
		frames.clear();
		for (const callback of callbacks) callback(16);
	};

	beforeEach(() => {
		frames.clear();
		input.handlers.clear();
		nextFrame = 0;
		container = document.createElement("div");
		Object.defineProperties(container, {
			clientWidth: { value: 800 },
			clientHeight: { value: 600 },
		});
		document.body.append(container);
		for (let index = 0; index < 12; index++) {
			const page = document.createElement("div");
			page.className = "page";
			page.textContent = `Page ${index}`;
			container.append(page);
		}
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
			frames.set(++nextFrame, callback);
			return nextFrame;
		});
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
			frames.delete(id);
		});
	});

	afterEach(() => {
		book?.destroy();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	const start = (retained = true) => {
		book = new FlipBook({
			pagesCount: 12,
			direction: "ltr",
			initialTurnedLeaves: [0],
			leavesBuffer: 0,
			keepPageContentLayout: retained,
			enableHistory: false,
		});
		book.render(container);
		const leaf = getFlipBookInternals(book).leaves[1];
		const paint = vi.spyOn(leaf, "setManualFold");
		send("panstart", 700);
		return { leaf, paint };
	};

	it("paints the leading sample immediately and only the newest later sample per frame", () => {
		const { leaf, paint } = start();
		send("panmove", 650);
		expect(paint).toHaveBeenCalledTimes(1);
		send("panmove", 600);
		send("panmove", 550);
		expect(paint).toHaveBeenCalledTimes(1);
		step();
		expect(paint).toHaveBeenCalledTimes(2);
		expect(paint.mock.lastCall?.[0].x).toBeCloseTo(
			1 - 150 / Number.parseFloat(leaf.pages[0].style.width),
			8,
		);
	});

	it.each([
		["panend", 1],
		["pancancel", 0],
	])("flushes the latest held corner before %s chooses its endpoint", async (event, endpoint) => {
		const { leaf, paint } = start();
		const settle = vi.spyOn(leaf, "flipToPosition").mockResolvedValue(undefined);
		send("panmove", 650);
		send("panmove", 100);
		expect(leaf.flipPosition).toBeLessThan(0.5);
		send(String(event), 100);
		await Promise.resolve();
		expect(paint).toHaveBeenCalledTimes(2);
		expect(settle).toHaveBeenCalledExactlyOnceWith(endpoint);
		step();
		expect(paint).toHaveBeenCalledTimes(2);
	});

	it.each(["destroy", "render", "select"] as const)(
		"cancels stale held samples on %s",
		(action) => {
			const { paint } = start();
			send("panmove", 650);
			send("panmove", 600);
			const stale = Array.from(frames.values());
			if (action === "destroy") book.destroy();
			else if (action === "render") book.render(container);
			else book.setMouseMode("select");
			for (const callback of stale) callback(16);
			expect(paint).toHaveBeenCalledTimes(1);
		},
	);

	it.each(["automatic", "retired"] as const)("discards input for a now %s manual turn", (state) => {
		const { leaf, paint } = start();
		send("panmove", 650);
		send("panmove", 600);
		const flips = getFlipBookInternals(book).activeFlips;
		if (state === "automatic") {
			const manual = flips.get(leaf.index);
			if (!manual) throw new Error("Missing manual turn");
			manual.isDuringAutoFlip = true;
		} else flips.delete(leaf.index);
		step();
		expect(paint).toHaveBeenCalledTimes(1);
	});

	it("keeps standard readers synchronous", () => {
		const { paint } = start(false);
		for (const x of [650, 600, 550]) send("panmove", x);
		expect(paint).toHaveBeenCalledTimes(3);
	});

	it("keeps the synchronous fallback when animation frames are unavailable", () => {
		const { paint } = start();
		vi.stubGlobal("requestAnimationFrame", undefined);
		for (const x of [650, 600, 550]) send("panmove", x);
		expect(paint).toHaveBeenCalledTimes(3);
	});
});
