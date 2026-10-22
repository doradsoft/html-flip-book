import type { Bookmark, BookmarkProvider } from "./bookmarks";
import { t } from "./intl";
import type { PageSemantics } from "./page-semantics";

export interface DefaultBookmarkOptions {
	pagesCount: number;
	tocPageIndex: number;
	pageSemantics?: PageSemantics;
	/** Cover page indices resolved by the book; cover pages never become default bookmarks. */
	coverPageIndices?: readonly number[];
	direction: "ltr" | "rtl";
}

interface DefaultEntry {
	bookmark: Bookmark;
	shortTitle: string;
	semanticName: string;
}

function entryForPage(
	pageIndex: number,
	options: DefaultBookmarkOptions,
): DefaultEntry | undefined {
	const title = options.pageSemantics?.indexToTitle(pageIndex) ?? "";
	const isToc = pageIndex === options.tocPageIndex;
	if (!isToc && title.length === 0) return undefined;
	const fullTitle =
		title || t("command.jumpToToc", options.direction === "rtl" ? "he-IL" : "en-US");
	return {
		bookmark: {
			id: isToc ? "contents" : `page-${pageIndex}`,
			pageIndex,
			label: fullTitle,
		},
		shortTitle: options.pageSemantics?.indexToShortTitle?.(pageIndex) || fullTitle,
		semanticName: options.pageSemantics?.indexToSemanticName(pageIndex) || String(pageIndex + 1),
	};
}

function entriesForBook(options: DefaultBookmarkOptions): DefaultEntry[] {
	const count =
		Number.isSafeInteger(options.pagesCount) && options.pagesCount > 0 ? options.pagesCount : 0;
	const entries: DefaultEntry[] = [];
	const covers = new Set(options.coverPageIndices);
	for (let pageIndex = 0; pageIndex < count; pageIndex++) {
		if (covers.has(pageIndex)) continue;
		const entry = entryForPage(pageIndex, options);
		if (!entry) continue;
		entries.push(entry);
	}
	return entries;
}

function entryForSpread(spreadIndex: number, entries: DefaultEntry[]): DefaultEntry {
	const contents = entries.find((entry) => entry.bookmark.id === "contents");
	const start = spreadIndex === 0 ? 0 : spreadIndex * 2 - 1;
	return {
		bookmark: {
			id: contents ? "contents" : `spread-${spreadIndex}`,
			pageIndex: contents?.bookmark.pageIndex ?? start,
			label: entries.map((entry) => entry.bookmark.label).join(" / "),
			data: { pageIndices: entries.map((entry) => entry.bookmark.pageIndex) },
		},
		shortTitle: entries.map((entry) => entry.shortTitle).join(" / "),
		semanticName: entries.map((entry) => entry.semanticName).join("–"),
	};
}

function entriesBySpread(entries: DefaultEntry[]): DefaultEntry[] {
	const spreads = new Map<number, DefaultEntry[]>();
	for (const entry of entries) {
		const spreadIndex = Math.floor((entry.bookmark.pageIndex + 1) / 2);
		const facing = spreads.get(spreadIndex) ?? [];
		facing.push(entry);
		spreads.set(spreadIndex, facing);
	}
	return Array.from(spreads, ([spreadIndex, facing]) => entryForSpread(spreadIndex, facing));
}

/** Build one bookmark shared by the two facing pages in every titled spread. */
export function createDefaultBookmarkProvider(options: DefaultBookmarkOptions): BookmarkProvider {
	const entries = entriesBySpread(entriesForBook(options));
	const bookmarks = entries.map((entry) => entry.bookmark);
	const entriesById = new Map(entries.map((entry) => [entry.bookmark.id, entry]));
	const pageName = (bookmark: Bookmark) =>
		entriesById.get(bookmark.id)?.semanticName || String(bookmark.pageIndex + 1);
	return {
		getBookmarks: () => bookmarks,
		renderBookmark: (bookmark) => entriesById.get(bookmark.id)?.shortTitle || bookmark.label,
		renderExpandedBookmark: (bookmark) => {
			const content = document.createElement("span");
			content.className = "flipbook-bookmark-default";
			content.dir = options.direction;
			const title = document.createElement("strong");
			title.textContent = bookmark.label;
			const page = document.createElement("small");
			page.textContent = pageName(bookmark);
			content.append(title, page);
			return content;
		},
	};
}
