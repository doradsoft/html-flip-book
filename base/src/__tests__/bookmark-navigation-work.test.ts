import { describe, expect, it } from "vitest";
import { type BookmarkContext, BookmarkLayer } from "../bookmarks";

function navigationStackReads(count: number, attachment: "leaf" | "pinned"): number {
	const host = document.createElement("div");
	document.body.append(host);
	const context: BookmarkContext = { currentPageIndex: 3, currentLeafIndex: 1, direction: "ltr" };
	const layer = new BookmarkLayer(
		host,
		() => context,
		() => {},
		count * 2 + 4,
	);
	const bookmarks = Array.from({ length: count }, (_, index) => ({
		id: `chapter-${index}`,
		pageIndex: index * 2 + 2,
		label: `Chapter ${index}`,
	}));
	const bounds = { left: 100, top: 40, width: 600, height: 500 };
	try {
		layer.setProvider({ getBookmarks: () => bookmarks, attachment });
		layer.layout(bounds, 900);
		const slots = Array.from(host.querySelectorAll<HTMLElement>(".flipbook-bookmark-slot"));
		const reads = new Set<HTMLElement>();
		for (const slot of slots) {
			const style = slot.style;
			const proxy = new Proxy(style, {
				get(target, name) {
					if (name === "getPropertyValue")
						return (property: string) => {
							if (property === "top") reads.add(slot);
							return target.getPropertyValue(property);
						};
					const value = Reflect.get(target, name, target);
					return typeof value === "function" ? value.bind(target) : value;
				},
			});
			Object.defineProperty(slot, "style", { configurable: true, get: () => proxy });
		}
		context.currentPageIndex = 5;
		context.currentLeafIndex = 2;
		layer.refreshForNavigation();
		const result = reads.size;
		const geometry = slots.map((slot) => slot.getAttribute("style"));
		// A complete relayout must produce the same geometry as the navigation path.
		layer.layout(bounds, 900);
		expect(slots.map((slot) => slot.getAttribute("style"))).toEqual(geometry);
		return result;
	} finally {
		layer.destroy();
		host.remove();
	}
}

describe("bookmark navigation work", () => {
	it.each(["reorder", "remove"] as const)(
		"keeps a complete relayout when navigation must %s tabs",
		(change) => {
			const host = document.createElement("div");
			document.body.append(host);
			const context: BookmarkContext = {
				currentPageIndex: 3,
				currentLeafIndex: 1,
				direction: "ltr",
			};
			const bookmarks = Array.from({ length: 8 }, (_, index) => ({
				id: `chapter-${index}`,
				pageIndex: index * 2 + 2,
				label: `Chapter ${index}`,
			}));
			const layer = new BookmarkLayer(
				host,
				() => context,
				() => {},
				20,
			);
			const bounds = { left: 100, top: 40, width: 600, height: 500 };
			const slots = () => Array.from(host.querySelectorAll<HTMLElement>(".flipbook-bookmark-slot"));
			try {
				layer.setProvider({
					getBookmarks: () =>
						change === "remove" && context.currentPageIndex >= 5 ? bookmarks.slice(1) : bookmarks,
					order: (a, b) =>
						(change === "reorder" && context.currentPageIndex >= 5 ? -1 : 1) *
						(a.pageIndex - b.pageIndex),
				});
				layer.layout(bounds, 900);
				const target = host.querySelector<HTMLElement>(
					'[data-bookmark-id="chapter-1"]',
				)?.parentElement;
				expect(target).not.toBeNull();
				const previousTop = target?.style.top;
				context.currentPageIndex = 5;
				context.currentLeafIndex = 2;
				layer.refreshForNavigation();
				expect(slots()).toHaveLength(change === "remove" ? 7 : 8);
				expect(target?.style.top).not.toBe(previousTop);
				const geometry = slots().map((slot) => slot.getAttribute("style"));
				layer.layout(bounds, 900);
				expect(slots().map((slot) => slot.getAttribute("style"))).toEqual(geometry);
			} finally {
				layer.destroy();
				host.remove();
			}
		},
	);

	it.each(["leaf", "pinned"] as const)(
		"updates only the moved tab's stack geometry with %s bookmarks",
		(attachment) => {
			expect({
				tabs16: navigationStackReads(16, attachment),
				tabs96: navigationStackReads(96, attachment),
			}).toEqual({ tabs16: 1, tabs96: 1 });
		},
	);
});
