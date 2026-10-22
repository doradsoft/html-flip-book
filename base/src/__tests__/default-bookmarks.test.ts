import { afterEach, describe, expect, it, vi } from "vitest";
import type { BookmarkContext } from "../bookmarks";
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

describe("createDefaultBookmarkProvider", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("includes the contents page and the same nonempty titles as the default table of contents", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 8,
			tocPageIndex: 2,
			pageSemantics: semantics({ 0: "Cover", 3: "Introduction", 6: "Later chapter" }),
			direction: "ltr",
		});
		expect(provider.getBookmarks(context)).toEqual([
			{ id: "page-0", pageIndex: 0, label: "Cover" },
			{ id: "contents", pageIndex: 2, label: "Table of contents" },
			{ id: "page-3", pageIndex: 3, label: "Introduction" },
			{ id: "page-6", pageIndex: 6, label: "Later chapter" },
		]);
	});

	it("keeps a titled contents page only once and preserves its title", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 5,
			tocPageIndex: 2,
			pageSemantics: semantics({ 2: "Inside this book", 4: "Last chapter" }),
			direction: "ltr",
		});
		expect(provider.getBookmarks(context)).toEqual([
			{ id: "contents", pageIndex: 2, label: "Inside this book" },
			{ id: "page-4", pageIndex: 4, label: "Last chapter" },
		]);
	});

	it("provides the contents bookmark without page semantics and uses the reading locale", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 2,
			direction: "rtl",
		});
		const [bookmark] = provider.getBookmarks(context);
		expect(bookmark).toEqual({ id: "contents", pageIndex: 2, label: "תוכן העניינים" });
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

	it.each([
		-1,
		0,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
	])("ignores an invalid total page count %s", (pagesCount) => {
		const indexToTitle = vi.fn(() => "Chapter");
		const provider = createDefaultBookmarkProvider({
			pagesCount,
			tocPageIndex: 0,
			pageSemantics: { ...semantics({}), indexToTitle },
			direction: "ltr",
		});
		expect(provider.getBookmarks(context)).toEqual([]);
		expect(indexToTitle).not.toHaveBeenCalled();
	});

	it.each([
		-1,
		4,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
	])("omits an invalid contents target %s while keeping chapter entries", (tocPageIndex) => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 4,
			tocPageIndex,
			pageSemantics: semantics({ 3: "Chapter" }),
			direction: "ltr",
		});
		expect(provider.getBookmarks(context)).toEqual([
			{ id: "page-3", pageIndex: 3, label: "Chapter" },
		]);
	});

	it("uses meaningful chapter titles in brief content instead of page numbers", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 0,
			pageSemantics: semantics({ 2: "First", 3: "Second", 4: "Third" }, { 2: "א׳", 3: "ב׳" }),
			direction: "rtl",
		});
		const [, first, second, third] = provider.getBookmarks(context);
		expect(provider.renderBookmark?.(first)).toBe("First");
		expect(provider.renderBookmark?.(second)).toBe("Second");
		expect(provider.renderBookmark?.(third)).toBe("Third");
	});

	it("retains both faces of a physical leaf as distinct content and destinations", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 0,
			pageSemantics: semantics({ 2: "First chapter", 3: "Second chapter" }, { 2: "יא", 3: "יב" }),
			direction: "rtl",
		});
		const bookmarks = provider.getBookmarks(context);
		expect(bookmarks).toEqual([
			{ id: "contents", pageIndex: 0, label: "תוכן העניינים" },
			{ id: "page-2", pageIndex: 2, label: "First chapter" },
			{ id: "page-3", pageIndex: 3, label: "Second chapter" },
		]);
		expect(provider.renderBookmark?.(bookmarks[1])).toBe("First chapter");
		expect(provider.renderBookmark?.(bookmarks[2])).toBe("Second chapter");
		const expanded = provider.renderExpandedBookmark?.(bookmarks[1]) as HTMLElement;
		expect(expanded.querySelector("strong")?.textContent).toBe("First chapter");
		expect(expanded.querySelector("small")?.textContent).toBe("יא");
		const back = provider.renderExpandedBookmark?.(bookmarks[2]) as HTMLElement;
		expect(back.querySelector("strong")?.textContent).toBe("Second chapter");
		expect(back.querySelector("small")?.textContent).toBe("יב");
	});

	it("retains the contents destination when its paired chapter occurs first", () => {
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 3,
			pageSemantics: semantics({ 2: "Introduction", 3: "Contents" }, { 2: "ii", 3: "iii" }),
			direction: "ltr",
		});
		const [chapter, contents] = provider.getBookmarks(context);
		expect(chapter).toEqual({ id: "page-2", pageIndex: 2, label: "Introduction" });
		expect(contents).toEqual({ id: "contents", pageIndex: 3, label: "Contents" });
		expect(provider.renderBookmark?.(contents)).toBe("Contents");
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
		expect(provider.getBookmarks(context)).toEqual([
			{ id: "contents", pageIndex: 2, label: "Table of contents" },
			{ id: "page-3", pageIndex: 3, label: "Introduction" },
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
		expect(provider.getBookmarks(context)).toEqual([
			{ id: "page-4", pageIndex: 4, label: "Chapter" },
		]);
	});

	it("uses page-semantic short titles in brief content and full titles in expanded content", () => {
		const shortTitles: Record<number, string> = { 0: "Contents", 2: "Create", 3: "Query" };
		const provider = createDefaultBookmarkProvider({
			pagesCount: 6,
			tocPageIndex: 0,
			pageSemantics: {
				...semantics(
					{ 0: "Table of Contents", 2: "Creating a relational database", 3: "Querying a database" },
					{ 2: "יא", 3: "יב" },
				),
				indexToShortTitle: (pageIndex) => shortTitles[pageIndex] ?? "",
			},
			direction: "ltr",
		});
		const [contents, chapter, nextChapter] = provider.getBookmarks(context);
		expect(provider.renderBookmark?.(contents)).toBe("Contents");
		expect(provider.renderBookmark?.(chapter)).toBe("Create");
		expect(provider.renderBookmark?.(nextChapter)).toBe("Query");
		expect(chapter.label).toBe("Creating a relational database");
		const expanded = provider.renderExpandedBookmark?.(chapter) as HTMLElement;
		expect(expanded.querySelector("strong")?.textContent).toBe(chapter.label);
		expect(expanded.querySelector("small")?.textContent).toBe("יא");
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
		expect(bookmarks.map((bookmark) => bookmark.pageIndex)).toEqual(
			Array.from({ length: 26 }, (_, index) => index + 2),
		);
		expect(provider.renderBookmark?.(bookmarks[25])).toBe("Chapter 27");
	});
});
