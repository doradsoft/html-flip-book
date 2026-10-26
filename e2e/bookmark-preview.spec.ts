import { expect, type Page, type TestInfo, test } from "@playwright/test";
import type { BookmarkPreview } from "../base/src/bookmark-preview";

declare global {
	interface Window {
		__BookmarkPreview?: typeof BookmarkPreview;
	}
}

type Edge = "left" | "right" | "top" | "bottom";
type Direction = "ltr" | "rtl";
type AnchorBox = { left: number; right: number; top: number; bottom: number };
type FrameSample = AnchorBox & {
	id: string | undefined;
	width: number;
	height: number;
	inwardHit: boolean;
};

async function exposePreviewClass(page: Page): Promise<void> {
	await page.addScriptTag({ type: "module", url: "/src/bookmark-preview-for-tests.ts" });
	await page.waitForFunction(() => window.__BookmarkPreview !== undefined);
}

async function previewFixture(page: Page, edge: Edge, direction: Direction, clamped = false) {
	await page.goto("/?example=ltr-bookmarks");
	await page.locator(".flipbook-bookmark[data-bookmark-id]").first().waitFor();
	await exposePreviewClass(page);
	return page.evaluate(
		({ edge, direction, clamped }) => {
			const PreviewCtor = window.__BookmarkPreview;
			if (!PreviewCtor) throw new Error("Bookmark preview module is unavailable");
			const horizontal = edge === "left" || edge === "right";
			const start = clamped ? 20 : 300;
			const end = clamped ? (horizontal ? innerWidth : innerHeight) - 72 : 700;
			const host = document.createElement("div");
			host.id = "preview-regression";
			host.dir = direction;
			host.style.cssText =
				"position:fixed;inset:0;z-index:100000;pointer-events:none;font-family:Tahoma,Arial,sans-serif";
			const storage = document.createElement("div");
			storage.hidden = true;
			host.append(storage);
			document.body.append(host);
			const preview = new PreviewCtor(host, storage);
			const makeAnchor = (index: number) => {
				const slot = document.createElement("div");
				slot.className = "flipbook-bookmark-slot";
				slot.dataset.edge = edge;
				slot.dataset.orientation = "perpendicular";
				const outward = edge === "left" || edge === "top" ? start : end;
				const across = 380 + index * 48;
				slot.style.cssText = `position:fixed;left:${horizontal ? outward : across}px;top:${horizontal ? across : outward}px;width:${horizontal ? 52 : 24}px;height:${horizontal ? 24 : 52}px`;
				const button = document.createElement("button");
				button.id = `preview-source-${index}`;
				button.className = "flipbook-bookmark";
				button.dataset.bookmarkId = `regression-${index}`;
				button.dataset.edge = edge;
				button.dataset.orientation = "perpendicular";
				button.setAttribute("aria-label", `Chapter ${index + 1}`);
				const brief = document.createElement("span");
				brief.className = "flipbook-bookmark__content";
				brief.textContent = direction === "rtl" ? "פרק יב" : "Chapter 12";
				const full = document.createElement("span");
				full.className = "flipbook-bookmark__expanded-content";
				full.textContent = direction === "rtl" ? "כותרת הפרק המלאה" : "The complete chapter title";
				full.hidden = true;
				storage.append(full);
				button.append(brief);
				slot.append(button);
				host.append(slot);
				button.addEventListener("pointerenter", () => preview.schedule(button, full, edge));
				button.addEventListener("pointerleave", (event: PointerEvent) =>
					preview.leave(event.relatedTarget),
				);
				button.addEventListener("focus", () => {
					if (button.matches(":focus-visible")) preview.open(button, full, edge);
				});
				button.addEventListener("blur", (event: FocusEvent) => preview.leave(event.relatedTarget));
				button.addEventListener("click", () => {
					button.dataset.clicked = "true";
				});
				const box = slot.getBoundingClientRect();
				return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
			};
			return [makeAnchor(0), makeAnchor(1)];
		},
		{ edge, direction, clamped },
	);
}

function recordFrames(page: Page, duration = 2000) {
	return page.evaluate(async (duration) => {
		const visibleBounds = (overlay: HTMLElement) => {
			const rect = overlay.getBoundingClientRect();
			const visible = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
			for (
				let node: HTMLElement | null = overlay;
				node && node !== document.body;
				node = node.parentElement
			) {
				const clip = getComputedStyle(node).clipPath;
				if (!clip.startsWith("inset(")) continue;
				const values = clip.slice(6, -1).split(/\s+/).map(Number.parseFloat);
				const [top, right = top, bottom = top, left = right] = values;
				const box = node.getBoundingClientRect();
				visible.left = Math.max(visible.left, box.left + left);
				visible.right = Math.min(visible.right, box.right - right);
				visible.top = Math.max(visible.top, box.top + top);
				visible.bottom = Math.min(visible.bottom, box.bottom - bottom);
			}
			return visible;
		};
		const exposedSlot = () => {
			const anchor = document
				.querySelector("#preview-regression .flipbook-bookmark-placeholder")
				?.closest(".flipbook-bookmark-slot")
				?.getBoundingClientRect();
			if (!anchor) throw new Error("Preview lost its exposed bookmark slot");
			return anchor;
		};
		const inwardPoint = (overlay: HTMLElement, anchor: DOMRect) => {
			const edge = overlay.dataset.edge;
			const horizontal = edge === "left" || edge === "right";
			const x = edge === "left" ? anchor.right + 2 : anchor.left - 2;
			const y = edge === "top" ? anchor.bottom + 2 : anchor.top - 2;
			return document.elementFromPoint(
				horizontal ? x : anchor.left + anchor.width / 2,
				horizontal ? anchor.top + anchor.height / 2 : y,
			);
		};
		const frames = [];
		const end = performance.now() + duration;
		while (performance.now() < end) {
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
			const overlay = document.querySelector<HTMLElement>(
				'.flipbook-bookmark-preview[data-bookmark-id^="regression-"]:not([hidden])',
			);
			if (!overlay) continue;
			const rect = overlay.getBoundingClientRect();
			const anchor = exposedSlot();
			const hit = inwardPoint(overlay, anchor);
			frames.push({
				id: overlay.dataset.bookmarkId,
				...visibleBounds(overlay),
				width: rect.width,
				height: rect.height,
				inwardHit: hit !== null && overlay.contains(hit),
			});
		}
		return frames;
	}, duration);
}

async function runHoverCycle(page: Page, anchors: AnchorBox[]): Promise<void> {
	const hover = async (index: number, time: number) => {
		const box = anchors.at(index);
		if (!box) throw new Error(`Missing anchor ${index}`);
		await page.mouse.move((box.left + box.right) / 2, (box.top + box.bottom) / 2);
		await page.waitForTimeout(time);
	};
	await hover(0, 360);
	await page.mouse.move(10, 10);
	await page.waitForTimeout(70);
	await hover(0, 250);
	await hover(1, 360);
	await hover(0, 360);
	await page.mouse.move(10, 10);
}

function inwardOverflow(frame: FrameSample, anchor: AnchorBox, edge: Edge): number {
	if (edge === "left") return frame.right - anchor.right;
	if (edge === "right") return anchor.left - frame.left;
	if (edge === "top") return frame.bottom - anchor.bottom;
	return anchor.top - frame.top;
}

function expectFrameBounded(
	frame: FrameSample,
	anchor: AnchorBox,
	edge: Edge,
	clamped: boolean,
): void {
	const horizontal = edge === "left" || edge === "right";
	expect(frame.width).toBeCloseTo(horizontal ? 220 : 24, 1);
	expect(frame.height).toBeCloseTo(horizontal ? 24 : 220, 1);
	if (horizontal) {
		expect(frame.top).toBeCloseTo(anchor.top, 0);
		expect(frame.bottom).toBeCloseTo(anchor.bottom, 0);
	} else {
		expect(frame.left).toBeCloseTo(anchor.left, 0);
		expect(frame.right).toBeCloseTo(anchor.right, 0);
	}
	// A clamped full-size strip may overlap the page, but never beyond its final limit.
	expect(inwardOverflow(frame, anchor, edge)).toBeLessThanOrEqual((clamped ? 156 : 0) + 0.75);
	if (!clamped) expect(frame.inwardHit).toBe(false);
	expect(frame.left).toBeGreaterThanOrEqual(7.25);
	expect(frame.top).toBeGreaterThanOrEqual(7.25);
	expect(frame.right).toBeLessThanOrEqual(1192.75);
	expect(frame.bottom).toBeLessThanOrEqual(992.75);
}

async function runScenario(
	page: Page,
	testInfo: TestInfo,
	edge: Edge,
	direction: Direction,
	reducedMotion: "no-preference" | "reduce",
	clamped: boolean,
): Promise<void> {
	const anchors = await previewFixture(page, edge, direction, clamped);
	if (!clamped && reducedMotion === "no-preference") {
		// Isolate a lagging movement clock while the reveal continues independently.
		await page.addStyleTag({
			content:
				".flipbook-bookmark-preview { transition: left 180ms ease 120ms, top 180ms ease 120ms, clip-path 180ms ease; }",
		});
	}
	const frames = recordFrames(page);
	await runHoverCycle(page, anchors);
	const samples = await frames;
	await testInfo.attach(`${edge}-${reducedMotion}-${clamped ? "clamped" : "roomy"}.json`, {
		body: JSON.stringify(samples),
		contentType: "application/json",
	});
	expect(samples.filter((frame) => frame.id === "regression-0").length).toBeGreaterThan(5);
	expect(samples.filter((frame) => frame.id === "regression-1").length).toBeGreaterThan(5);
	for (const frame of samples) {
		const anchor = anchors.at(frame.id === "regression-0" ? 0 : 1);
		if (anchor) expectFrameBounded(frame, anchor, edge, clamped);
	}
}

for (const direction of ["ltr", "rtl"] as const) {
	for (const edge of ["left", "right", "top", "bottom"] as const) {
		test(`${direction}: ${edge} preview stays clipped during switching and interrupted hover`, async ({
			page,
			isMobile,
		}, testInfo) => {
			test.skip(isMobile, "Native hover previews require a mouse");
			await page.setViewportSize({ width: 1200, height: 1000 });
			for (const reducedMotion of ["no-preference", "reduce"] as const) {
				await page.emulateMedia({ reducedMotion });
				for (const clamped of [false, true]) {
					await runScenario(page, testInfo, edge, direction, reducedMotion, clamped);
				}
			}
		});
	}
}
