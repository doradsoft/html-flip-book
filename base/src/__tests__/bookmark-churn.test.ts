import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookmarkLeafFrame } from "../bookmark-fold";
import { type Bookmark, type BookmarkContext, BookmarkLayer } from "../bookmarks";

const movingFrame = (position: number): BookmarkLeafFrame => ({
	width: 400,
	height: 600,
	isLTR: true,
	position,
	restingPosition: position,
	kind: "rigid",
	backwardPreview: false,
	zIndices: [10, 20],
});

/**
 * Issue #343: a MutationObserver over six flips counted ~3,600 DOM mutations per
 * flip — mostly same-value attribute/style rewrites and redundant slot reparents
 * across every leaf-attached bookmark. The layer must skip writes when the
 * computed value is unchanged.
 */
describe("BookmarkLayer DOM churn", () => {
	let host: HTMLDivElement;
	let layer: BookmarkLayer;
	let context: BookmarkContext;
	let observer: MutationObserver;
	const bookmarks: Bookmark[] = [
		{ id: "on-leaf-0", pageIndex: 2, label: "Leaf zero" },
		{ id: "on-leaf-2", pageIndex: 5, label: "Leaf two" },
		{ id: "on-leaf-3", pageIndex: 7, label: "Leaf three" },
	];
	const bounds = { left: 0, top: 0, width: 800, height: 600 };

	const observe = () =>
		observer.observe(host, { attributes: true, childList: true, subtree: true });

	beforeEach(() => {
		host = document.createElement("div");
		document.body.append(host);
		context = { currentPageIndex: 3, currentLeafIndex: 1, direction: "ltr" };
		layer = new BookmarkLayer(host, () => context, vi.fn(), 12);
		observer = new MutationObserver(() => {});
	});

	afterEach(() => {
		observer.disconnect();
		layer.destroy();
		host.remove();
	});

	it("emits no mutations when refresh and layout replay unchanged state", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		layer.layout(bounds);

		observe();
		layer.refresh();
		expect(observer.takeRecords()).toEqual([]);
		layer.layout(bounds);
		expect(observer.takeRecords()).toEqual([]);
	});

	it("emits no mutations when an identical leaf frame replays", () => {
		layer.setProvider({ getBookmarks: () => bookmarks });
		layer.layout(bounds);
		const page = document.createElement("div");
		page.style.left = "0px";
		page.style.top = "0px";
		host.append(page);
		// happy-dom reports zero-size boxes; give the motion path real geometry so a
		// fold surface is produced instead of falling back to hidden storage.
		vi.spyOn(host, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
		Object.defineProperty(host, "clientWidth", { value: 800, configurable: true });
		Object.defineProperty(host, "clientHeight", { value: 600, configurable: true });
		const button = host.querySelector<HTMLElement>('[data-bookmark-id="on-leaf-0"]');
		const slot = button?.closest<HTMLElement>(".flipbook-bookmark-slot");
		const rail = slot?.closest<HTMLElement>(".flipbook-bookmarks__rail");
		if (!button || !slot || !rail) throw new Error("missing bookmark DOM");
		vi.spyOn(button, "getBoundingClientRect").mockReturnValue(new DOMRect(420, 20, 20, 80));
		vi.spyOn(slot, "getBoundingClientRect").mockReturnValue(new DOMRect(420, 20, 20, 80));
		vi.spyOn(rail, "getBoundingClientRect").mockReturnValue(new DOMRect(415, 0, 30, 600));
		vi.spyOn(page, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 400, 600));

		layer.updateLeaf(0, movingFrame(0.5), page);
		expect(host.querySelector(".flipbook-bookmark-surface")).not.toBeNull();

		observe();
		layer.updateLeaf(0, movingFrame(0.5), page);
		expect(observer.takeRecords()).toEqual([]);

		// A changed frame must still write — guards must not freeze the pose.
		layer.updateLeaf(0, movingFrame(0.7), page);
		expect(observer.takeRecords().length).toBeGreaterThan(0);
	});
});
