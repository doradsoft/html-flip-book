import { FlipBook } from "html-flip-book-vanilla";
import "flipbook-styles";

/**
 * Page-turn smoothness and input latency scenario (issue #290).
 *
 * One sample = one fresh page load that:
 *  - builds an 8-page book,
 *  - performs TURNS sequential awaited flipNext() calls while rAF gaps,
 *    long tasks and (where supported) long animation frames are captured,
 *  - measures command->completed-turn time via the returned promise, and
 *  - measures pointer-event-received -> first-visible-mutation latency on
 *    a small corner drag.
 *
 * Everything returned is raw data; paired statistics live in scripts/perf.
 */

const TURNS = 4;
const PAGES = 10;

interface TurnSample {
	gaps: number[];
	turnMs: number[];
	inputLatencies: number[];
	longtaskCount: number;
	longtaskTotal: number;
	loafCount: number | "unsupported";
	rafCallbacks: number;
	completedTurns: number;
	expectedTurns: number;
	initialPageIndex: number;
	finalPageIndex: number;
}

declare global {
	interface Window {
		__turn: {
			prepare(): Promise<void>;
			runTurns(): Promise<TurnSample>;
			armInput(): void;
			inputLatency(): number | null;
			book(): FlipBook | undefined;
		};
	}
}

function pageEl(label: string): HTMLElement {
	const page = document.createElement("div");
	page.className = "page";
	const content = document.createElement("div");
	content.className = "fixture-page-content";
	content.textContent = label;
	page.appendChild(content);
	return page;
}

function mountBook(host: HTMLElement): FlipBook {
	const book = new FlipBook({
		pagesCount: PAGES,
		direction: "ltr",
		leafAspectRatio: { width: 3, height: 2 },
		enableHistory: false,
	});
	book.render(`#${host.id}`);
	return book;
}

async function runTurns(book: FlipBook): Promise<TurnSample> {
	const perf = window.__perf;
	const turnMs: number[] = [];
	const initialPageIndex = book.currentPageIndex;
	perf.raf.start();
	for (let i = 0; i < TURNS; i++) {
		const t0 = performance.now();
		await book.flipNext();
		turnMs.push(performance.now() - t0);
		// Injected slowdown applies inside the measured command window
		// (selfcheck) as well as inside rAF callbacks.
		perf.spin(perf.delayMs);
	}
	const gaps = perf.raf.stop();
	const loafCount = perf.loaf === "unsupported" ? "unsupported" : perf.loaf.length;
	return {
		gaps,
		turnMs,
		inputLatencies: [],
		longtaskCount: perf.longtasks.length,
		longtaskTotal: perf.longtasks.reduce((s, e) => s + e.duration, 0),
		loafCount,
		rafCallbacks: perf.raf.callbackCount(),
		completedTurns: turnMs.length,
		expectedTurns: TURNS,
		initialPageIndex,
		finalPageIndex: book.currentPageIndex,
	};
}

export function registerTurnScenario(): void {
	let book: FlipBook | undefined;

	window.__turn = {
		book: () => book,

		async prepare(): Promise<void> {
			const app = document.getElementById("app");
			if (!app) throw new Error("missing #app");
			// Re-prepare replaces the book (probe cleanup path); release the
			// previous instance's observers and listeners first.
			book?.destroy();
			app.innerHTML = "";
			const host = document.createElement("div");
			host.id = "perf-book";
			for (let i = 0; i < PAGES; i++) host.appendChild(pageEl(`turn page ${i}`));
			app.appendChild(host);
			book = mountBook(host);
			// Let the initial layout settle before measuring.
			await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		},

		runTurns: () => {
			if (!book) throw new Error("prepare() first");
			return runTurns(book);
		},

		armInput(): void {
			window.__perf.input.arm();
		},

		inputLatency(): number | null {
			const received = window.__perf.input.receivedAt();
			const mutated = window.__perf.mutations.firstAt();
			if (received === null || mutated === null) return null;
			return mutated - received;
		},
	};
}
