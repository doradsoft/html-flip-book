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
// ?heavy=1 loads a bible-on-site-scale workload: a scrollable pane of
// per-word/verse markup (~640 nodes/page) plus book-wide bookmarks, so the
// turn path is measured under realistic layout cost instead of ~4 nodes.
// ?bounded=1 additionally tags each content root .flipbook-page-bounded —
// the DOM contract bible-on-site ships since #2742.
const QUERY = new URLSearchParams(location.search);
const HEAVY = QUERY.has("heavy");
const BOUNDED = QUERY.has("bounded");
const HEAVY_VERSES = 40;
const HEAVY_WORDS = 14;
const HEAVY_BOOKMARKS = 36;

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
			currentPageIndex(): number;
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
	if (HEAVY) {
		if (BOUNDED) {
			content.classList.add("flipbook-page-bounded");
			content.style.display = "flex";
			content.style.flexDirection = "column";
		}
		content.classList.add("fixture-heavy-pane");
		for (let v = 0; v < HEAVY_VERSES; v++) {
			const verse = document.createElement("span");
			verse.className = "fixture-verse";
			const ref = document.createElement("a");
			ref.className = "fixture-verse-num";
			ref.href = `#v${v}`;
			ref.textContent = `${v + 1} `;
			verse.appendChild(ref);
			for (let w = 0; w < HEAVY_WORDS; w++) {
				const word = document.createElement("span");
				word.className = "fixture-word";
				word.textContent = `w${(v * HEAVY_WORDS + w) % 97} `;
				verse.appendChild(word);
			}
			content.appendChild(verse);
		}
	} else {
		content.textContent = label;
	}
	page.appendChild(content);
	return page;
}

const heavyBookmarkProvider = {
	getBookmarks: () =>
		Array.from({ length: HEAVY_BOOKMARKS }, (_, i) => ({
			id: `bm-${i}`,
			pageIndex: Math.floor((i * PAGES) / HEAVY_BOOKMARKS),
			label: `BM ${i + 1}`,
		})),
};

function mountBook(host: HTMLElement): FlipBook {
	const book = new FlipBook({
		pagesCount: PAGES,
		direction: "ltr",
		leafAspectRatio: { width: 3, height: 2 },
		enableHistory: false,
		...(HEAVY ? { enableBookmarks: true, bookmarkProvider: heavyBookmarkProvider } : {}),
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
	// ?adapter=react hands window.__turn to the React-adapter scenario.
	if (QUERY.get("adapter") === "react") return;
	let book: FlipBook | undefined;

	window.__turn = {
		book: () => book,
		currentPageIndex: () => {
			if (!book) throw new Error("prepare() first");
			return book.currentPageIndex;
		},

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
