import { type BookmarkProvider, FlipBook } from "html-flip-book-vanilla";
import "flipbook-styles";

/**
 * Large-book scaling and lifecycle scenario (issue #291).
 *
 * One sample at one page size covers separate timed windows:
 *  - fixtureBuild: constructing the page DOM (harness overhead, excluded
 *    from library-operation numbers),
 *  - init: new FlipBook + render,
 *  - bookmarkRefresh: setBookmarkProvider() rebuild at the configured density,
 *  - navSeq: a fixed jumpToPage sequence,
 *  - resize: container resize -> relayout (measured to the 2nd rAF),
 *  - cycleMs: repeated destroy+recreate inside the same document.
 *
 * The resource-audit pass (audit=1) also reports pending timers, live rAF
 * requests, live observers and DOM node counts after the cycles — retained
 * browser metrics are collected by the driver via CDP.
 *
 * reactMount measures React createRoot -> first effectful render for the
 * same page count, using the packed react entry resolved to the same
 * variant bundle.
 */

interface ScalingSample {
	size: number;
	bookmarkEvery: number;
	fixtureBuildMs: number;
	initMs: number;
	bookmarkRefreshMs: number;
	navSeqMs: number;
	resizeMs: number;
	cycleMs: number[];
	reactMountMs: number | "skipped";
	audit: {
		pendingTimers: number;
		pendingRafs: number;
		liveObservers: number;
		domNodes: number;
		bookElements: number;
	};
	opsCompleted: number;
	opsExpected: number;
}

declare global {
	interface Window {
		__scaling: {
			run(size: number, audit: boolean): Promise<ScalingSample>;
		};
	}
}

function now(): number {
	return performance.now();
}

function nextFrames(n: number): Promise<void> {
	return new Promise((resolve) => {
		const step = (left: number) =>
			left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
		step(n);
	});
}

function makePage(i: number): HTMLElement {
	const page = document.createElement("div");
	page.className = "page";
	const content = document.createElement("div");
	content.className = "fixture-page-content";
	content.textContent = `scaling page ${i}`;
	for (let j = 0; j < 3; j++) {
		const p = document.createElement("p");
		p.textContent = `row ${j}`;
		content.appendChild(p);
	}
	page.appendChild(content);
	return page;
}

function bookmarkProvider(size: number, every: number): BookmarkProvider {
	const bookmarks = [];
	for (let i = 0; i < size; i += every) {
		bookmarks.push({ id: `mark-${i}`, pageIndex: i, label: `mark ${i}` });
	}
	return {
		getBookmarks: () => bookmarks,
		placement: "top",
	};
}

const NAV_SEQ = [1, 5, 9, 3, 7, 11, 0];
const CYCLES = 4;

function newBook(size: number): FlipBook {
	return new FlipBook({
		pagesCount: size,
		direction: "ltr",
		leafAspectRatio: { width: 3, height: 2 },
		enableHistory: false,
	});
}

function buildHost(size: number): HTMLElement {
	const host = document.createElement("div");
	host.id = "perf-book";
	for (let i = 0; i < size; i++) host.appendChild(makePage(i));
	return host;
}

/** Window: React createRoot -> ref-ready mount of a same-size book. */
async function measureReactMount(app: HTMLElement, size: number): Promise<number | "skipped"> {
	try {
		const [{ createElement }, { createRoot }] = await Promise.all([
			import("react"),
			import("react-dom/client"),
		]);
		const { FlipBook: ReactFlipBook } = await import("html-flip-book-react");
		const reactHost = document.createElement("div");
		reactHost.style.width = "320px";
		reactHost.style.height = "210px";
		app.appendChild(reactHost);
		const tReact = now();
		const root = createRoot(reactHost);
		await new Promise<void>((resolve) => {
			const pages = Array.from({ length: size }, (_, i) =>
				createElement("div", { key: i }, `p${i}`),
			);
			root.render(
				createElement(ReactFlipBook, {
					pages,
					enableHistory: false,
					ref: (h: { currentPageIndex: number } | null) => {
						if (h) resolve();
					},
				}),
			);
			// Fallback so a missing ref callback cannot hang the run.
			setTimeout(resolve, 10_000);
		});
		const ms = now() - tReact;
		root.unmount();
		reactHost.remove();
		return ms;
	} catch (err) {
		void err;
		return "skipped";
	}
}

/** Window: repeated destroy + rebuild cycles inside the same document. */
function measureCycles(host: HTMLElement, size: number): number[] {
	const perf = window.__perf;
	const cycleMs: number[] = [];
	for (let c = 0; c < CYCLES; c++) {
		const t0 = now();
		host.innerHTML = "";
		for (let i = 0; i < size; i++) host.appendChild(makePage(i));
		const fresh = newBook(size);
		fresh.render(`#${host.id}`);
		fresh.destroy();
		cycleMs.push(now() - t0);
		perf.spin(perf.delayMs);
	}
	return cycleMs;
}

/** Window: library init + render (with bookmark provider configured). */
async function measureInit(
	host: HTMLElement,
	size: number,
): Promise<{ book: FlipBook; ms: number }> {
	const t = now();
	const book = newBook(size);
	book.setBookmarkProvider(bookmarkProvider(size, Math.max(10, size / 10)));
	book.setBookmarksEnabled(true);
	book.render(`#${host.id}`);
	await nextFrames(2);
	return { book, ms: now() - t };
}

/** Window: bookmark provider refresh/rebuild at a denser interval. */
async function measureBookmarkRefresh(book: FlipBook, size: number): Promise<number> {
	const t = now();
	book.setBookmarkProvider(bookmarkProvider(size, Math.max(5, size / 20)));
	await nextFrames(1);
	return now() - t;
}

/** Window: fixed navigation sequence (bounded to the book size). */
async function measureNav(book: FlipBook, size: number): Promise<number> {
	const t = now();
	for (const i of NAV_SEQ) book.jumpToPage(Math.min(i, size - 1));
	await nextFrames(2);
	return now() - t;
}

/** Window: container resize -> relayout (mean of 4 toggles, each measured to the 3rd rAF).
 *  The two directions differ by an order of magnitude at large sizes (~150ms
 *  grow vs ~1000ms shrink at 1000p), so the loop always starts from a fixed
 *  width and averages both directions. A median of 3 toggles sampled whichever
 *  direction the residual width left first, making the metric a coin flip
 *  between ~150ms and ~1000ms. */
async function measureResize(app: HTMLElement): Promise<number> {
	app.style.width = "700px";
	const runs: number[] = [];
	for (let i = 0; i < 4; i++) {
		const t = now();
		app.style.width = app.style.width === "700px" ? "640px" : "700px";
		await nextFrames(3);
		runs.push(now() - t);
	}
	return runs.reduce((a, b) => a + b, 0) / runs.length;
}

function collectAudit(audit: boolean): ScalingSample["audit"] {
	if (!audit) {
		return {
			pendingTimers: -1,
			pendingRafs: -1,
			liveObservers: -1,
			domNodes: -1,
			bookElements: -1,
		};
	}
	const perf = window.__perf;
	return {
		pendingTimers: perf.timers.pending(),
		pendingRafs: perf.timers.rafPending(),
		liveObservers: perf.observers.active(),
		domNodes: document.getElementsByTagName("*").length,
		bookElements: document.querySelectorAll(".flipbook, .page").length,
	};
}

export function registerScalingScenario(): void {
	window.__scaling = {
		async run(size: number, audit: boolean): Promise<ScalingSample> {
			const perf = window.__perf;
			const app = document.getElementById("app");
			if (!app) throw new Error("missing #app");
			app.innerHTML = "";

			// Fixture DOM construction is harness overhead, not a verdict metric.
			const tBuild = now();
			const host = buildHost(size);
			app.appendChild(host);
			const fixtureBuildMs = now() - tBuild;

			const { book, ms: initMs } = await measureInit(host, size);
			perf.spin(perf.delayMs);
			const bookmarkRefreshMs = await measureBookmarkRefresh(book, size);
			perf.spin(perf.delayMs);
			const navSeqMs = await measureNav(book, size);
			perf.spin(perf.delayMs);
			const resizeMs = await measureResize(app);
			perf.spin(perf.delayMs);
			const reactMountMs = await measureReactMount(app, size);
			book.destroy();
			const cycleMs = measureCycles(host, size);

			return {
				size,
				bookmarkEvery: Math.max(10, size / 10),
				fixtureBuildMs,
				initMs,
				bookmarkRefreshMs,
				navSeqMs,
				resizeMs,
				cycleMs,
				reactMountMs,
				audit: collectAudit(audit),
				opsCompleted: 6,
				opsExpected: 6,
			};
		},
	};
}
