import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookmarkPreview } from "../bookmark-preview";

describe("bookmark previews", () => {
	let host: HTMLDivElement;
	let storage: HTMLDivElement;
	let source: HTMLButtonElement;
	let content: HTMLSpanElement;
	let preview: BookmarkPreview;

	beforeEach(() => {
		vi.useFakeTimers();
		host = document.createElement("div");
		storage = document.createElement("div");
		source = document.createElement("button");
		source.dataset.bookmarkId = "chapter";
		source.textContent = "Chapter";
		content = document.createElement("span");
		content.textContent = "Full chapter details";
		content.hidden = true;
		storage.hidden = true;
		storage.append(content);
		host.append(source, storage);
		document.body.append(host);
		vi.spyOn(source, "getBoundingClientRect").mockReturnValue(new DOMRect(300, 250, 52, 24));
		preview = new BookmarkPreview(host, storage);
	});

	afterEach(() => {
		preview.destroy();
		host.remove();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it.each([
		{ edge: "right" as const, left: 300, top: 212 },
		{ edge: "left" as const, left: 132, top: 212 },
		{ edge: "top" as const, left: 216, top: 174 },
		{ edge: "bottom" as const, left: 216, top: 250 },
	])("extends the same tab from its $edge attachment without scaling text", async ({
		edge,
		left,
		top,
	}) => {
		preview.open(source, content, edge, "consumer-tabs");
		const element = document.querySelector<HTMLElement>(".flipbook-bookmark-preview");
		expect(element?.style.left).toBe("300px");
		expect(element?.style.width).toBe("52px");
		expect(element?.querySelector("button")).toBe(source);
		expect(document.querySelectorAll("button")).toHaveLength(1);
		expect(host.querySelector(".flipbook-bookmark-placeholder")).not.toBeNull();
		await vi.advanceTimersByTimeAsync(32);
		expect(element?.style.left).toBe(`${left}px`);
		expect(element?.style.top).toBe(`${top}px`);
		expect(element?.style.width).toBe("220px");
		expect(element?.style.transform).toBe("");
		expect(source.contains(content)).toBe(true);
		expect(element?.classList.contains("consumer-tabs")).toBe(true);
		expect(content.hidden).toBe(false);
		preview.close();
		expect(source.parentElement).toBe(host);
		expect(host.querySelector(".flipbook-bookmark-placeholder")).toBeNull();
	});

	it("keeps the extended tab inside the viewport", async () => {
		const width = window.innerWidth;
		vi.mocked(source.getBoundingClientRect).mockReturnValue(new DOMRect(width - 60, 250, 52, 24));
		preview.open(source, content, "right");
		await vi.advanceTimersByTimeAsync(32);
		const element = document.querySelector<HTMLElement>(".flipbook-bookmark-preview");
		expect(Number.parseFloat(element?.style.left ?? "NaN") + 220).toBe(width - 8);
	});

	it("cancels hover intent when the pointer leaves before expansion", async () => {
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
		source.addEventListener("click", activate);
		source.focus();
		preview.open(source, content, "right");
		expect(document.activeElement).toBe(source);
		document.querySelector<HTMLButtonElement>(".flipbook-bookmark--expanded")?.click();
		expect(activate).toHaveBeenCalledOnce();
		preview.close();
		expect(content.parentElement).toBe(storage);
		expect(content.hidden).toBe(true);
		expect(source.dataset.previewOpen).toBeUndefined();
		expect(source.style.color).toBe("red");
		expect(document.activeElement).toBe(source);
	});

	it("shrinks the original tab before returning it to its reserved slot", async () => {
		preview.open(source, content, "right");
		await vi.advanceTimersByTimeAsync(32);
		preview.leave(null);
		const element = document.querySelector<HTMLElement>(".flipbook-bookmark-preview");
		expect(element?.dataset.open).toBe("false");
		expect(element?.style.width).toBe("52px");
		expect(source.parentElement).toBe(element);
		await vi.advanceTimersByTimeAsync(180);
		expect(source.parentElement).toBe(host);
		expect(content.parentElement).toBe(storage);
	});

	it("preserves content while entering the expanded tab and cleans up pending work", async () => {
		preview.open(source, content, "right");
		preview.leave(content);
		expect(content.hidden).toBe(false);
		preview.destroy();
		await vi.advanceTimersByTimeAsync(200);
		expect(document.querySelector(".flipbook-bookmark-preview")).toBeNull();
		expect(content.parentElement).toBe(storage);
		expect(source.parentElement).toBe(host);
	});
});
