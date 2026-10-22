import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Bookmark, type BookmarkContext, BookmarkLayer } from "../bookmarks";

describe("BookmarkLayer", () => {
	let host: HTMLDivElement;
	let layer: BookmarkLayer;
	let context: BookmarkContext;
	let jump: ReturnType<typeof vi.fn>;
	const bookmarks: Bookmark[] = [
		{ id: "later", pageIndex: 8, label: "Later" },
		{ id: "first", pageIndex: 2, label: "First", data: { chapter: 1 } },
		{ id: "middle", pageIndex: 5, label: "Middle" },
	];
	const buttonIds = () =>
		Array.from(host.querySelectorAll<HTMLButtonElement>(".flipbook-bookmark")).map(
			(button) => button.dataset.bookmarkId,
		);
	const railIds = (edge: string) =>
		Array.from(host.querySelectorAll<HTMLButtonElement>(`[data-edge="${edge}"] button`)).map(
			(button) => button.dataset.bookmarkId,
		);

	beforeEach(() => {
		host = document.createElement("div");
		document.body.append(host);
		context = { currentPageIndex: 3, currentLeafIndex: 1, direction: "ltr" };
		jump = vi.fn();
		layer = new BookmarkLayer(host, () => context, jump, 12);
	});

	afterEach(() => {
		layer.destroy();
		host.remove();
	});

	it("orders bookmarks by target page without changing provider data", () => {
		layer.setProvider({ getBookmarks: () => bookmarks, placement: "top" });
		expect(buttonIds()).toEqual(["first", "middle", "later"]);
		expect(bookmarks.map((bookmark) => bookmark.id)).toEqual(["later", "first", "middle"]);
	});

	it("supports reverse page order and a custom comparator", () => {
		layer.setProvider({
			getBookmarks: () => bookmarks,
			order: "reverse-page",
			placement: "top",
			attachment: "pinned",
		});
		expect(buttonIds()).toEqual(["later", "middle", "first"]);
		layer.setProvider({
			getBookmarks: () => bookmarks,
			placement: "top",
			attachment: "pinned",
			order: (a, b) => a.label.localeCompare(b.label),
		});
		expect(buttonIds()).toEqual(["first", "later", "middle"]);
	});

	it("ignores duplicate identities and targets outside the book", () => {
		layer.setProvider({
			getBookmarks: () => [
				...bookmarks,
				{ ...bookmarks[0], label: "Duplicate" },
				{ id: "negative", pageIndex: -1, label: "Negative" },
				{ id: "beyond", pageIndex: 12, label: "Beyond" },
				{ id: "fraction", pageIndex: 1.5, label: "Fraction" },
				{ id: "nan", pageIndex: Number.NaN, label: "NaN" },
				{ id: "", pageIndex: 1, label: "Missing identity" },
			],
			placement: "top",
		});
		expect(buttonIds()).toEqual(["first", "middle", "later"]);
	});

	it("pairs front and back entries into the same tab and activates the original face object", () => {
		const first = { id: "recto", pageIndex: 2, label: "Recto", data: { side: "front" } };
		const second = { id: "verso", pageIndex: 3, label: "Verso", data: { side: "back" } };
		const onClick = vi.fn();
		context = { ...context, currentPageIndex: 1, currentLeafIndex: 0 };
		layer.setProvider({ getBookmarks: () => [second, first], placement: "top", onClick });
		expect(buttonIds()).toEqual(["recto"]);
		const button = host.querySelector<HTMLButtonElement>(".flipbook-bookmark");
		button?.click();
		expect(onClick).toHaveBeenLastCalledWith(context.currentLeafIndex, first);
		context = { ...context, currentPageIndex: 3, currentLeafIndex: 1 };
		layer.refresh();
		expect(host.querySelector(".flipbook-bookmark")).toBe(button);
		expect(buttonIds()).toEqual(["verso"]);
		button?.click();
		expect(onClick).toHaveBeenLastCalledWith(context.currentLeafIndex, second);
		layer.setProvider({
			getBookmarks: () => [first, second],
			placement: "top",
			order: "reverse-page",
			onClick,
		});
		expect(buttonIds()).toEqual(["verso"]);
		host.querySelector<HTMLButtonElement>(".flipbook-bookmark")?.click();
		expect(onClick).toHaveBeenLastCalledWith(context.currentLeafIndex, second);
	});

	it("splits tabs by turned leaves and mirrors sides for RTL", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		expect(railIds("left")).toEqual(["first"]);
		expect(railIds("right")).toEqual(["middle", "later"]);
		context = { ...context, direction: "rtl" };
		layer.refresh();
		expect(railIds("right")).toEqual(["first"]);
		expect(railIds("left")).toEqual(["middle", "later"]);
	});

	it("orders paired tabs using their displayed faces", () => {
		context = { ...context, currentPageIndex: 1, currentLeafIndex: 0 };
		layer.setProvider({
			getBookmarks: () => [
				{ id: "front-a", pageIndex: 2, label: "Zebra" },
				{ id: "back-a", pageIndex: 3, label: "Alpha" },
				{ id: "front-b", pageIndex: 4, label: "Beta" },
				{ id: "back-b", pageIndex: 5, label: "Yankee" },
			],
			placement: "top",
			attachment: "pinned",
			order: (a, b) => a.label.localeCompare(b.label),
		});
		expect(buttonIds()).toEqual(["front-b", "front-a"]);
		context = { ...context, currentPageIndex: 5, currentLeafIndex: 2 };
		layer.refresh();
		expect(buttonIds()).toEqual(["back-a", "back-b"]);
	});

	it("redistributes pinned top-bottom bookmarks with the turned leaves", () => {
		layer.setProvider({
			getBookmarks: () => bookmarks,
			placement: "top-bottom",
			attachment: "pinned",
		});
		expect(railIds("top")).toEqual(["first"]);
		expect(railIds("bottom")).toEqual(["middle", "later"]);
		context = { ...context, currentPageIndex: 9, currentLeafIndex: 4 };
		layer.refresh();
		expect(railIds("top")).toEqual(["first", "middle", "later"]);
		expect(railIds("bottom")).toEqual([]);
	});

	it.each([
		"ltr",
		"rtl",
	] as const)("keeps attached top-bottom bookmarks on the same vertical edge through %s turns", (direction) => {
		context = { ...context, currentPageIndex: 0, currentLeafIndex: 0, direction };
		layer.setProvider({ getBookmarks: () => bookmarks, placement: "top-bottom" });
		expect(railIds("top")).toEqual(["first", "middle"]);
		expect(railIds("bottom")).toEqual(["later"]);
		context = { ...context, currentPageIndex: 9, currentLeafIndex: 4 };
		layer.refresh();
		expect(railIds("top")).toEqual(["first", "middle"]);
		expect(railIds("bottom")).toEqual(["later"]);
	});

	it("splits attached top-bottom bookmarks by their configured sort order", () => {
		layer.setProvider({
			getBookmarks: () => bookmarks,
			placement: "top-bottom",
			order: "reverse-page",
		});
		expect(railIds("top")).toEqual(["later", "middle"]);
		expect(railIds("bottom")).toEqual(["first"]);
	});

	it("anchors horizontal tabs to their owning leaf and keeps their slots through turns", () => {
		layer.setProvider({ getBookmarks: () => bookmarks, placement: "top" });
		const first = host.querySelector<HTMLElement>('[data-bookmark-id="first"]');
		const middle = host.querySelector<HTMLElement>('[data-bookmark-id="middle"]');
		expect(first?.parentElement?.dataset.leafSide).toBe("left");
		expect(middle?.parentElement?.dataset.leafSide).toBe("right");
		const slot = middle?.style.getPropertyValue("--bookmark-slot");
		context = { ...context, currentPageIndex: 7, currentLeafIndex: 3 };
		layer.refresh();
		expect(middle?.parentElement?.dataset.leafSide).toBe("left");
		expect(middle?.style.getPropertyValue("--bookmark-slot")).toBe(slot);
		context = { ...context, direction: "rtl" };
		layer.refresh();
		expect(middle?.parentElement?.dataset.leafSide).toBe("right");
	});

	it.each([
		"top",
		"bottom",
		"left",
		"right",
	] as const)("places all bookmarks on a configured %s edge", (placement) => {
		layer.setProvider({ getBookmarks: () => bookmarks, placement, attachment: "pinned" });
		expect(railIds(placement)).toEqual(["first", "middle", "later"]);
		expect(layer.getInsets()).toEqual({ top: 0, right: 0, bottom: 0, left: 0, [placement]: 52 });
	});

	it("reserves split edges consistently while pages move between them", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		expect(layer.getInsets()).toEqual({ top: 0, right: 52, bottom: 0, left: 52 });
		context = { ...context, currentPageIndex: 0, currentLeafIndex: 0 };
		layer.refresh();
		expect(railIds("left")).toEqual([]);
		expect(layer.getInsets()).toEqual({ top: 0, right: 52, bottom: 0, left: 52 });
	});

	it.each([
		{ direction: "ltr" as const, placement: "left" as const, turned: true },
		{ direction: "ltr" as const, placement: "right" as const, turned: false },
		{ direction: "rtl" as const, placement: "left" as const, turned: false },
		{ direction: "rtl" as const, placement: "right" as const, turned: true },
	])("$direction $placement: only attaches tabs whose leaves occupy that side", ({
		direction,
		placement,
		turned,
	}) => {
		context = { ...context, direction };
		layer.setProvider({ getBookmarks: () => bookmarks, placement });
		const visibleIds = () =>
			Array.from(host.querySelectorAll<HTMLButtonElement>(".flipbook-bookmark"))
				.filter((button) => !button.hidden)
				.map((button) => button.dataset.bookmarkId);
		expect(visibleIds()).toEqual(turned ? ["first"] : ["middle", "later"]);
		const insets = layer.getInsets();
		context = { ...context, currentPageIndex: 9, currentLeafIndex: 4 };
		layer.refresh();
		expect(visibleIds()).toEqual(turned ? ["first", "middle", "later"] : []);
		expect(layer.getInsets()).toEqual(insets);
		layer.setProvider({ getBookmarks: () => bookmarks, placement, attachment: "pinned" });
		expect(visibleIds()).toEqual(["first", "middle", "later"]);
	});

	it("positions rails around cover bounds and reads a consumer depth", () => {
		host.style.setProperty("--flipbook-bookmark-depth", "36px");
		layer.setProvider({ getBookmarks: () => bookmarks, placement: "top-bottom" });
		layer.layout({ left: 40, top: 50, width: 400, height: 300 });
		const top = host.querySelector<HTMLElement>('[data-edge="top"]');
		const right = host.querySelector<HTMLElement>('[data-edge="right"]');
		expect(layer.getInsets()).toEqual({ top: 36, right: 0, bottom: 36, left: 0 });
		expect(top?.style.top).toBe("14px");
		expect(top?.style.left).toBe("40px");
		expect(top?.style.width).toBe("400px");
		expect(top?.style.height).toBe("36px");
		expect(right?.style.left).toBe("440px");
	});

	it("jumps to the clicked page by default", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		host.querySelector<HTMLButtonElement>('[data-bookmark-id="middle"]')?.click();
		expect(jump).toHaveBeenCalledExactlyOnceWith(5);
	});

	it("calls custom actions with the latest leaf and original bookmark object", () => {
		const action = vi.fn();
		layer.setProvider({ getBookmarks: () => bookmarks, onClick: action });
		context = { ...context, currentPageIndex: 7, currentLeafIndex: 3 };
		host.querySelector<HTMLButtonElement>('[data-bookmark-id="first"]')?.click();
		expect(action).toHaveBeenCalledExactlyOnceWith(3, bookmarks[1]);
		expect(action.mock.calls[0][1]).toBe(bookmarks[1]);
		expect(jump).not.toHaveBeenCalled();
	});

	it("renders strings literally and accepts custom DOM content and CSS classes", () => {
		const node = document.createElement("strong");
		node.textContent = "Chapter";
		layer.setProvider({
			getBookmarks: () => [{ ...bookmarks[0], className: "custom-tab" }],
			renderBookmark: () => "<strong>Literal</strong>",
			className: "custom-layer",
		});
		expect(host.querySelector(".custom-layer .custom-tab")?.textContent).toBe(
			"<strong>Literal</strong>",
		);
		expect(host.querySelector("strong")).toBeNull();
		layer.setProvider({ getBookmarks: () => [bookmarks[0]], renderBookmark: () => node });
		expect(host.querySelector(".flipbook-bookmark > .flipbook-bookmark__content")?.firstChild).toBe(
			node,
		);
	});

	it("preserves controls and custom content while stable bookmarks refresh", () => {
		const renderer = vi.fn((bookmark: Bookmark) => bookmark.label);
		layer.setProvider({ getBookmarks: () => bookmarks, renderBookmark: renderer });
		const button = host.querySelector<HTMLButtonElement>('[data-bookmark-id="middle"]');
		button?.focus();
		layer.refresh();
		expect(host.querySelector('[data-bookmark-id="middle"]')).toBe(button);
		expect(document.activeElement).toBe(button);
		expect(renderer).toHaveBeenCalledTimes(3);
	});

	it("stops bookmark presses before the book gesture handler", () => {
		const down = vi.fn();
		host.addEventListener("mousedown", down);
		layer.setProvider({ getBookmarks: () => bookmarks });
		host.querySelector("button")?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		expect(down).not.toHaveBeenCalled();
		expect(host.querySelector("[data-flipbook-no-flip]")).not.toBeNull();
	});

	it("removes retired bookmarks, clears insets, and disables detached controls on destroy", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		const button = host.querySelector<HTMLButtonElement>("button");
		layer.setProvider();
		expect(buttonIds()).toEqual([]);
		expect(layer.getInsets()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
		layer.setProvider({ getBookmarks: () => bookmarks });
		layer.destroy();
		button?.click();
		expect(jump).not.toHaveBeenCalled();
		expect(host.children).toHaveLength(0);
		layer.refresh();
		expect(host.children).toHaveLength(0);
	});
});
