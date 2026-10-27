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

export function registerScalingScenario(): void {
	window.__scaling = {
		async run(size: number, audit: boolean): Promise<ScalingSample> {
			const perf = window.__perf;
			const app = document.getElementById("app");
			if (!app) throw new Error("missing #app");
			app.innerHTML = "";
			let ops = 0;
			const opsExpected = 6;

			// Window: fixture DOM construction (harness overhead).
			const tBuild = now();
			const host = document.createElement("div");
			host.id = "perf-book";
			for (let i = 0; i < size; i++) host.appendChild(makePage(i));
			app.appendChild(host);
			const fixtureBuildMs = now() - tBuild;

			// Window: library init + render.
			const tInit = now();
			const book = new FlipBook({
				pagesCount: size,
				direction: "ltr",
				leafAspectRatio: { width: 3, height: 2 },
				enableHistory: false,
				enableBookmarks: true,
				bookmarkProvider: bookmarkProvider(size, Math.max(10, size / 10)),
			});
			book.render(`#${host.id}`);
			await nextFrames(2);
			const initMs = now() - tInit;
			ops++;
			perf.spin(perf.delayMs);

			// Window: bookmark provider refresh/rebuild.
			const tMark = now();
			book.setBookmarkProvider(bookmarkProvider(size, Math.max(5, size / 20)));
			await nextFrames(1);
			const bookmarkRefreshMs = now() - tMark;
			ops++;
			perf.spin(perf.delayMs);

			// Window: fixed navigation sequence (bounded to the book size).
			const seq = NAV_SEQ.map((i) => Math.min(i, size - 1));
			const tNav = now();
			for (const i of seq) book.jumpToPage(i);
			await nextFrames(2);
			const navSeqMs = now() - tNav;
			ops++;
			perf.spin(perf.delayMs);

			// Window: resize -> relayout.
			const tResize = now();
			app.style.width = app.style.width === "700px" ? "640px" : "700px";
			await nextFrames(3);
			const resizeMs = now() - tResize;
			ops++;
			perf.spin(perf.delayMs);

			// Window: React mount -> ready (same page count).
			let reactMountMs: number | "skipped" = "skipped";
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
				reactMountMs = now() - tReact;
				root.unmount();
				reactHost.remove();
			} catch {
				reactMountMs = "skipped";
			}
			ops++;

			// Window: mount/unmount cycles inside the same document.
			const cycleMs: number[] = [];
			for (let c = 0; c < CYCLES; c++) {
				const t0 = now();
				book.destroy();
				host.innerHTML = "";
				for (let i = 0; i < size; i++) host.appendChild(makePage(i));
				const fresh = new FlipBook({
					pagesCount: size,
					direction: "ltr",
					leafAspectRatio: { width: 3, height: 2 },
					enableHistory: false,
				});
				fresh.render(`#${host.id}`);
				fresh.destroy();
				cycleMs.push(now() - t0);
				perf.spin(perf.delayMs);
			}
			ops++;

			const auditResult = audit
				? {
						pendingTimers: perf.timers.pending(),
						pendingRafs: perf.timers.rafPending(),
						liveObservers: perf.observers.active(),
						domNodes: document.getElementsByTagName("*").length,
						bookElements: document.querySelectorAll(".flipbook, .page").length,
					}
				: { pendingTimers: -1, pendingRafs: -1, liveObservers: -1, domNodes: -1, bookElements: -1 };

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
				audit: auditResult,
				opsCompleted: ops,
				opsExpected,
			};
		},
	};
}
