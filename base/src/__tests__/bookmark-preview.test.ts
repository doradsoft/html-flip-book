import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookmarkPreview } from "../bookmark-preview";

describe("bookmark previews", () => {
	let host: HTMLDivElement;
	let storage: HTMLDivElement;
	let source: HTMLButtonElement;
	let slot: HTMLDivElement;
	let content: HTMLSpanElement;
	let preview: BookmarkPreview;

	beforeEach(() => {
		vi.useFakeTimers();
		host = document.createElement("div");
		storage = document.createElement("div");
		source = document.createElement("button");
		slot = document.createElement("div");
		slot.className = "flipbook-bookmark-slot";
		source.dataset.bookmarkId = "chapter";
		source.textContent = "Chapter";
		content = document.createElement("span");
		content.textContent = "Full chapter details";
		content.hidden = true;
		storage.hidden = true;
		storage.append(content);
		slot.append(source);
		host.append(slot, storage);
		document.body.append(host);
		vi.spyOn(source, "getBoundingClientRect").mockReturnValue(new DOMRect(132, 250, 220, 24));
		vi.spyOn(slot, "getBoundingClientRect").mockReturnValue(new DOMRect(300, 250, 52, 24));
		preview = new BookmarkPreview(host, storage);
	});

	afterEach(() => {
		preview.destroy();
		host.remove();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it.each([
		{
			edge: "right" as const,
			full: [132, 250, 220, 24],
			tip: [300, 250, 52, 24],
			left: 300,
			top: 250,
		},
		{
			edge: "left" as const,
			full: [300, 250, 220, 24],
			tip: [300, 250, 52, 24],
			left: 132,
			top: 250,
		},
		{
			edge: "top" as const,
			full: [300, 250, 24, 220],
			tip: [300, 250, 24, 52],
			left: 300,
			top: 82,
		},
		{
			edge: "bottom" as const,
			full: [300, 82, 24, 220],
			tip: [300, 250, 24, 52],
			left: 300,
			top: 250,
		},
	])(
		"slides the same fixed rectangle from its $edge tip along its long axis",
		async ({ edge, full, tip, left, top }) => {
			vi.mocked(source.getBoundingClientRect).mockReturnValue(
				new DOMRect(full[0], full[1], full[2], full[3]),
			);
			vi.mocked(slot.getBoundingClientRect).mockReturnValue(
				new DOMRect(tip[0], tip[1], tip[2], tip[3]),
			);
			preview.open(source, content, edge, "consumer-tabs");
			const element = document.querySelector<HTMLElement>(".flipbook-bookmark-preview");
			expect(element?.style.left).toBe(`${full[0]}px`);
			expect(element?.style.top).toBe(`${full[1]}px`);
			expect(element?.style.width).toBe(`${full[2]}px`);
			expect(element?.style.height).toBe(`${full[3]}px`);
			expect(element?.style.clipPath).not.toBe("inset(0px)");
			expect(element?.querySelector("button")).toBe(source);
			expect(document.querySelectorAll("button")).toHaveLength(1);
			expect(host.querySelector(".flipbook-bookmark-placeholder")).not.toBeNull();
			await vi.advanceTimersByTimeAsync(32);
			expect(element?.style.left).toBe(`${left}px`);
			expect(element?.style.top).toBe(`${top}px`);
			expect(element?.style.width).toBe(`${full[2]}px`);
			expect(element?.style.height).toBe(`${full[3]}px`);
			expect(element?.style.clipPath).toBe("inset(0px)");
			expect(element?.style.transform).toBe("");
			expect(source.contains(content)).toBe(true);
			expect(element?.classList.contains("consumer-tabs")).toBe(true);
			expect(content.hidden).toBe(false);
			preview.close();
			expect(source.parentElement).toBe(slot);
			expect(host.querySelector(".flipbook-bookmark-placeholder")).toBeNull();
		},
	);

	it("clamps translation to the viewport without changing either rectangle dimension", async () => {
		const width = window.innerWidth;
		vi.mocked(source.getBoundingClientRect).mockReturnValue(new DOMRect(width - 228, 250, 220, 24));
		vi.mocked(slot.getBoundingClientRect).mockReturnValue(new DOMRect(width - 60, 250, 52, 24));
		preview.open(source, content, "right");
		await vi.advanceTimersByTimeAsync(32);
		const element = document.querySelector<HTMLElement>(".flipbook-bookmark-preview");
		expect(Number.parseFloat(element?.style.left ?? "NaN") + 220).toBe(width - 8);
		expect(element?.style.width).toBe("220px");
		expect(element?.style.height).toBe("24px");
	});

	it("cancels hover intent when the pointer leaves before revealing the strip", async () => {
		preview.schedule(source, content, "right");
		await vi.advanceTimersByTimeAsync(100);
		expect(content.hidden).toBe(true);
		preview.leave(null);
		await vi.advanceTimersByTimeAsync(100);
		expect(document.querySelector<HTMLElement>(".flipbook-bookmark-preview")?.hidden).toBe(true);
	});

	it("uses the original click handler once and restores styles, focus, and full content", () => {
		const activate = vi.fn();
		source.style.color = "red";
		source.style.padding = "7px";
		source.addEventListener("click", activate);
		source.focus();
		preview.open(source, content, "right");
		expect(document.activeElement).toBe(source);
		expect(source.style.padding).toBe("7px");
		document.querySelector<HTMLButtonElement>(".flipbook-bookmark--expanded")?.click();
		expect(activate).toHaveBeenCalledOnce();
		preview.close();
		expect(content.parentElement).toBe(storage);
		expect(content.hidden).toBe(true);
		expect(source.dataset.previewOpen).toBeUndefined();
		expect(source.style.color).toBe("red");
		expect(source.style.padding).toBe("7px");
		expect(document.activeElement).toBe(source);
	});

	it("retains the Hebrew font family when the computed font shorthand cannot be serialized", () => {
		host.style.fontFamily = "Arial, sans-serif";
		source.style.fontFamily = "Tahoma, Arial, sans-serif";
		source.style.fontSize = "12px";
		source.dir = "rtl";
		source.textContent = "בריאת העולם";
		const originalStyle = source.style.cssText;
		const family = window.getComputedStyle(source).fontFamily;
		const computedStyle = window.getComputedStyle.bind(window);
		vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
			const style = computedStyle(element, pseudo);
			if (element !== source) return style;
			return new Proxy(style, {
				get(target, property) {
					if (property === "getPropertyValue")
						return (name: string) => (name === "font" ? "" : target.getPropertyValue(name));
					return Reflect.get(target, property, target);
				},
			});
		});
		preview.open(source, content, "left");
		expect(window.getComputedStyle(source).fontFamily).toBe(family);
		expect(window.getComputedStyle(content).fontFamily).toBe(family);
		preview.close();
		expect(source.style.cssText).toBe(originalStyle);
		expect(window.getComputedStyle(source).fontFamily).toBe(family);
	});

	it("slides the original rectangle back behind its tip without shrinking it", async () => {
		preview.open(source, content, "right");
		await vi.advanceTimersByTimeAsync(32);
		preview.leave(null);
		const element = document.querySelector<HTMLElement>(".flipbook-bookmark-preview");
		expect(element?.dataset.open).toBe("false");
		expect(element?.style.left).toBe("132px");
		expect(element?.style.width).toBe("220px");
		expect(element?.style.height).toBe("24px");
		expect(element?.style.clipPath).toBe("inset(0px 0px 0px 168px)");
		expect(source.parentElement).toBe(element);
		await vi.advanceTimersByTimeAsync(180);
		expect(source.parentElement).toBe(slot);
		expect(content.parentElement).toBe(storage);
	});

	it("preserves content while entering the expanded tab and cleans up pending work", async () => {
		preview.open(source, content, "right");
		preview.leave(content);
		expect(content.hidden).toBe(false);
		preview.destroy();
		await vi.advanceTimersByTimeAsync(200);
		expect(document.querySelector(".flipbook-bookmark-preview")).toBeNull();
		expect(document.querySelector(".flipbook-bookmark-preview-boundary")).toBeNull();
		expect(content.parentElement).toBe(storage);
		expect(source.parentElement).toBe(slot);
	});

	it("retains the consumer's preview stacking order on the stationary boundary", () => {
		const styles = document.createElement("style");
		styles.textContent = ".consumer-preview { z-index: 12000; }";
		document.head.append(styles);
		try {
			preview.open(source, content, "right", "consumer-preview");
			const boundary = source.closest<HTMLElement>(".flipbook-bookmark-preview-boundary");
			expect(boundary?.style.zIndex).toBe("12000");
			expect(boundary?.style.clipPath).toBe("inset(0px 0px 0px 300px)");
		} finally {
			styles.remove();
		}
	});

	it("moves a parallel strip beyond the last friend when that rail end has room", async () => {
		const rail = document.createElement("div");
		rail.className = "flipbook-bookmarks__rail";
		host.prepend(rail);
		rail.append(slot);
		source.dataset.orientation = "parallel";
		vi.mocked(source.getBoundingClientRect).mockReturnValue(new DOMRect(300, 102, 24, 220));
		vi.mocked(slot.getBoundingClientRect).mockReturnValue(new DOMRect(300, 250, 24, 72));
		vi.spyOn(rail, "getBoundingClientRect").mockReturnValue(new DOMRect(300, 100, 24, 500));
		const friend = document.createElement("div");
		friend.className = "flipbook-bookmark-slot";
		vi.spyOn(friend, "getBoundingClientRect").mockReturnValue(new DOMRect(300, 430, 24, 72));
		rail.append(friend);
		preview.open(source, content, "right");
		await vi.advanceTimersByTimeAsync(32);
		const element = document.querySelector<HTMLElement>(".flipbook-bookmark-preview");
		expect(element?.style.top).toBe("506px");
		expect(element?.style.left).toBe("300px");
		expect(element?.style.width).toBe("24px");
		expect(element?.style.height).toBe("220px");
	});

	it("retains fixed material size when a parallel rail fills both viewport ends", async () => {
		const rail = document.createElement("div");
		rail.className = "flipbook-bookmarks__rail";
		host.prepend(rail);
		rail.append(slot);
		source.dataset.orientation = "parallel";
		vi.mocked(source.getBoundingClientRect).mockReturnValue(new DOMRect(300, 102, 24, 220));
		vi.mocked(slot.getBoundingClientRect).mockReturnValue(new DOMRect(300, 250, 24, 72));
		vi.spyOn(rail, "getBoundingClientRect").mockReturnValue(
			new DOMRect(300, 0, 24, window.innerHeight),
		);
		const friend = document.createElement("div");
		friend.className = "flipbook-bookmark-slot";
		vi.spyOn(friend, "getBoundingClientRect").mockReturnValue(
			new DOMRect(300, 0, 24, window.innerHeight),
		);
		rail.append(friend);
		preview.open(source, content, "right");
		await vi.advanceTimersByTimeAsync(32);
		const element = document.querySelector<HTMLElement>(".flipbook-bookmark-preview");
		expect(element?.style.top).toBe("250px");
		expect(element?.style.left).toBe("300px");
		expect(element?.style.width).toBe("24px");
		expect(element?.style.height).toBe("220px");
	});

	it("dismisses an open preview on Escape even when focus moved elsewhere", async () => {
		preview.open(source, content, "right");
		await vi.advanceTimersByTimeAsync(32);
		const element = document.querySelector<HTMLElement>(".flipbook-bookmark-preview");
		expect(element?.hidden).toBe(false);
		const select = document.createElement("select");
		document.body.append(select);
		select.focus();
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(element?.dataset.open).toBe("false");
		await vi.advanceTimersByTimeAsync(180);
		expect(element?.hidden).toBe(true);
		expect(source.parentElement).toBe(slot);
		select.remove();
	});

	it("keeps a displaced strip open while the pointer remains over its original slot", async () => {
		const rail = document.createElement("div");
		rail.className = "flipbook-bookmarks__rail";
		host.prepend(rail);
		rail.append(slot);
		source.dataset.orientation = "parallel";
		vi.mocked(source.getBoundingClientRect).mockReturnValue(new DOMRect(300, 102, 24, 220));
		vi.mocked(slot.getBoundingClientRect).mockReturnValue(new DOMRect(300, 250, 24, 72));
		vi.spyOn(rail, "getBoundingClientRect").mockReturnValue(new DOMRect(300, 100, 24, 500));
		const friend = document.createElement("div");
		friend.className = "flipbook-bookmark-slot";
		vi.spyOn(friend, "getBoundingClientRect").mockReturnValue(new DOMRect(300, 430, 24, 72));
		rail.append(friend);
		preview.open(source, content, "right");
		await vi.advanceTimersByTimeAsync(32);
		const element = document.querySelector<HTMLElement>(".flipbook-bookmark-preview");
		expect(Number.parseFloat(element?.style.top ?? "NaN")).toBeGreaterThan(322);
		preview.leave(slot);
		await vi.advanceTimersByTimeAsync(200);
		expect(element?.dataset.open).toBe("true");
		expect(source.parentElement).toBe(element);
		expect(content.hidden).toBe(false);
		slot.dispatchEvent(new PointerEvent("pointerleave", { relatedTarget: document.body }));
		expect(element?.dataset.open).toBe("false");
		await vi.advanceTimersByTimeAsync(180);
		expect(source.parentElement).toBe(slot);
		expect(element?.hidden).toBe(true);
		slot.dispatchEvent(new PointerEvent("pointerenter"));
		expect(element?.hidden).toBe(true);
	});
});
