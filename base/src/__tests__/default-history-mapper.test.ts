import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultHistoryMapper } from "../default-history-mapper";
import { FlipBook } from "../flipbook";
import type { PageSemantics } from "../page-semantics";

// Mock HammerJS - must be hoisted
vi.mock("hammerjs", () => {
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

const NAMES = new Map<number, string>([
	[1, "א"],
	[2, "ב"],
	[3, "ג"],
	[4, "ד"],
]);
const SEMANTICS: PageSemantics = {
	indexToSemanticName: (i) => NAMES.get(i) ?? "",
	indexToTitle: () => "",
	semanticNameToIndex: (name) => {
		for (const [index, value] of NAMES) {
			if (value === name) return index;
		}
		return null;
	},
};

describe("createDefaultHistoryMapper", () => {
	describe("pageToRoute", () => {
		it("maps a page index to a #page/ hash route", () => {
			const mapper = createDefaultHistoryMapper();
			expect(mapper.pageToRoute(4, undefined)).toBe("#page/4");
		});

		it("prefers the semantic name and percent-encodes it", () => {
			const mapper = createDefaultHistoryMapper(SEMANTICS);
			expect(mapper.pageToRoute(2, { semanticName: "ב", title: "" })).toBe("#page/%D7%91");
		});

		it("falls back to the index for pages without a semantic name", () => {
			const mapper = createDefaultHistoryMapper(SEMANTICS);
			expect(mapper.pageToRoute(0, { semanticName: "", title: "" })).toBe("#page/0");
		});
	});

	describe("routeToPage", () => {
		it("parses a numeric page index", () => {
			const mapper = createDefaultHistoryMapper();
			expect(mapper.routeToPage("#page/4")).toBe(4);
		});

		it("round-trips through a full URL", () => {
			const mapper = createDefaultHistoryMapper(SEMANTICS);
			expect(mapper.routeToPage("/book?q=1#page/%D7%92")).toBe(3);
			expect(mapper.routeToPage("/book#page/7")).toBe(7);
		});

		it("resolves semantic names via pageSemantics", () => {
			const mapper = createDefaultHistoryMapper(SEMANTICS);
			expect(mapper.routeToPage("#page/%D7%91")).toBe(2);
		});

		it("returns null for foreign routes", () => {
			const mapper = createDefaultHistoryMapper();
			for (const route of [
				"/other/route",
				"#/page/4", // hash-router scheme is not ours
				"#page/", // empty name
				"#page/x", // not a number, no semantics
				"#page/-2",
				"#page/2.5",
				"#page/%zz", // malformed escape
				"",
			]) {
				expect(mapper.routeToPage(route)).toBeNull();
			}
		});

		it("returns null when the semantic name is unknown", () => {
			const mapper = createDefaultHistoryMapper(SEMANTICS);
			expect(mapper.routeToPage("#page/%D7%AA")).toBeNull(); // ת
		});
	});
});

describe("FlipBook default history integration", () => {
	let container: HTMLDivElement;
	let originalUrl: string;

	beforeEach(() => {
		container = document.createElement("div");
		container.className = "flipbook-container";
		Object.defineProperty(container, "clientWidth", { value: 800, configurable: true });
		Object.defineProperty(container, "clientHeight", { value: 600, configurable: true });
		document.body.appendChild(container);
		originalUrl = window.location.href;
		for (let i = 0; i < 6; i++) {
			const page = document.createElement("div");
			page.className = "page";
			container.appendChild(page);
		}
	});

	afterEach(() => {
		document.body.innerHTML = "";
		History.prototype.replaceState.call(window.history, null, "", originalUrl);
	});

	it("uses the built-in #page/ mapper when none is provided", () => {
		const book = new FlipBook({ pagesCount: 6 });
		try {
			book.render(".flipbook-container");
			expect(window.location.hash).toBe("#page/0");
			book.jumpToPage(3);
			expect(window.location.hash).toBe("#page/3");
			// Even targets land on the same spread — the route names the left page.
			book.jumpToPage(4);
			expect(window.location.hash).toBe("#page/3");
		} finally {
			book.destroy();
		}
	});

	it("writes semantic names when pageSemantics is provided", () => {
		const book = new FlipBook({ pagesCount: 6, pageSemantics: SEMANTICS });
		try {
			book.render(".flipbook-container");
			book.jumpToPage(3);
			expect(window.location.hash).toBe("#page/%D7%92");
		} finally {
			book.destroy();
		}
	});

	it("disables history entirely with enableHistory: false", () => {
		const book = new FlipBook({ pagesCount: 6, enableHistory: false });
		try {
			book.render(".flipbook-container");
			expect(window.location.hash).toBe("");
			book.jumpToPage(4);
			expect(window.location.hash).toBe("");
		} finally {
			book.destroy();
		}
	});

	it("prefers a consumer-provided mapper over the default", () => {
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
			book.jumpToPage(3);
			expect(window.location.pathname).toBe("/book/3");
			expect(window.location.hash).toBe("");
		} finally {
			book.destroy();
		}
	});

	it("adopts the deep-linked page from the URL on render", () => {
		History.prototype.replaceState.call(window.history, null, "", "/#page/3");
		const onPageChanged = vi.fn();
		const book = new FlipBook({ pagesCount: 6, onPageChanged });
		try {
			book.render(".flipbook-container");
			expect(book.currentPageIndex).toBe(3);
			expect(onPageChanged).toHaveBeenCalledWith(3);
			expect(window.location.hash).toBe("#page/3");
		} finally {
			book.destroy();
		}
	});

	it("adopts a deep-linked semantic page on render", () => {
		History.prototype.replaceState.call(window.history, null, "", "/#page/%D7%92");
		const book = new FlipBook({ pagesCount: 6, pageSemantics: SEMANTICS });
		try {
			book.render(".flipbook-container");
			expect(book.currentPageIndex).toBe(3);
		} finally {
			book.destroy();
		}
	});

	it("does not adopt a hash another book authored", () => {
		// A leftover #page/N written by one book is positional state, not a
		// deep link — a second book on the same document must not jump to it.
		const first = new FlipBook({ pagesCount: 6 });
		const second = new FlipBook({ pagesCount: 6 });
		const secondContainer = document.createElement("div");
		secondContainer.className = "second-container";
		Object.defineProperty(secondContainer, "clientWidth", { value: 800, configurable: true });
		Object.defineProperty(secondContainer, "clientHeight", { value: 600, configurable: true });
		document.body.appendChild(secondContainer);
		for (let i = 0; i < 6; i++) {
			const page = document.createElement("div");
			page.className = "page";
			secondContainer.appendChild(page);
		}
		try {
			first.render(".flipbook-container");
			first.jumpToPage(3);
			expect(window.location.hash).toBe("#page/3");
			second.render(".second-container");
			expect(second.currentPageIndex).toBe(0);
		} finally {
			first.destroy();
			second.destroy();
		}
	});

	it("ignores unrecognized and out-of-range deep links", () => {
		const book = new FlipBook({ pagesCount: 6 });
		try {
			History.prototype.replaceState.call(window.history, null, "", "/other/route");
			book.render(".flipbook-container");
			expect(book.currentPageIndex).toBe(0);
			History.prototype.replaceState.call(window.history, null, "", "/#page/42");
			book.destroy();
			const book2 = new FlipBook({ pagesCount: 6 });
			book2.render(".flipbook-container");
			expect(book2.currentPageIndex).toBe(0);
			book2.destroy();
		} finally {
			book.destroy();
		}
	});
});
