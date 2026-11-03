import { describe, expect, it, vi } from "vitest";
import * as bookmarkDom from "../bookmark-dom";
import { computePageFoldFromPoint } from "../page-fold";

import { box, dualFaces, setup } from "./bookmark-motion-fixture";

describe("bookmark motion frame work", () => {
	it.each([true, false])(
		"keeps initial material style changes off the connected book (LTR=%s)",
		(isLTR) => {
			const { host, page, button, motion, frame } = setup(isLTR);
			const faces = dualFaces(host, button);
			const bookmark = { id: "chapter", pageIndex: 2 };
			expect(host.isConnected).toBe(true);
			motion.prepare(bookmark, button, frame, page, faces);
			const connected: string[] = [];
			const writeStyle = bookmarkDom.writeStyle;
			const writes = vi
				.spyOn(bookmarkDom, "writeStyle")
				.mockImplementation((element, name, value) => {
					if (element.isConnected && element.style.getPropertyValue(name) !== value)
						connected.push(name);
					writeStyle(element, name, value);
				});
			try {
				motion.sync(bookmark, button, frame, page, "", faces);
				expect(host.querySelectorAll(".flipbook-bookmark-surface").length).toBeGreaterThan(0);
				expect(connected).toEqual([]);
			} finally {
				writes.mockRestore();
				motion.destroy();
				host.remove();
			}
		},
	);

	it("measures the host once for all clipped tab parts and refreshes it for the next turn", () => {
		const { host, page, rail, button, motion, frame } = setup();
		const slot = document.createElement("div");
		slot.className = "flipbook-bookmark-slot";
		const group = document.createElement("div");
		group.className = "flipbook-bookmarks__leaf-rail";
		rail.className = "flipbook-bookmarks__rail";
		rail.append(group);
		group.append(slot);
		slot.append(button);
		for (const element of [slot, group, rail]) {
			element.getBoundingClientRect = () => box(800, 100, 36, 28);
		}
		const bounds = vi.spyOn(host, "getBoundingClientRect");
		const bookmark = { id: "chapter", pageIndex: 2 };
		try {
			motion.prepare(bookmark, button, frame, page);
			expect(bounds).toHaveBeenCalledTimes(1);
			motion.sync(bookmark, button, frame, page);
			expect(bounds).toHaveBeenCalledTimes(1);
			expect(host.querySelector(".flipbook-bookmark-surface")).not.toBeNull();
			motion.restoreAll();
			motion.prepare(bookmark, button, frame, page);
			expect(bounds).toHaveBeenCalledTimes(2);
		} finally {
			bounds.mockRestore();
			motion.destroy();
			host.remove();
		}
	});

	it("updates moving geometry without rechecking static tab styles on every frame", () => {
		const { host, page, button, motion, frame } = setup();
		const bookmark = { id: "chapter", pageIndex: 2 };
		motion.sync(bookmark, button, frame, page);
		const surface = host.querySelector<HTMLElement>(".flipbook-bookmark-surface");
		const before = surface?.style.transform;
		const reads = vi.spyOn(button.style, "getPropertyValue");
		try {
			motion.sync(
				bookmark,
				button,
				{ ...frame, fold: computePageFoldFromPoint(400, 600, { x: 100, y: 30 }, "top") },
				page,
			);
			expect(surface?.style.transform).not.toBe(before);
			expect(reads.mock.calls.map(([name]) => name)).not.toContain("width");
		} finally {
			reads.mockRestore();
			motion.destroy();
			host.remove();
		}
	});

	it("prepares geometry without changing the resting DOM, then draws without layout reads", () => {
		const { host, page, button, motion, frame } = setup();
		const bookmark = { id: "chapter", pageIndex: 2 };
		const observer = new MutationObserver(() => {});
		observer.observe(host, { attributes: true, childList: true, subtree: true });
		motion.prepare(bookmark, button, frame, page);
		expect(observer.takeRecords()).toEqual([]);
		const bounds = vi.spyOn(host, "getBoundingClientRect");
		motion.sync(bookmark, button, frame, page);
		motion.prepare(bookmark, button, frame, page);
		expect(bounds).not.toHaveBeenCalled();
		expect(host.querySelector(".flipbook-bookmark-placeholder")).not.toBeNull();
		motion.restoreAll();
		observer.disconnect();
		host.remove();
	});

	it("discards prepared geometry when a resize or provider refresh resets motion", () => {
		const { host, page, button, motion, frame } = setup();
		const bookmark = { id: "chapter", pageIndex: 2 };
		motion.prepare(bookmark, button, frame, page);
		motion.restoreAll();
		const bounds = vi.spyOn(host, "getBoundingClientRect");
		motion.sync(bookmark, button, frame, page);
		expect(bounds).toHaveBeenCalled();
		motion.destroy();
		host.remove();
	});

	it.each([true, false])(
		"does not mutate an unchanged fold frame but still updates geometry (LTR=%s)",
		(isLTR) => {
			const { host, page, button, motion, frame } = setup(isLTR);
			const faces = dualFaces(host, button);
			const bookmark = { id: "chapter", pageIndex: 2 };
			motion.sync(bookmark, button, frame, page, "", faces);
			const surface = host.querySelector<HTMLElement>(".flipbook-bookmark-surface");
			const before = surface?.style.transform;
			const observer = new MutationObserver(() => {});
			observer.observe(host, {
				attributes: true,
				childList: true,
				characterData: true,
				subtree: true,
			});
			motion.sync(bookmark, button, frame, page, "", faces);
			expect(observer.takeRecords()).toHaveLength(0);
			page.style.top = "12px";
			observer.takeRecords();
			motion.sync(bookmark, button, frame, page, "updated-theme", faces);
			expect(observer.takeRecords().length).toBeGreaterThan(0);
			expect(surface?.style.top).toBe("12px");
			expect(surface?.classList.contains("updated-theme")).toBe(true);
			expect(surface?.style.transform).toBe(before);
			observer.disconnect();
			motion.destroy();
			host.remove();
		},
	);

	it("does not reattach fully concealed material on an unchanged frame", () => {
		const { host, page, button, motion, frame } = setup();
		button.getBoundingClientRect = () => box(800, 100, 0, 28);
		const bookmark = { id: "chapter", pageIndex: 2 };
		motion.sync(bookmark, button, frame, page);
		const observer = new MutationObserver(() => {});
		observer.observe(host, { attributes: true, childList: true, subtree: true });
		motion.sync(bookmark, button, frame, page);
		expect(observer.takeRecords()).toHaveLength(0);
		observer.disconnect();
		motion.destroy();
		host.remove();
	});
});
