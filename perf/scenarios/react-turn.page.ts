import { FlipBook, type FlipBookHandle, type FlipBookProps } from "html-flip-book-react";
import { createElement, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

/**
 * React-adapter turn scenario (issue #343): mounts the book through
 * html-flip-book-react with the bible-on-site prop contract — RTL,
 * leavesBuffer, bookmarks, hard covers — so every measured turn also pays
 * the adapter's onPageChanged/onPageFlipping re-render and the buffered
 * page-window remount. Registers the same window.__turn API as the vanilla
 * scenario, gated behind ?adapter=react so both share the driver.
 */

const TURNS = 4;
// Buffer window must actually swap mounts: BoS ships 76 pages/38 leaves
// with leavesBuffer=7; 24 pages/12 leaves exercises the same mount/unmount.
const PAGES = 24;
const QUERY = new URLSearchParams(location.search);
const HEAVY = QUERY.has("heavy");
const BOUNDED = QUERY.has("bounded");
const HEAVY_VERSES = 40;
const HEAVY_WORDS = 14;
const HEAVY_BOOKMARKS = 36;

function pageContentNode(index: number): ReactNode {
	if (!HEAVY) {
		return createElement(
			"div",
			{ className: `fixture-page-content${BOUNDED ? " flipbook-page-bounded" : ""}` },
			`turn page ${index}`,
		);
	}
	const verses: ReactNode[] = [];
	for (let v = 0; v < HEAVY_VERSES; v++) {
		const children: ReactNode[] = [
			createElement(
				"a",
				{ key: "ref", className: "fixture-verse-num", href: `#v${v}` },
				`${v + 1} `,
			),
		];
		for (let w = 0; w < HEAVY_WORDS; w++) {
			children.push(
				createElement(
					"span",
					{ key: `w${w}`, className: "fixture-word" },
					`w${(v * HEAVY_WORDS + w) % 97} `,
				),
			);
		}
		verses.push(createElement("span", { key: `v${v}`, className: "fixture-verse" }, children));
	}
	// In the React adapter each page child renders directly under
	// .flipbook-page-content, so this root is the bounded scroll pane itself.
	return createElement(
		"div",
		{
			className: `fixture-page-content fixture-heavy-pane${BOUNDED ? " flipbook-page-bounded" : ""}`,
			style: BOUNDED ? { display: "flex", flexDirection: "column" } : undefined,
		},
		verses,
	);
}

const pages: ReactNode[] = Array.from({ length: PAGES }, (_, i) => pageContentNode(i));

const reactBookmarkProvider = {
	getBookmarks: () =>
		Array.from({ length: HEAVY_BOOKMARKS }, (_, i) => ({
			id: `bm-${i}`,
			pageIndex: Math.floor((i * PAGES) / HEAVY_BOOKMARKS),
			label: `BM ${i + 1}`,
		})),
	renderBookmark: (bookmark: { label: string }) => createElement("span", null, bookmark.label),
	renderExpandedBookmark: (bookmark: { label: string }) =>
		createElement("span", null, bookmark.label),
};

const bookProps: FlipBookProps & { ref: (h: FlipBookHandle | null) => void } = {
	pages,
	className: "perf-book",
	direction: "rtl",
	leavesBuffer: 7,
	pageShadow: true,
	coverConfig: { hardCovers: true, noShadow: true, coverIndices: "auto" },
	enableBookmarks: true,
	bookmarkProvider: reactBookmarkProvider,
	enableHistory: false,
	handlers: {
		onPageFlipping: () => {},
		onPageFlipped: () => {},
	},
	ref: () => {},
};

export function registerReactTurnScenario(): void {
	if (QUERY.get("adapter") !== "react") return;
	let root: Root | undefined;
	const handleRef: { current: FlipBookHandle | null } = { current: null };
	const props = {
		...bookProps,
		ref: (h: FlipBookHandle | null) => {
			handleRef.current = h;
		},
	};
	const book = {
		flipNext: () => {
			if (!handleRef.current) return Promise.reject(new Error("not mounted"));
			return handleRef.current.flipNext();
		},
		get currentPageIndex() {
			return handleRef.current?.getCurrentPageIndex() ?? 0;
		},
	};

	window.__turn = {
		book: () => undefined,

		async prepare(): Promise<void> {
			const app = document.getElementById("app");
			if (!app) throw new Error("missing #app");
			root?.unmount();
			app.innerHTML = "";
			const host = document.createElement("div");
			host.id = "perf-book";
			app.appendChild(host);
			root = createRoot(host);
			flushSync(() => root.render(createElement(FlipBook, props)));
			await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		},

		runTurns: async () => {
			if (!handleRef.current) throw new Error("prepare() first");
			const perf = window.__perf;
			const turnMs: number[] = [];
			const initialPageIndex = book.currentPageIndex;
			perf.raf.start();
			for (let i = 0; i < TURNS; i++) {
				const t0 = performance.now();
				await book.flipNext();
				turnMs.push(performance.now() - t0);
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
