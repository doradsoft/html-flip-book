import { afterEach, describe, expect, it, vi } from "vitest";
import type { BookmarkContext, BookmarkProvider } from "../bookmarks";
import { createDefaultBookmarkProvider } from "../default-bookmarks";
import type { PageSemantics } from "../page-semantics";

const context: BookmarkContext = {
	currentPageIndex: 1,
	currentLeafIndex: 0,
	direction: "ltr",
};

function semantics(
	titles: Record<number, string>,
	names: Record<number, string> = {},
): PageSemantics {
	return {
		indexToTitle: (index) => titles[index] ?? "",
		indexToSemanticName: (index) => names[index] ?? "",
		semanticNameToIndex: () => null,
	};
}

function bookmarkTargets(provider: BookmarkProvider) {
	return provider
		.getBookmarks(context)
		.map(({ id, pageIndex, label }) => ({ id, pageIndex, label }));
}

describe("createDefaultBookmarkProvider", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("includes the contents page and the same nonempty titles as the default table of contents", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 8,
			tocPageIndex: 2,
			pageSemantics: semantics({ 0: "Cover", 3: "Introduction", 6: "Later chapter" }),
			direction: "ltr",
		});
		expect(bookmarkTargets(provider)).toEqual([
			{ id: "spread-0", pageIndex: 0, label: "Cover" },
			{ id: "contents", pageIndex: 2, label: "Table of contents" },
			{ id: "spread-2", pageIndex: 3, label: "Introduction" },
			{ id: "spread-3", pageIndex: 5, label: "Later chapter" },
		]);
	});

	it("keeps a titled contents page only once and preserves its title", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 5,
			tocPageIndex: 2,
			pageSemantics: semantics({ 2: "Inside this book", 4: "Last chapter" }),
			direction: "ltr",
		});
		expect(bookmarkTargets(provider)).toEqual([
			{ id: "contents", pageIndex: 2, label: "Inside this book" },
			{ id: "spread-2", pageIndex: 3, label: "Last chapter" },
		]);
	});

	it("provides the contents bookmark without page semantics and uses the reading locale", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 2,
			direction: "rtl",
		});
		const [bookmark] = provider.getBookmarks(context);
		expect(bookmark).toMatchObject({ id: "contents", pageIndex: 2, label: "תוכן העניינים" });
		expect(provider.renderBookmark?.(bookmark)).toBe("תוכן העניינים");
	});

	it("keeps bookmark objects and their array stable across navigation", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 2,
			pageSemantics: semantics({ 4: "Chapter" }),
			direction: "ltr",
		});
		const first = provider.getBookmarks(context);
		const later = provider.getBookmarks({ ...context, currentPageIndex: 5, currentLeafIndex: 2 });
		expect(later).toBe(first);
		expect(later[1]).toBe(first[1]);
	});

	it.each([-1, 0, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		"ignores an invalid total page count %s",
		(pagesCount) => {
			const indexToTitle = vi.fn(() => "Chapter");
			const provider = createDefaultBookmarkProvider({
				pagesCount,
				tocPageIndex: 0,
				pageSemantics: { ...semantics({}), indexToTitle },
				direction: "ltr",
			});
			expect(bookmarkTargets(provider)).toEqual([]);
			expect(indexToTitle).not.toHaveBeenCalled();
		},
	);

	it.each([-1, 4, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		"omits an invalid contents target %s while keeping chapter entries",
		(tocPageIndex) => {
			const provider = createDefaultBookmarkProvider({
				pagesCount: 4,
				tocPageIndex,
				pageSemantics: semantics({ 3: "Chapter" }),
				direction: "ltr",
			});
			expect(bookmarkTargets(provider)).toEqual([
				{ id: "spread-2", pageIndex: 3, label: "Chapter" },
			]);
		},
	);

	it("uses meaningful chapter titles in brief content instead of page numbers", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 0,
			pageSemantics: semantics({ 2: "First", 3: "Second", 4: "Third" }, { 2: "א׳", 3: "ב׳" }),
			direction: "rtl",
		});
		const [, first, second] = provider.getBookmarks(context);
		expect(provider.renderBookmark?.(first)).toBe("First");
		expect(provider.renderBookmark?.(second)).toBe("Second / Third");
	});

	it("shares one bookmark between facing pages and combines their meaningful titles", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 0,
			pageSemantics: semantics({ 3: "First chapter", 4: "Second chapter" }, { 3: "יא", 4: "יב" }),
			direction: "rtl",
		});
		const bookmarks = provider.getBookmarks(context);
		expect(bookmarkTargets(provider)).toEqual([
			{ id: "contents", pageIndex: 0, label: "תוכן העניינים" },
			{ id: "spread-2", pageIndex: 3, label: "First chapter / Second chapter" },
		]);
		expect(provider.renderBookmark?.(bookmarks[1])).toBe("First chapter / Second chapter");
		const expanded = provider.renderExpandedBookmark?.(bookmarks[1]) as HTMLElement;
		expect(expanded.querySelector("strong")?.textContent).toBe("First chapter / Second chapter");
		expect(expanded.querySelector("small")?.textContent).toBe("יא–יב");
	});

	it("retains the contents destination when its paired chapter occurs first", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 4,
			pageSemantics: semantics({ 3: "Introduction", 4: "Contents" }, { 3: "ii", 4: "iii" }),
			direction: "ltr",
		});
		const [contents] = provider.getBookmarks(context);
		expect(contents).toMatchObject({
			id: "contents",
			pageIndex: 4,
			label: "Introduction / Contents",
		});
		expect(provider.renderBookmark?.(contents)).toBe("Introduction / Contents");
	});

	it("renders full HTML with literal title text, semantic page names, and no interactive content", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 5,
			tocPageIndex: 2,
			pageSemantics: semantics({ 4: '<img src="x" onerror="alert(1)">' }, { 4: "ג׳" }),
			direction: "rtl",
		});
		const [, bookmark] = provider.getBookmarks(context);
		const expanded = provider.renderExpandedBookmark?.(bookmark) as HTMLElement;
		expect(expanded.dir).toBe("rtl");
		expect(expanded.querySelector("strong")?.textContent).toBe(bookmark.label);
		expect(expanded.querySelector("small")?.textContent).toBe("ג׳");
		expect(expanded.querySelector("img, a, button, input, select, textarea")).toBeNull();
	});

	it("uses a physical page number in full content when there is no semantic name", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 5,
			tocPageIndex: 2,
			pageSemantics: semantics({ 4: "Chapter" }),
			direction: "ltr",
		});
		const [, bookmark] = provider.getBookmarks(context);
		const expanded = provider.renderExpandedBookmark?.(bookmark) as HTMLElement;
		expect(expanded.querySelector("small")?.textContent).toBe("5");
	});

	it("does not access the DOM while creating or reading the provider", () => {
		vi.stubGlobal("document", undefined);
		const provider = createDefaultBookmarkProvider({
			pagesCount: 5,
			tocPageIndex: 2,
			pageSemantics: semantics({ 4: "Chapter" }),
			direction: "ltr",
		});
		const bookmarks = provider.getBookmarks(context);
		expect(bookmarks).toHaveLength(2);
		expect(provider.renderBookmark?.(bookmarks[1])).toBe("Chapter");
	});

	it("omits covers even when their page semantics provide titles", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 8,
			tocPageIndex: 2,
			coverPageIndices: [0, 1, 6, 7],
			pageSemantics: semantics({
				0: "Front cover",
				1: "Inside cover",
				3: "Introduction",
				6: "Back interior",
				7: "Back cover",
			}),
			direction: "ltr",
		});
		expect(bookmarkTargets(provider)).toEqual([
			{ id: "contents", pageIndex: 2, label: "Table of contents" },
			{ id: "spread-2", pageIndex: 3, label: "Introduction" },
		]);
	});

	it("does not create a contents bookmark when its target is a cover", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 0,
			coverPageIndices: [0, 1],
			pageSemantics: semantics({ 0: "Cover", 4: "Chapter" }),
			direction: "ltr",
		});
		expect(bookmarkTargets(provider)).toEqual([{ id: "spread-2", pageIndex: 3, label: "Chapter" }]);
	});

	it("uses page-semantic short titles in brief content and full titles in expanded content", () => {
		const shortTitles: Record<number, string> = { 0: "Contents", 3: "Create", 4: "Query" };
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 0,
			pageSemantics: {
				...semantics(
					{ 0: "Table of Contents", 3: "Creating a relational database", 4: "Querying a database" },
					{ 3: "יא", 4: "יב" },
				),
				indexToShortTitle: (pageIndex) => shortTitles[pageIndex] ?? "",
			},
			direction: "ltr",
		});
		const [contents, chapter] = provider.getBookmarks(context);
		expect(provider.renderBookmark?.(contents)).toBe("Contents");
		expect(provider.renderBookmark?.(chapter)).toBe("Create / Query");
		expect(chapter.label).toBe("Creating a relational database / Querying a database");
		const expanded = provider.renderExpandedBookmark?.(chapter) as HTMLElement;
		expect(expanded.querySelector("strong")?.textContent).toBe(chapter.label);
		expect(expanded.querySelector("small")?.textContent).toBe("יא–יב");
	});

	it("falls back to the full title when a short title is empty, including the title page", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 4,
			pageSemantics: {
				...semantics({ 2: "Title page" }),
				indexToShortTitle: () => "",
			},
			direction: "ltr",
		});
		const [titlePage] = provider.getBookmarks(context);
		expect(provider.renderBookmark?.(titlePage)).toBe("Title page");
	});

	it("includes the entire table of contents rather than a fixed subset of chapters", () => {
		const titles: Record<number, string> = {};
		for (let pageIndex = 2; pageIndex < 28; pageIndex++) titles[pageIndex] = `Chapter ${pageIndex}`;
		const provider = createDefaultBookmarkProvider({
			pagesCount: 30,
			tocPageIndex: 2,
			coverPageIndices: [0, 1, 28, 29],
			pageSemantics: semantics(titles),
			direction: "ltr",
		});
		const bookmarks = provider.getBookmarks(context);
		expect(bookmarks.map((bookmark) => bookmark.pageIndex)).toEqual([
			2,
			...Array.from({ length: 13 }, (_, index) => index * 2 + 3),
		]);
		expect(
			bookmarks.flatMap((bookmark) => (bookmark.data as { pageIndices: number[] }).pageIndices),
		).toEqual(Array.from({ length: 26 }, (_, index) => index + 2));
		expect(provider.renderBookmark?.(bookmarks[13])).toBe("Chapter 27");
	});

	it("shares DELETE and JOIN on pages 13 and 14 without pairing UPDATE on page 12", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 18,
			tocPageIndex: 2,
			coverPageIndices: [0, 1, 16, 17],
			pageSemantics: semantics({ 12: "UPDATE", 13: "DELETE", 14: "JOIN" }, { 13: "13", 14: "14" }),
			direction: "ltr",
		});
		const shared = provider.getBookmarks(context).find((bookmark) => bookmark.pageIndex === 13);
		expect(shared).toMatchObject({
			id: "spread-7",
			pageIndex: 13,
			label: "DELETE / JOIN",
			data: { pageIndices: [13, 14] },
		});
		if (!shared) throw new Error("The facing spread bookmark must be present");
		expect(provider.renderBookmark?.(shared)).toBe("DELETE / JOIN");
		const expanded = provider.renderExpandedBookmark?.(shared) as HTMLElement;
		expect(expanded.querySelector("strong")?.textContent).toBe("DELETE / JOIN");
		expect(expanded.querySelector("small")?.textContent).toBe("13–14");
	});
});
