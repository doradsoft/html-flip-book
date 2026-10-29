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
		Array.from(
			host.querySelectorAll<HTMLButtonElement>(
				`.flipbook-bookmarks__rail[data-edge="${edge}"] button`,
			),
		).map((button) => button.dataset.bookmarkId);
	const pressTab = (button: HTMLButtonElement, shiftKey = false) => {
		const event = new KeyboardEvent("keydown", {
			key: "Tab",
			shiftKey,
			bubbles: true,
			cancelable: true,
		});
		button.dispatchEvent(event);
		return event;
	};
	const tabButton = (id: string) => {
		const button = host.querySelector<HTMLButtonElement>(`[data-bookmark-id="${id}"]`);
		if (!button) throw new Error(`Missing bookmark ${id}`);
		const slot = button.closest<HTMLElement>(".flipbook-bookmark-slot");
		if (slot) slot.scrollIntoView = vi.fn();
		return button;
	};

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

	it("does not mutate an unchanged refresh or resting frame, while honoring provider updates", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		const bounds = { left: 100, top: 40, width: 600, height: 500 };
		layer.layout(bounds);
		const page = document.createElement("div");
		host.append(page);
		const frame = {
			width: 300,
			height: 500,
			isLTR: true,
			position: 0,
			restingPosition: 0,
			kind: "paper" as const,
			backwardPreview: false,
			zIndices: [20, 21] as [number, number],
		};
		layer.updateLeaf(0, frame, page);
		const observer = new MutationObserver(() => {});
		observer.observe(document.body, {
			attributes: true,
			childList: true,
			characterData: true,
			subtree: true,
		});
		layer.refresh();
		layer.updateLeaf(0, frame, page);
		expect(observer.takeRecords()).toHaveLength(0);
		const updated = [
			{ id: "first", pageIndex: 2, label: "Updated first" },
			...bookmarks.slice(0, 1),
		];
		layer.setProvider({
			getBookmarks: () => updated,
			order: "reverse-page",
			className: "new-theme",
			placement: "top",
			attachment: "pinned",
		});
		expect(observer.takeRecords().length).toBeGreaterThan(0);
		expect(railIds("top")).toEqual(["later", "first"]);
		expect(tabButton("first").getAttribute("aria-label")).toBe("Updated first");
		expect(tabButton("first").textContent).toBe("Updated first");
		context.currentPageIndex = 8;
		context.currentLeafIndex = 3;
		layer.refresh();
		expect(tabButton("later").getAttribute("aria-current")).toBe("page");
		expect(tabButton("first").hasAttribute("aria-current")).toBe(false);
		observer.disconnect();
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

	it("traverses the provider order across physical rails in both directions", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		expect(buttonIds()).toEqual(["middle", "later", "first"]);
		const first = tabButton("first");
		const middle = tabButton("middle");
		const later = tabButton("later");
		first.focus();
		expect(pressTab(first).defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(middle);
		pressTab(middle, true);
		expect(document.activeElement).toBe(first);
		layer.setProvider({ getBookmarks: () => bookmarks, order: "reverse-page" });
		later.focus();
		pressTab(later);
		expect(document.activeElement).toBe(middle);
		layer.setProvider({
			getBookmarks: () => bookmarks,
			order: (a, b) => a.label.localeCompare(b.label),
		});
		first.focus();
		pressTab(first);
		expect(document.activeElement).toBe(later);
		expect([first, middle, later].map((button) => button.getAttribute("tabindex"))).toEqual([
			null,
			null,
			null,
		]);
	});

	it("skips hidden fixed-side tabs and exits to native controls around the navigation", () => {
		layer.setProvider({
			getBookmarks: () => [{ id: "cover", pageIndex: 0, label: "Cover" }, ...bookmarks],
			placement: "left",
		});
		const before = document.createElement("button");
		const after = document.createElement("button");
		const hidden = document.createElement("button");
		hidden.hidden = true;
		host.prepend(before);
		host.append(hidden, after);
		const rect = new DOMRect(0, 0, 40, 40);
		for (const external of [before, after, hidden])
			vi.spyOn(external, "getClientRects").mockReturnValue(
				Object.assign([rect], { item: (index: number) => (index === 0 ? rect : null) }),
			);
		const cover = tabButton("cover");
		const first = tabButton("first");
		expect(tabButton("middle").hidden).toBe(true);
		expect(tabButton("later").hidden).toBe(true);
		cover.focus();
		pressTab(cover);
		expect(document.activeElement).toBe(first);
		pressTab(first);
		expect(document.activeElement).toBe(after);
		cover.focus();
		pressTab(cover, true);
		expect(document.activeElement).toBe(before);
	});

	it("allows native Tab to leave the document when there is no external focus target", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		const last = tabButton("later");
		last.tabIndex = 0;
		last.focus();
		expect(pressTab(last).defaultPrevented).toBe(false);
		expect(tabButton("first").tabIndex).toBe(-1);
		expect(tabButton("middle").tabIndex).toBe(-1);
		expect(last.tabIndex).toBe(-1);
		layer.destroy();
		expect(last.getAttribute("tabindex")).toBe("0");
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

	it("shares one stable tab between facing pages and keeps the original provider object", () => {
		const first = { id: "delete", pageIndex: 3, label: "Delete", data: { chapter: 1 } };
		const second = { id: "join", pageIndex: 4, label: "Join", data: { chapter: 2 } };
		const onClick = vi.fn();
		context = { ...context, currentPageIndex: 1, currentLeafIndex: 0 };
		layer.setProvider({ getBookmarks: () => [second, first], placement: "top", onClick });
		expect(buttonIds()).toEqual(["delete"]);
		const button = host.querySelector<HTMLButtonElement>(".flipbook-bookmark");
		button?.click();
		expect(onClick).toHaveBeenLastCalledWith(context.currentLeafIndex, first);
		context = { ...context, currentPageIndex: 3, currentLeafIndex: 1 };
		layer.refresh();
		expect(host.querySelector(".flipbook-bookmark")).toBe(button);
		expect(buttonIds()).toEqual(["delete"]);
		button?.click();
		expect(onClick).toHaveBeenLastCalledWith(context.currentLeafIndex, first);
		expect(button?.dataset.spreadIndex).toBe("2");
		layer.setProvider({
			getBookmarks: () => [first, second],
			placement: "top",
			order: "reverse-page",
			onClick,
		});
		expect(buttonIds()).toEqual(["join"]);
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

	it("sorts spread tabs consistently without changing labels when pages turn", () => {
		context = { ...context, currentPageIndex: 1, currentLeafIndex: 0 };
		layer.setProvider({
			getBookmarks: () => [
				{ id: "spread-a", pageIndex: 3, label: "Zebra" },
				{ id: "spread-b", pageIndex: 5, label: "Beta" },
			],
			placement: "top",
			attachment: "pinned",
			order: (a, b) => a.label.localeCompare(b.label),
		});
		expect(buttonIds()).toEqual(["spread-b", "spread-a"]);
		context = { ...context, currentPageIndex: 5, currentLeafIndex: 2 };
		layer.refresh();
		expect(buttonIds()).toEqual(["spread-b", "spread-a"]);
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

	it.each(["ltr", "rtl"] as const)(
		"keeps attached top-bottom bookmarks on the same vertical edge through %s turns",
		(direction) => {
			context = { ...context, currentPageIndex: 0, currentLeafIndex: 0, direction };
			layer.setProvider({ getBookmarks: () => bookmarks, placement: "top-bottom" });
			expect(railIds("top")).toEqual(["first", "middle"]);
			expect(railIds("bottom")).toEqual(["later"]);
			context = { ...context, currentPageIndex: 9, currentLeafIndex: 4 };
			layer.refresh();
			expect(railIds("top")).toEqual(["first", "middle"]);
			expect(railIds("bottom")).toEqual(["later"]);
		},
	);

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
		expect(first?.parentElement?.parentElement?.dataset.leafSide).toBe("left");
		expect(middle?.parentElement?.parentElement?.dataset.leafSide).toBe("right");
		const slot = middle?.style.getPropertyValue("--bookmark-slot");
		context = { ...context, currentPageIndex: 7, currentLeafIndex: 3 };
		layer.refresh();
		expect(middle?.parentElement?.parentElement?.dataset.leafSide).toBe("left");
		expect(middle?.style.getPropertyValue("--bookmark-slot")).toBe(slot);
		context = { ...context, direction: "rtl" };
		layer.refresh();
		expect(middle?.parentElement?.parentElement?.dataset.leafSide).toBe("right");
	});

	it.each(["top", "bottom", "left", "right"] as const)(
		"places all bookmarks on a configured %s edge",
		(placement) => {
			layer.setProvider({ getBookmarks: () => bookmarks, placement, attachment: "pinned" });
			expect(railIds(placement)).toEqual(["first", "middle", "later"]);
			expect(layer.getInsets()).toEqual({ top: 0, right: 0, bottom: 0, left: 0, [placement]: 52 });
		},
	);

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
	])(
		"$direction $placement: only attaches tabs whose leaves occupy that side",
		({ direction, placement, turned }) => {
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
		},
	);

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

	it("keeps stacked range positions stable across turns and clears them on horizontal placement", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		layer.layout({ left: 52, top: 0, width: 400, height: 52 });
		const first = tabButton("first").parentElement;
		const middle = tabButton("middle").parentElement;
		const later = tabButton("later").parentElement;
		expect(later?.dataset.stackLayer).toBe("2");
		expect(later?.dataset.stackRow).toBe("0");
		expect(first?.style.width).toBe("31.2px");
		expect(middle?.style.top).toBe("14px");
		expect(later?.style.width).toBe("52px");
		expect(Number(first?.style.zIndex)).toBeGreaterThan(Number(later?.style.zIndex));
		context = { ...context, currentPageIndex: 9, currentLeafIndex: 4 };
		layer.refresh();
		expect(later?.dataset.stackLayer).toBe("2");
		expect(later?.style.top).toBe("0px");
		expect(later?.parentElement?.dataset.edge).toBe("left");
		layer.layout({ left: 52, top: 0, width: 400, height: 80 });
		expect(later?.dataset.stackLayer).toBe("0");
		expect(later?.style.top).toBe("56px");
		expect(later?.style.width).toBe("52px");
		layer.setProvider({ getBookmarks: () => bookmarks, placement: "top" });
		expect(later?.dataset.stackLayer).toBeUndefined();
		expect(later?.style.width).toBe("");
		expect(later?.style.top).toBe("");
		expect(later?.style.getPropertyValue("--bookmark-exposed-depth")).toBe("");
	});

	it("places each rail at its resting leaf depth above the backing cover", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		layer.layout({ left: 52, top: 0, width: 400, height: 300 });
		const left = host.querySelector<HTMLElement>('.flipbook-bookmarks__rail[data-edge="left"]');
		const right = host.querySelector<HTMLElement>('.flipbook-bookmarks__rail[data-edge="right"]');
		expect(left?.style.zIndex).toBe("1");
		expect(right?.style.zIndex).toBe("8");
		context = { ...context, currentPageIndex: 9, currentLeafIndex: 4 };
		layer.refresh();
		expect(left?.style.zIndex).toBe("7");
		expect(right?.style.zIndex).toBe("0");
		context = { ...context, currentPageIndex: 0, currentLeafIndex: 0 };
		layer.refresh();
		expect(right?.style.zIndex).toBe("12");
		// The root precedes the pages, so this equal depth remains underneath a closed cover.
		expect(host.firstElementChild?.className).toBe("flipbook-bookmarks");
	});

	it("jumps to the clicked page by default", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		host.querySelector<HTMLButtonElement>('[data-bookmark-id="middle"]')?.click();
		expect(jump).toHaveBeenCalledExactlyOnceWith(5);
	});

	it("keeps selecting bookmark text from activating its navigation action", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		layer.setMouseMode("select");
		const button = host.querySelector<HTMLButtonElement>('[data-bookmark-id="middle"]');
		const content = button?.querySelector<HTMLElement>(".flipbook-bookmark__content");
		expect(content?.inert).toBe(false);
		if (!button || !content) throw new Error("Expected selectable bookmark content");
		const range = document.createRange();
		range.selectNodeContents(content);
		const selection = document.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
		button.click();
		expect(jump).not.toHaveBeenCalled();
		selection?.removeAllRanges();
		button.click();
		expect(jump).toHaveBeenCalledExactlyOnceWith(5);
		layer.setMouseMode("turn");
		expect(content.inert).toBe(true);
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
