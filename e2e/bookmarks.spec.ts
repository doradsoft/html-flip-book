import { expect, type Locator, type Page, test } from "@playwright/test";

type Direction = "ltr" | "rtl";
type Edge = "top" | "right" | "bottom" | "left";
type Rect = { left: number; right: number; top: number; bottom: number };
type Point = { x: number; y: number };
type Bounds = Point & { width: number; height: number };

async function openBookmarks(
	page: Page,
	direction: Direction,
	fastDeltaThreshold?: number,
	initialLeaves: string | null = "0",
) {
	const params = new URLSearchParams({ example: `${direction}-bookmarks` });
	if (initialLeaves !== null) params.set("test-initialTurnedLeaves", initialLeaves);
	if (fastDeltaThreshold) params.set("test-fastDeltaThreshold", String(fastDeltaThreshold));
	await page.goto(`/?${params}`);
	await page.getByRole("combobox", { name: "Provider", exact: true }).selectOption("custom");
	const book = page.locator(".flipbook");
	await expect(book.locator('.page[data-page-index="2"]')).toBeVisible();
	await expect(book.locator(".flipbook-bookmark")).toHaveCount(
		(await expectedSpreads(book)).length,
	);
	await expect(bookmarkForPage(page, 0)).toHaveCount(0);
	await expect(
		book.locator('.flipbook-bookmark[data-page-index="2"] .flipbook-bookmark__content'),
	).toContainText(direction === "ltr" ? /contents/i : /תוכן|שער/);
	const compact = await book
		.locator(".flipbook-bookmark[data-bookmark-id] > .flipbook-bookmark__content:not([hidden])")
		.allTextContents();
	expect(compact.every((text) => /[A-Za-z\u0590-\u05FF]/.test(text))).toBe(true);
	await expect(book).toHaveClass(direction === "ltr" ? /en-book/ : /he-book/);
	await expect(book.locator('.page[data-page-index="0"] h1')).toHaveText(
		direction === "ltr" ? "SQL Tutorial" : "ספר בראשית",
	);
	await expect(book.locator('.page[data-page-index="2"]')).toContainText(
		direction === "ltr" ? "Table of Contents" : "תוכן העניינים",
	);
	return book;
}

async function expectedSpreads(book: Locator, minimumPage = 0) {
	return book.locator(".page").evaluateAll((elements, start) => {
		const pages = elements.map((element) => ({
			index: Number((element as HTMLElement).dataset.pageIndex),
			title: (element as HTMLElement).dataset.pageTitle ?? "",
			cover: element.classList.contains("page--cover"),
		}));
		const coverLeaves = new Set(
			pages.filter((page) => page.cover).map((page) => Math.floor(page.index / 2)),
		);
		return [
			...new Set(
				pages
					.filter(
						(page) =>
							page.index >= start &&
							(page.title || page.index === 2) &&
							!coverLeaves.has(Math.floor(page.index / 2)),
					)
					.map((page) => Math.floor((page.index + 1) / 2)),
			),
		].sort((a, b) => a - b);
	}, minimumPage);
}

function overlaps(first: Rect, second: Rect) {
	return (
		Math.min(first.right, second.right) - Math.max(first.left, second.left) > 1 &&
		Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 1
	);
}

async function railLayout(rail: Locator) {
	return rail.evaluate((element) => {
		const bounds = element.getBoundingClientRect();
		const host = element.closest(".flipbook");
		if (!host) throw new Error("Bookmark rail has no book host");
		const hostBounds = host.getBoundingClientRect();
		const tabs = Array.from(element.querySelectorAll<HTMLElement>(".flipbook-bookmark")).map(
			(tab) => {
				const rect = (tab.closest(".flipbook-bookmark-slot") ?? tab).getBoundingClientRect();
				return {
					page: Number(tab.dataset.pageIndex),
					layer: Number(
						(tab.closest<HTMLElement>(".flipbook-bookmark-slot") ?? tab).dataset.stackLayer ?? 0,
					),
					left: rect.left,
					right: rect.right,
					top: rect.top,
					bottom: rect.bottom,
				};
			},
		);
		return {
			left: bounds.left,
			right: bounds.right,
			top: bounds.top,
			bottom: bounds.bottom,
			host: {
				left: hostBounds.left,
				right: hostBounds.right,
				top: hostBounds.top,
				bottom: hostBounds.bottom,
			},
			tabs,
			scrollHeight: element.scrollHeight,
			clientHeight: element.clientHeight,
			scrollTop: element.scrollTop,
		};
	});
}

async function expectSeparateTabs(book: Locator, edges: Edge[]) {
	await book.page().mouse.move(0, 0);
	await expect(book.page().locator(".flipbook-bookmark-preview")).toBeHidden();
	const rails = book.locator(".flipbook-bookmarks__rail:visible");
	await expect(rails).toHaveCount(edges.length);
	for (const edge of edges) {
		const rail = book.locator(`.flipbook-bookmarks__rail[data-edge="${edge}"]`);
		const layout = await railLayout(rail);
		expect(layout.left).toBeGreaterThanOrEqual(layout.host.left - 1);
		expect(layout.right).toBeLessThanOrEqual(layout.host.right + 1);
		expect(layout.top).toBeGreaterThanOrEqual(layout.host.top - 1);
		expect(layout.bottom).toBeLessThanOrEqual(layout.host.bottom + 1);
		const side = edge === "left" || edge === "right";
		if (side) {
			expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 1);
			expect(layout.scrollTop).toBe(0);
		} else {
			for (let index = 1; index < layout.tabs.length; index++) {
				expect(overlaps(layout.tabs[index - 1], layout.tabs[index])).toBe(false);
			}
		}
		const pageOrder = layout.tabs.map((tab) => tab.page);
		expect(pageOrder).toEqual([...pageOrder].sort((first, second) => first - second));
		const axis = edge === "top" || edge === "bottom" ? "left" : "top";
		const positions = layout.tabs.map((tab) => tab[axis]);
		if (!side) expect(positions).toEqual([...positions].sort((first, second) => first - second));
		for (const pageIndex of layout.tabs.map((tab) => tab.page)) {
			const tab = bookmarkForPage(book.page(), pageIndex);
			if (side) {
				await exposedHitPoint(tab);
				continue;
			}
			await tab.scrollIntoViewIfNeeded();
			const scrolled = await railLayout(rail);
			const visibleTab = scrolled.tabs.find((item) => item.page === pageIndex);
			if (!visibleTab) throw new Error("Bookmark vanished while scrolling its rail");
			// Native scrolling rounds fractional dimensions in scaled mobile layouts.
			expect(visibleTab.left).toBeGreaterThanOrEqual(scrolled.left - 2);
			expect(visibleTab.right).toBeLessThanOrEqual(scrolled.right + 2);
			expect(visibleTab.top).toBeGreaterThanOrEqual(scrolled.top - 2);
			expect(visibleTab.bottom).toBeLessThanOrEqual(scrolled.bottom + 2);
		}
	}
}

async function expectOrientation(book: Locator, orientation: "perpendicular" | "parallel") {
	for (const rail of await book.locator(".flipbook-bookmarks__rail:visible").all()) {
		const horizontal = ["top", "bottom"].includes((await rail.getAttribute("data-edge")) ?? "");
		const verticalTab = horizontal === (orientation === "perpendicular");
		for (const tab of (await railLayout(rail)).tabs) {
			const width = tab.right - tab.left;
			const height = tab.bottom - tab.top;
			expect(verticalTab ? height : width).toBeGreaterThan(verticalTab ? width : height);
		}
	}
}

async function currentPages(book: Locator) {
	return book
		.locator(".page.current-page")
		.evaluateAll((elements) =>
			elements.map((element) => Number((element as HTMLElement).dataset.pageIndex)),
		);
}

async function inspectBookmark(page: Page, book: Locator, tab: Locator) {
	const spread = await currentPages(book);
	const target = Number(await tab.getAttribute("data-page-index"));
	const label = await tab.getAttribute("aria-label");
	await activateBookmark(tab);
	await expect(page.locator(".bookmark-example-event")).toHaveText(
		`From leaf ${Math.floor(Math.min(...spread) / 2) + 1}: ${label} (page ${target + 1}). Chapter ${Math.floor((target + 1) / 2) + 1}.`,
	);
	expect(await currentPages(book)).toEqual(spread);
}

async function pageStyles(book: Locator) {
	return book.locator(".page").evaluateAll((elements) =>
		elements.map((element) => {
			const style = (element as HTMLElement).style;
			return [style.transform, style.clipPath];
		}),
	);
}

async function boundsOf(locator: Locator) {
	const bounds = await locator.boundingBox();
	if (!bounds) throw new Error("Visible bookmark or page bounds are unavailable");
	return bounds;
}

function bookmarkSlot(tab: Locator) {
	return tab.locator('xpath=ancestor::*[contains(@class, "flipbook-bookmark-slot")][1]');
}

async function exposedBounds(tab: Locator) {
	const slot = bookmarkSlot(tab);
	return boundsOf((await slot.count()) ? slot : tab);
}

/** Find real exposed material, including a narrow stair strip behind an earlier range. */
async function exposedHitPoint(tab: Locator): Promise<Point> {
	return tab.evaluate((button) => {
		const slot = button.closest(".flipbook-bookmark-slot") ?? button;
		const rect = slot.getBoundingClientRect();
		const edge = (button as HTMLElement).dataset.edge;
		const peek = Number((slot as HTMLElement).dataset.stackPeek);
		const xs =
			Number.isFinite(peek) && peek > 0
				? [edge === "left" ? peek / 2 : rect.width - peek / 2, rect.width / 2]
				: [rect.width / 2];
		for (let inset = 1; inset < rect.width; inset += 1) {
			xs.push(edge === "left" ? inset : rect.width - inset);
		}
		const ys = [rect.height / 2, 1, Math.max(1, rect.height - 1)];
		for (let offset = 1; offset < rect.height; offset += 1) ys.push(offset);
		for (const y of ys) {
			for (const x of xs) {
				const point = { x: Math.round(rect.left + x), y: Math.round(rect.top + y) };
				const target = document.elementFromPoint(point.x, point.y);
				if (target?.closest(".flipbook-bookmark") === button) return point;
			}
		}
		const rail = slot.closest<HTMLElement>(".flipbook-bookmarks__rail");
		Reflect.set(window, "__unreachableBookmark", {
			id: (button as HTMLElement).dataset.bookmarkId,
			slot: { bounds: rect.toJSON(), ...(slot as HTMLElement).dataset },
			rail: rail
				? {
						bounds: rail.getBoundingClientRect().toJSON(),
						...rail.dataset,
						zIndex: getComputedStyle(rail).zIndex,
						slots: Array.from(rail.querySelectorAll<HTMLElement>(".flipbook-bookmark-slot")).map(
							(item) => ({
								id: item.querySelector<HTMLElement>(".flipbook-bookmark")?.dataset.bookmarkId,
								bounds: item.getBoundingClientRect().toJSON(),
								...item.dataset,
								zIndex: getComputedStyle(item).zIndex,
							}),
						),
					}
				: null,
			configuration: Array.from(
				document.querySelectorAll<HTMLSelectElement>(".bookmark-example-controls select"),
			).map((select) => ({
				label: select.closest("label")?.textContent?.trim(),
				value: select.value,
			})),
		});
		throw new Error(
			`No exposed hit target for ${(button as HTMLElement).dataset.bookmarkId} at ${JSON.stringify(rect.toJSON())}`,
		);
	});
}

async function fontFamilies(tab: Locator) {
	return tab.evaluate((button) => ({
		button: getComputedStyle(button).fontFamily,
		brief: getComputedStyle(button.querySelector(".flipbook-bookmark__content") ?? button)
			.fontFamily,
		briefText: getComputedStyle(
			button.querySelector(".flipbook-bookmark__content strong") ??
				button.querySelector(".flipbook-bookmark__content") ??
				button,
		).fontFamily,
	}));
}

async function activateBookmark(tab: Locator, touch = false) {
	const slot = bookmarkSlot(tab);
	await ((await slot.count()) ? slot : tab).scrollIntoViewIfNeeded();
	const { x, y } = await exposedHitPoint(tab);
	if (touch) await tab.page().touchscreen.tap(x, y);
	else await tab.page().mouse.click(x, y);
}

async function tipCenterInMaterial(tip: Locator) {
	return tip.evaluate((element) => {
		const brief = element as HTMLElement;
		const button = brief.closest("button");
		const surface = brief.closest<HTMLElement>(".flipbook-bookmark-surface");
		if (!button || !surface) throw new Error("The reflected brief has no material surface");
		const transformPoint = (element: HTMLElement, point: { x: number; y: number }) => {
			const style = getComputedStyle(element);
			const [originX, originY] = style.transformOrigin.split(" ").map(Number.parseFloat);
			const matrix = new DOMMatrix(style.transform === "none" ? undefined : style.transform);
			const result = matrix.transformPoint(new DOMPoint(point.x - originX, point.y - originY));
			return { x: result.x + originX, y: result.y + originY };
		};
		const briefCenter = transformPoint(brief, {
			x: brief.offsetWidth / 2,
			y: brief.offsetHeight / 2,
		});
		const buttonCenter = transformPoint(button, {
			x: brief.offsetLeft + briefCenter.x,
			y: brief.offsetTop + briefCenter.y,
		});
		const point = { x: button.offsetLeft + buttonCenter.x, y: button.offsetTop + buttonCenter.y };
		const polygon = Array.from(
			surface.style.clipPath.matchAll(/(-?[\d.e+-]+)px\s+(-?[\d.e+-]+)px/g),
			(match) => ({ x: Number(match[1]), y: Number(match[2]) }),
		);
		let inside = false;
		for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
			const first = polygon[index];
			const second = polygon[previous];
			if (
				first.y > point.y !== second.y > point.y &&
				point.x < ((second.x - first.x) * (point.y - first.y)) / (second.y - first.y) + first.x
			)
				inside = !inside;
		}
		return {
			inside,
			point,
			polygon,
			buttonTransform: getComputedStyle(button).transform,
			briefTransform: getComputedStyle(brief).transform,
		};
	});
}

async function expectTabWithinPage(tab: Locator, surface: Locator) {
	const [bookmark, page] = await Promise.all([exposedBounds(tab), boundsOf(surface)]);
	expect(bookmark.x).toBeGreaterThanOrEqual(page.x - 1);
	expect(bookmark.x + bookmark.width).toBeLessThanOrEqual(page.x + page.width + 1);
}

function expectTabMeetsLeaf(tab: Bounds, surface: Bounds, direction: Direction) {
	const bookmarkEdge = direction === "ltr" ? tab.x : tab.x + tab.width;
	const paperEdge = direction === "ltr" ? surface.x + surface.width : surface.x;
	expect(Math.abs(bookmarkEdge - paperEdge)).toBeLessThanOrEqual(1);
}

function bookmarkForPage(page: Page, pageIndex: number) {
	return page.locator(
		`.flipbook-bookmark[data-spread-index="${Math.floor((pageIndex + 1) / 2)}"][data-bookmark-id]`,
	);
}

async function expectExpanded(tab: Locator, expanded: boolean) {
	const preview = tab.page().locator(".flipbook-bookmark-preview[data-open=true]");
	if (!expanded) {
		await expect(preview).toHaveCount(0);
		return;
	}
	await expect(preview).toHaveAttribute(
		"data-bookmark-id",
		(await tab.getAttribute("data-bookmark-id")) ?? "",
	);
	await expect(preview.locator(".flipbook-bookmark__expanded-content")).toHaveCSS("opacity", "1");
	await expect(preview.locator(".flipbook-bookmark__content")).toHaveCSS("opacity", "0");
}

async function checkExpansion(
	page: Page,
	book: Locator,
	edge: Edge,
	orientation: "perpendicular" | "parallel",
	screenshotPath: string,
) {
	await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption(edge);
	await page.getByRole("combobox", { name: "Orientation", exact: true }).selectOption(orientation);
	const pageResting = await pageStyles(book);
	const tab = bookmarkForPage(page, 2);
	await bookmarkSlot(tab).scrollIntoViewIfNeeded();
	await expectExpanded(tab, false);
	const original = await tab.elementHandle();
	if (!original) throw new Error("The original bookmark element is unavailable");
	const label = await tab.getAttribute("aria-label");
	const restingFonts = await fontFamilies(tab);
	const resting = await boundsOf(tab);
	const exposed = await exposedBounds(tab);
	const sourceLayer = await bookmarkSlot(tab).getAttribute("data-stack-layer");
	const neighbours = await book.locator(".flipbook-bookmark-slot").evaluateAll((slots) =>
		slots.map((slot) => {
			const rect = slot.getBoundingClientRect();
			return {
				left: rect.left,
				right: rect.right,
				top: rect.top,
				bottom: rect.bottom,
				layer: (slot as HTMLElement).dataset.stackLayer,
			};
		}),
	);
	await page.mouse.move(exposed.x + exposed.width / 2, exposed.y + exposed.height / 2);
	await expect(page.locator(".flipbook-bookmark-preview[data-open=true]")).toBeVisible();
	const animation = await tab.evaluate(async (button) => {
		const frames = [];
		for (let index = 0; index < 16; index++) {
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
			const rect = button.getBoundingClientRect();
			frames.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
		}
		return frames;
	});
	await expectExpanded(tab, true);
	expect(await fontFamilies(tab)).toEqual(restingFonts);
	const full = page.locator(".flipbook-bookmark-preview[data-open=true]");
	await expect(full.locator(".example-bookmark-full strong")).toHaveText(label ?? "");
	expect(
		await full.locator("button").evaluate((button, source) => button === source, original),
	).toBe(true);
	const expanded = await boundsOf(tab);
	const horizontal = resting.width >= resting.height;
	for (const frame of [...animation, expanded]) {
		expect(Math.abs(frame.width - resting.width)).toBeLessThan(0.75);
		expect(Math.abs(frame.height - resting.height)).toBeLessThan(0.75);
		expect(Math.abs(horizontal ? frame.y - resting.y : frame.x - resting.x)).toBeLessThan(1);
	}
	expect(Math.abs(horizontal ? expanded.x - resting.x : expanded.y - resting.y)).toBeGreaterThan(5);
	if (orientation === "perpendicular") {
		const outward = {
			left: resting.x - expanded.x,
			right: expanded.x - resting.x,
			top: resting.y - expanded.y,
			bottom: expanded.y - resting.y,
		};
		expect(outward[edge]).toBeGreaterThan(5);
		const reveal = {
			left: expanded.x,
			right: expanded.x + expanded.width,
			top: expanded.y,
			bottom: expanded.y + expanded.height,
		};
		for (const neighbour of neighbours) {
			if (Math.abs(neighbour.left - exposed.x) < 1 && Math.abs(neighbour.top - exposed.y) < 1)
				continue;
			// Side overflow layers intentionally overlap; each layer still keeps separate rows.
			if ((edge === "left" || edge === "right") && neighbour.layer !== sourceLayer) continue;
			expect(overlaps(reveal, neighbour)).toBe(false);
		}
	}
	const viewport = page.viewportSize();
	if (!viewport) throw new Error("Bookmark viewport dimensions are unavailable");
	expect(expanded.x).toBeGreaterThanOrEqual(0);
	expect(expanded.y).toBeGreaterThanOrEqual(0);
	expect(expanded.x + expanded.width).toBeLessThanOrEqual(viewport.width + 1);
	expect(expanded.y + expanded.height).toBeLessThanOrEqual(viewport.height + 1);
	await page.screenshot({ path: screenshotPath });
	await full.locator("button").click();
	await expect(page.locator(".bookmark-example-event")).toContainText("Chapter 2.");
	await page.mouse.move(0, 0);
	await expectExpanded(tab, false);
	const restored = book.locator('.flipbook-bookmark[data-spread-index="1"]');
	await expect(restored).toHaveCount(1);
	expect(await restored.evaluate((button, source) => button === source, original)).toBe(true);
	const collapsed = await boundsOf(restored);
	expect(collapsed.width).toBeCloseTo(resting.width, 1);
	expect(collapsed.height).toBeCloseTo(resting.height, 1);
	expect(collapsed.x).toBeCloseTo(resting.x, 0);
	expect(collapsed.y).toBeCloseTo(resting.y, 0);
	await original.dispose();
	expect(await pageStyles(book)).toEqual(pageResting);
}

async function dragBetween(
	page: Page,
	touch: boolean,
	start: Point,
	end: Point,
	whileHeld?: () => Promise<void>,
) {
	if (!touch) {
		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await page.mouse.move(end.x, end.y, { steps: 12 });
		await whileHeld?.();
		await page.mouse.up();
		return;
	}
	const client = await page.context().newCDPSession(page);
	await client.send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: [start],
	});
	for (let step = 1; step <= 12; step++) {
		await client.send("Input.dispatchTouchEvent", {
			type: "touchMove",
			touchPoints: [
				{
					x: start.x + ((end.x - start.x) * step) / 12,
					y: start.y + ((end.y - start.y) * step) / 12,
				},
			],
		});
	}
	await whileHeld?.();
	await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
	await client.detach();
}

async function pullUpperCorner(
	page: Page,
	surface: Locator,
	direction: Direction,
	touch: boolean,
	distance: number,
	whileHeld?: () => Promise<void>,
) {
	await surface.scrollIntoViewIfNeeded();
	const bounds = await boundsOf(surface);
	const sign = direction === "ltr" ? -1 : 1;
	const x = bounds.x + bounds.width * (direction === "ltr" ? 0.9 : 0.1);
	const y = bounds.y + bounds.height * 0.15;
	await dragBetween(
		page,
		touch,
		{ x, y },
		{ x: x + sign * bounds.width * distance, y: y + bounds.height * 0.03 },
		whileHeld,
	);
}

const PLACEMENTS: { value: string; edges: Edge[] }[] = [
	{ value: "top", edges: ["top"] },
	{ value: "bottom", edges: ["bottom"] },
	{ value: "sides", edges: ["left", "right"] },
	{ value: "left", edges: ["left"] },
	{ value: "right", edges: ["right"] },
	{ value: "top-bottom", edges: ["top", "bottom"] },
];

async function openDenseBookmarks(
	page: Page,
	direction: Direction,
	orientation: "perpendicular" | "parallel",
	attachment: "leaf" | "pinned",
) {
	const original = (await openBookmarks(page, direction)).first();
	const originalTitles = await original
		.locator(".page")
		.evaluateAll((pages) => pages.map((element) => (element as HTMLElement).dataset.pageTitle));
	await page.evaluate(
		async ({ direction, orientation, attachment }) => {
			// Reuse Vite's loaded URL, including its base path and platform-specific filesystem prefix.
			const moduleUrl = performance
				.getEntriesByType("resource")
				.find((entry) => new URL(entry.name).pathname.endsWith("/base/src/flipbook.ts"))?.name;
			if (!moduleUrl) throw new Error("The example's FlipBook module has not loaded");
			const { FlipBook } = await import(moduleUrl);
			const source = document.querySelector(
				".flipbook .page[data-page-index='3'] .flipbook-page-content",
			);
			if (!source) throw new Error("Real example content is unavailable for the dense fixture");
			const host = document.createElement("div");
			host.id = "dense-bookmark-book";
			host.dir = direction;
			Object.assign(host.style, {
				position: "fixed",
				inset: "12px",
				width: "auto",
				height: "auto",
				zIndex: "100000",
				background: "#f7f5ee",
				fontFamily: "Georgia, 'Times New Roman', serif",
			});
			for (let index = 0; index < 122; index++) {
				const leaf = document.createElement("div");
				leaf.className = "page";
				leaf.append(source.cloneNode(true));
				host.append(leaf);
			}
			const output = document.createElement("output");
			output.id = "dense-bookmark-click";
			output.hidden = true;
			document.body.append(host, output);
			for (const type of ["pointerdown", "click"])
				host.addEventListener(
					type,
					(event) => {
						const pointer = event as PointerEvent;
						output.dataset[type] = JSON.stringify({
							target: (event.target as Element).closest<HTMLElement>(".flipbook-bookmark")?.dataset
								.bookmarkId,
							x: pointer.clientX,
							y: pointer.clientY,
						});
					},
					true,
				);
			const bookmarks = Array.from({ length: 60 }, (_, index) => ({
				id: `dense-${index}`,
				pageIndex: index * 2 + 1,
				label:
					direction === "rtl"
						? `פרק ${index + 1} — כותרת מלאה`
						: `Chapter ${index + 1} — full title`,
				data: { ordinal: index },
			}));
			let clicks = 0;
			const book = new FlipBook({
				pagesCount: 122,
				direction,
				enableBookmarks: true,
				enableHistory: false,
				leafAspectRatio: { width: 1, height: 3 },
				coverAspectRatio: { width: 1, height: 3 },
				bookmarkProvider: {
					getBookmarks: () => bookmarks,
					orientation,
					attachment,
					placement: direction === "rtl" ? "left" : "right",
					renderBookmark: (bookmark: { data: { ordinal: number } }) => {
						const brief = document.createElement("strong");
						brief.textContent = `${direction === "rtl" ? "פרק" : "Chapter"} ${bookmark.data.ordinal + 1}`;
						return brief;
					},
					renderExpandedBookmark: (bookmark: { label: string }) => {
						const full = document.createElement("strong");
						full.textContent = bookmark.label;
						return full;
					},
					onClick: (leafIndex: number, bookmark: { id: string; data: { ordinal: number } }) => {
						output.dataset.id = bookmark.id;
						output.dataset.leaf = String(leafIndex);
						output.dataset.originalObject = String(bookmarks[bookmark.data.ordinal] === bookmark);
						output.dataset.count = String(++clicks);
					},
				},
			});
			book.render("#dense-bookmark-book");
		},
		{
			direction,
			orientation,
			attachment,
		},
	);
	const book = page.locator("#dense-bookmark-book");
	await expect(book.locator(".flipbook-bookmark[data-bookmark-id]")).toHaveCount(60);
	expect(
		await original
			.locator(".page")
			.evaluateAll((pages) => pages.map((element) => (element as HTMLElement).dataset.pageTitle)),
	).toEqual(originalTitles);
	return book;
}

for (const direction of ["ltr", "rtl"] as const) {
	for (const orientation of ["perpendicular", "parallel"] as const) {
		for (const attachment of ["leaf", "pinned"] as const) {
			test(`${direction}: 60 ${orientation} ${attachment} side bookmarks remain reachable in stepped ranges`, async ({
				page,
				isMobile,
			}, testInfo) => {
				test.setTimeout(120_000);
				await page.emulateMedia({ reducedMotion: "reduce" });
				const book = await openDenseBookmarks(page, direction, orientation, attachment);
				const edge = direction === "rtl" ? "left" : "right";
				const rail = book.locator(`.flipbook-bookmarks__rail[data-edge="${edge}"]`);
				await expect(rail).toBeVisible();
				// One round-trip collects the rail state, every slot's stacking data,
				// bounds, z-index, and exposed hit point — asserting per-locator here
				// costs ~600 protocol calls and roughly doubles the test's runtime.
				const assertStack = async () => {
					const stack = await rail.evaluate((railElement) => {
						const railBounds = railElement.getBoundingClientRect();
						const xOffsetsOf = (rect: DOMRect, edge: string | undefined, peek: number) => {
							const xs = [rect.width / 2];
							if (peek > 0) xs.unshift(edge === "left" ? peek / 2 : rect.width - peek / 2);
							for (let inset = 1; inset < rect.width; inset += 1) {
								xs.push(edge === "left" ? inset : rect.width - inset);
							}
							return xs;
						};
						const yOffsetsOf = (rect: DOMRect) => {
							const ys = [rect.height / 2];
							for (let offset = 1; offset < rect.height; offset += 1) ys.push(offset);
							return ys;
						};
						const hitPointOf = (button: HTMLElement) => {
							const slotElement = button.closest<HTMLElement>(".flipbook-bookmark-slot") ?? button;
							const rect = slotElement.getBoundingClientRect();
							const peek = Number(slotElement.dataset.stackPeek);
							for (const y of yOffsetsOf(rect)) {
								for (const x of xOffsetsOf(rect, button.dataset.edge, peek)) {
									const point = { x: Math.round(rect.left + x), y: Math.round(rect.top + y) };
									const target = document.elementFromPoint(point.x, point.y);
									if (target?.closest(".flipbook-bookmark") === button) return point;
								}
							}
							return null;
						};
						const slots = Array.from(
							railElement.querySelectorAll<HTMLElement>(".flipbook-bookmark"),
						).map((button) => {
							const slotElement = (button.closest(".flipbook-bookmark-slot") ??
								button) as HTMLElement;
							const rect = slotElement.getBoundingClientRect();
							return {
								id: button.dataset.bookmarkId,
								layer: slotElement.dataset.stackLayer,
								row: slotElement.dataset.stackRow,
								peek: Number(slotElement.dataset.stackPeek),
								bounds: rect.toJSON(),
								zIndex: Number(getComputedStyle(slotElement).zIndex),
								hitPoint: hitPointOf(button),
							};
						});
						const byId = new Map(slots.map((slot) => [slot.id, slot]));
						const first = byId.get("dense-0");
						const second = byId.get("dense-1");
						let gapTarget: string | null = null;
						if (first && second) {
							const gapPoint = {
								x: first.bounds.x + first.bounds.width / 2,
								y: (first.bounds.y + first.bounds.height + second.bounds.y) / 2,
							};
							gapTarget =
								document
									.elementFromPoint(gapPoint.x, gapPoint.y)
									?.closest<HTMLElement>(".flipbook-bookmark")?.dataset.bookmarkId ?? null;
						}
						return {
							capacity: Number(railElement.dataset.stackCapacity),
							layers: Number(railElement.dataset.stackLayers),
							pitch: Number(railElement.dataset.stackPitch),
							stagger: Number(railElement.dataset.stackStagger),
							scrollHeight: railElement.scrollHeight,
							scrollTop: railElement.scrollTop,
							clientHeight: railElement.clientHeight,
							top: railBounds.top,
							bottom: railBounds.bottom,
							slots,
							gapTarget,
						};
					});
					const { capacity, layers, pitch, stagger, slots } = stack;
					expect(capacity).toBeGreaterThan(0);
					expect(capacity).toBeLessThan(60);
					expect(layers).toBe(Math.ceil(60 / capacity));
					expect(pitch).toBeGreaterThan(0);
					expect(stagger).toBeCloseTo(pitch / 2, 1);
					expect(stack.scrollHeight).toBeLessThanOrEqual(stack.clientHeight + 1);
					expect(stack.scrollTop).toBe(0);
					const byId = new Map(slots.map((slot) => [slot.id, slot]));
					const slotAt = (index: number) => {
						const found = byId.get(`dense-${index}`);
						if (!found) throw new Error(`dense-${index} missing from collected slots`);
						return found;
					};
					for (let index = 0; index < 60; index++) {
						const slot = slotAt(index);
						expect(slot.layer).toBe(String(Math.floor(index / capacity)));
						expect(slot.row).toBe(String(index % capacity));
						expect(slot.peek).toBeGreaterThan(0);
						expect(slot.hitPoint, `dense-${index} must expose a hit target`).not.toBeNull();
						if (index >= capacity) {
							const front = slotAt(index - capacity);
							const behind = slot;
							const layer = Math.floor(index / capacity);
							expect(behind.bounds.y - front.bounds.y).toBeCloseTo(
								layer % 2 ? stagger : -stagger,
								1,
							);
							if (index >= capacity * 2) {
								const sameParity = slotAt(index - capacity * 2);
								expect(behind.bounds.y).toBeCloseTo(sameParity.bounds.y, 1);
							}
							expect(
								overlaps(
									{
										left: front.bounds.x,
										right: front.bounds.x + front.bounds.width,
										top: front.bounds.y,
										bottom: front.bounds.y + front.bounds.height,
									},
									{
										left: behind.bounds.x,
										right: behind.bounds.x + behind.bounds.width,
										top: behind.bounds.y,
										bottom: behind.bounds.y + behind.bounds.height,
									},
								),
							).toBe(true);
							expect(front.zIndex).toBeGreaterThan(behind.zIndex);
						}
						expect(slot.bounds.y).toBeGreaterThanOrEqual(stack.top - 1);
						expect(slot.bounds.y + slot.bounds.height).toBeLessThanOrEqual(stack.bottom + 1);
						if (index % capacity > 0) {
							const previous = slotAt(index - 1);
							expect(slot.bounds.y).toBeGreaterThanOrEqual(
								previous.bounds.y + previous.bounds.height,
							);
						}
					}
					if (capacity > 1) {
						expect(
							stack.gapTarget,
							"The next range must show through the front range's white gap",
						).toBe(`dense-${capacity}`);
					}
					return { capacity, layers, pitch, stagger };
				};
				const before = await assertStack();
				await page.screenshot({ path: testInfo.outputPath("bookmarks-dense-stacked-idle.png") });
				const restingPages = await currentPages(book);
				// Full pointer interactions are verified at each stacked layer's head
				// row plus the last tab; the batched assertStack scan already proved
				// every tab exposes a hit target, so clicking all 60 adds serial
				// protocol time (~90s) without covering a different code path.
				let clicks = 0;
				for (let index = 0; index < 60; index++) {
					if (index % before.capacity !== 0 && index !== 59) continue;
					const tab = page.locator(`.flipbook-bookmark[data-bookmark-id="dense-${index}"]`);
					const source = await tab.elementHandle();
					if (!source) throw new Error(`Dense bookmark ${index} disappeared`);
					const point = await exposedHitPoint(tab);
					if (!isMobile) {
						const family = await fontFamilies(tab);
						const resting = await boundsOf(tab);
						await page.mouse.move(point.x, point.y);
						await expectExpanded(tab, true);
						expect(await fontFamilies(tab)).toEqual(family);
						const full = tab.locator(".flipbook-bookmark__expanded-content strong");
						await expect(full).toHaveText((await tab.getAttribute("aria-label")) ?? "");
						await expect(full).toHaveCSS("font-family", family.button);
						const revealed = await boundsOf(tab);
						expect(revealed.width).toBeCloseTo(resting.width, 1);
						expect(revealed.height).toBeCloseTo(resting.height, 1);
						expect(await tab.evaluate((button, original) => button === original, source)).toBe(
							true,
						);
						await page.screenshot({
							path: testInfo.outputPath(
								`bookmarks-dense-layer-${Math.floor(index / before.capacity)}-hover.png`,
							),
						});
						const hit = await exposedHitPoint(tab);
						await page.mouse.click(hit.x, hit.y);
					} else {
						await page.touchscreen.tap(point.x, point.y);
					}
					clicks += 1;
					const output = page.locator("#dense-bookmark-click");
					await expect(
						output,
						await output.evaluate((element) => element.outerHTML),
					).toHaveAttribute("data-id", `dense-${index}`);
					await expect(output).toHaveAttribute("data-count", String(clicks));
					await expect(output).toHaveAttribute("data-original-object", "true");
					await page.mouse.move(0, 0);
					await expectExpanded(tab, false);
					await expect(
						book.locator(`.flipbook-bookmark[data-bookmark-id="dense-${index}"]`),
					).toHaveCount(1);
					await source.dispose();
				}
				expect(await currentPages(book)).toEqual(restingPages);
				const smallerHeight = await rail.evaluate((element) => element.clientHeight * 0.55);
				await book.evaluate((host, height) => {
					host.style.height = `${height}px`;
					host.style.bottom = "auto";
				}, smallerHeight);
				await page.waitForFunction(
					({ edge, capacity }) =>
						Number(
							document.querySelector<HTMLElement>(
								`#dense-bookmark-book .flipbook-bookmarks__rail[data-edge="${edge}"]`,
							)?.dataset.stackCapacity,
						) < capacity,
					{ edge, capacity: before.capacity },
				);
				const resized = await assertStack();
				expect(resized.capacity).toBeLessThan(before.capacity);
				expect(resized.layers).toBeGreaterThanOrEqual(before.layers);
				await page.screenshot({ path: testInfo.outputPath("bookmarks-dense-stacked-resized.png") });
				await testInfo.attach("bookmark-dense-stack-layout", {
					body: JSON.stringify({ direction, orientation, attachment, before, resized }, null, 2),
					contentType: "application/json",
				});
			});
		}
	}

	test(`${direction}: custom and default bookmark typography survives hover`, async ({
		page,
		isMobile,
	}, testInfo) => {
		test.skip(isMobile, "Pointer hover typography is verified on desktop.");
		const book = await openBookmarks(page, direction);
		for (const provider of ["custom", "default"] as const) {
			await page.getByRole("combobox", { name: "Provider", exact: true }).selectOption(provider);
			const tab = bookmarkForPage(page, 6);
			const family = await fontFamilies(tab);
			const hit = await exposedHitPoint(tab);
			await page.mouse.move(hit.x, hit.y);
			await expectExpanded(tab, true);
			expect(await fontFamilies(tab)).toEqual(family);
			await expect(tab.locator(".flipbook-bookmark__expanded-content strong")).toHaveCSS(
				"font-family",
				family.button,
			);
			await page.screenshot({ path: testInfo.outputPath(`bookmarks-${provider}-font-hover.png`) });
			await page.mouse.move(0, 0);
			await expectExpanded(tab, false);
			await expect(book.locator('.flipbook-bookmark[data-spread-index="3"]')).toHaveCount(1);
		}
	});

	test(`${direction}: each bookmark represents both pages of one facing spread`, async ({
		page,
		isMobile,
	}, testInfo) => {
		const book = await openBookmarks(page, direction, 1000000);
		const count = (await expectedSpreads(book)).length;
		const tab = bookmarkForPage(page, 13);
		const leftTitle = await book
			.locator('.page[data-page-index="13"]')
			.getAttribute("data-page-title");
		const rightTitle = await book
			.locator('.page[data-page-index="14"]')
			.getAttribute("data-page-title");
		await expect(tab).toHaveAttribute("data-page-index", "13");
		await expect(tab).toHaveAttribute("data-spread-index", "7");
		await expect(tab).toHaveAttribute(
			"aria-label",
			[leftTitle, rightTitle].filter(Boolean).join(" / "),
		);
		if (direction === "ltr") await expect(tab).toHaveAttribute("aria-label", "DELETE / JOIN");
		await expect(book.locator('.flipbook-bookmark[data-spread-index="7"]')).toHaveCount(1);
		await expect(book.locator('.flipbook-bookmark[data-page-index="14"]')).toHaveCount(0);
		const label = await tab.getAttribute("aria-label");
		await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("inspect");
		await inspectBookmark(page, book, tab);
		await page
			.getByRole("combobox", { name: "Click action", exact: true })
			.selectOption("navigate");
		await activateBookmark(tab);
		await expect(book.locator('.page[data-page-index="13"]')).toHaveClass(/current-page/);
		const surface = book.locator('.page[data-page-index="14"]');
		await expect(surface).toHaveClass(/current-page/);
		await pullUpperCorner(page, surface, direction, isMobile, 1.3, async () => {
			await page.screenshot({ path: testInfo.outputPath("bookmarks-facing-spread-held.png") });
		});
		await expect(book.locator('.page[data-page-index="16"]')).toHaveClass(/current-page/);
		await expect(tab).toHaveAttribute("data-page-index", "13");
		await expect(tab).toHaveAttribute("aria-label", label ?? "");
		await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("inspect");
		await inspectBookmark(page, book, tab);
		await page
			.getByRole("combobox", { name: "Click action", exact: true })
			.selectOption("navigate");
		await activateBookmark(tab);
		await expect(book.locator('.page[data-page-index="13"]')).toHaveClass(/current-page/);
		await expect(surface).toHaveClass(/current-page/);
		await expect(tab).toHaveAttribute("aria-label", label ?? "");
		await expect(book.locator(".flipbook-bookmark")).toHaveCount(count);
		await page
			.locator(".bookmark-example-stage")
			.screenshot({ path: testInfo.outputPath("bookmarks-facing-spread-return.png") });
	});

	test(`${direction}: bookmark visibility toggles preserve navigation in both examples`, async ({
		page,
	}) => {
		for (const example of ["bookmarks", "comprehensive"]) {
			await page.goto(`/?example=${direction}-${example}&test-initialTurnedLeaves=0,1,2`);
			const book = page.locator(".flipbook");
			await expect(book.locator('.page[data-page-index="6"]')).toHaveClass(/current-page/);
			const spread = await currentPages(book);
			const show = page.getByRole("button", { name: "Show bookmarks", exact: true });
			if (await show.count()) await show.click();
			const count = (await expectedSpreads(book)).length;
			await expect(book.locator(".flipbook-bookmark")).toHaveCount(count);
			await page.getByRole("button", { name: "Hide bookmarks", exact: true }).click();
			await expect(book.locator(".flipbook-bookmark")).toHaveCount(0);
			expect(await currentPages(book)).toEqual(spread);
			await show.click();
			await expect(book.locator(".flipbook-bookmark")).toHaveCount(count);
			expect(await currentPages(book)).toEqual(spread);
		}
	});

	test(`${direction}: page scrollbars stay beside the spine without reversing text`, async ({
		page,
		isMobile,
	}, testInfo) => {
		const measurements = [];
		for (const example of ["bookmarks", "comprehensive"]) {
			await page.goto(`/?example=${direction}-${example}&test-initialTurnedLeaves=0,1,2`);
			const book = page.locator(".flipbook");
			await expect(book.locator('.page[data-page-index="6"]')).toHaveClass(/current-page/);
			const spread = await currentPages(book);
			for (const index of [5, 6, 2]) {
				if (index === 2) {
					expect(await currentPages(book)).toEqual(spread);
					await book.screenshot({
						path: testInfo.outputPath(`bookmarks-${example}-spine-scrollbars.png`),
					});
					await page.locator(".flipbook-toolbar-toc").click();
					await expect(book.locator('.page[data-page-index="2"]')).toHaveClass(/current-page/);
				}
				const surface = book.locator(`.page[data-page-index="${index}"]`);
				const left = (direction === "ltr") === (index % 2 === 0);
				await expect(surface).toHaveAttribute("data-scrollbar-side", left ? "left" : "right");
				const scrollport = surface.locator(":scope > .flipbook-page-scrollport");
				const content = scrollport.locator(":scope > .flipbook-page-content");
				await expect(scrollport).toHaveCSS("direction", left ? "rtl" : "ltr");
				// Overlay scrollbars otherwise report no gutter in headless Chromium.
				await scrollport.evaluate((element) => {
					(element as HTMLElement).style.scrollbarGutter = "stable";
				});
				await expect(content).toHaveAttribute("dir", direction);
				await expect(content).toHaveCSS("direction", direction);
				if (index === 2) {
					await expect(content.locator(".toc-page__scroll")).toHaveCSS("overflow-y", "visible");
					await expect(content.locator(".toc-page__scroll")).toHaveCSS("direction", direction);
				} else
					await expect(content.locator(direction === "ltr" ? ".en-page" : ".he-page")).toHaveCSS(
						"direction",
						direction,
					);
				const metrics = await scrollport.evaluate((element) => {
					const scrollport = element as HTMLElement;
					const style = getComputedStyle(scrollport);
					const borderLeft = parseFloat(style.borderLeftWidth) || 0;
					const borderRight = parseFloat(style.borderRightWidth) || 0;
					return {
						clientLeft: scrollport.clientLeft,
						gutter: scrollport.offsetWidth - scrollport.clientWidth - borderLeft - borderRight,
						borderLeft,
						scrollHeight: scrollport.scrollHeight,
						clientHeight: scrollport.clientHeight,
					};
				});
				expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
				if (!isMobile) expect(metrics.gutter).toBeGreaterThan(0);
				if (metrics.gutter > 1)
					expect(metrics.clientLeft - metrics.borderLeft).toBeCloseTo(left ? metrics.gutter : 0, 0);
				measurements.push({ example, page: index, side: left ? "left" : "right", ...metrics });
				if (metrics.scrollHeight > metrics.clientHeight) {
					await scrollport.evaluate((element) => {
						element.scrollTop = 60;
					});
					expect(await scrollport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
				}
			}
			await book.screenshot({
				path: testInfo.outputPath(`bookmarks-${example}-toc-spine-scrollbar.png`),
			});
		}
		await testInfo.attach("bookmark-page-scrollbars", {
			body: JSON.stringify(measurements, null, 2),
			contentType: "application/json",
		});
	});

	test(`${direction}: covers keep the inner part of bookmarks underneath the book`, async ({
		page,
		isMobile,
	}, testInfo) => {
		const book = await openBookmarks(page, direction, undefined, null);
		const paper = await boundsOf(book.locator('.page[data-page-index="2"]'));
		const tab = await boundsOf(bookmarkForPage(page, 2));
		const inner = {
			x: direction === "ltr" ? paper.x + paper.width + 4 : paper.x - 4,
			y: tab.y + tab.height / 2,
		};
		const outer = { x: direction === "ltr" ? tab.x + tab.width - 4 : tab.x + 4, y: inner.y };
		const covered = await book.locator(".page--cover").evaluateAll(
			(elements, point) =>
				elements.some((element) => {
					const rect = element.getBoundingClientRect();
					return (
						point.x > rect.left &&
						point.x < rect.right &&
						point.y > rect.top &&
						point.y < rect.bottom
					);
				}),
			inner,
		);
		expect(covered).toBe(true);
		const hit = await page.evaluate(
			({ inner, outer }) => ({
				innerPage: (
					document.elementFromPoint(inner.x, inner.y)?.closest(".page") as HTMLElement | null
				)?.dataset.pageIndex,
				innerTab: Boolean(
					document.elementFromPoint(inner.x, inner.y)?.closest(".flipbook-bookmark"),
				),
				outerLeaf: (
					document
						.elementFromPoint(outer.x, outer.y)
						?.closest(".flipbook-bookmark") as HTMLElement | null
				)?.dataset.leafIndex,
			}),
			{ inner, outer },
		);
		const stack = await book.evaluate((element) => ({
			cover: getComputedStyle(element.querySelector('.page[data-page-index="0"]') as Element)
				.zIndex,
			owner: getComputedStyle(element.querySelector('.page[data-page-index="0"]') as Element)
				.zIndex,
			tab: getComputedStyle(
				element.querySelector('.flipbook-bookmark[data-spread-index="1"]') as Element,
			).zIndex,
		}));
		await testInfo.attach("bookmark-cover-stacking", {
			body: JSON.stringify({ inner, outer, hit, stack }, null, 2),
			contentType: "application/json",
		});
		expect(hit.innerTab, JSON.stringify({ hit, stack })).toBe(false);
		expect(hit.innerPage).toBe("0");
		expect(hit.outerLeaf).toBe("0");
		await page
			.locator(".bookmark-example-stage")
			.screenshot({ path: testInfo.outputPath("bookmarks-cover-layer.png") });
		await activateBookmark(bookmarkForPage(page, 6), isMobile);
		await expect(book.locator('.page[data-page-index="6"]')).toHaveClass(/current-page/);
		const openPaper = await boundsOf(book.locator('.page[data-page-index="6"]'));
		const currentTab = bookmarkForPage(page, 8);
		const openTab = await exposedBounds(currentTab);
		const openPoint = {
			x: direction === "ltr" ? openPaper.x + openPaper.width + 4 : openPaper.x - 4,
			y: openTab.y + openTab.height / 2,
		};
		const openStack = await currentTab.evaluate(
			(button, point) => ({
				expected: (button as HTMLElement).dataset.bookmarkId,
				owner: (button as HTMLElement).dataset.leafIndex,
				tabZ: getComputedStyle(button).zIndex,
				railZ: getComputedStyle(button.closest(".flipbook-bookmarks__rail") as Element).zIndex,
				hit: document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>(".flipbook-bookmark")
					?.dataset.bookmarkId,
				pages: [
					...new Set(
						document
							.elementsFromPoint(point.x, point.y)
							.map((element) => element.closest<HTMLElement>(".page")?.dataset.pageIndex)
							.filter(Boolean),
					),
				],
				covers: Array.from(
					button.closest(".flipbook")?.querySelectorAll<HTMLElement>(".page--cover") ?? [],
				).map((cover) => ({
					index: cover.dataset.pageIndex,
					zIndex: getComputedStyle(cover).zIndex,
					bounds: cover.getBoundingClientRect().toJSON(),
				})),
			}),
			openPoint,
		);
		await testInfo.attach("bookmark-open-cover-stacking", {
			body: JSON.stringify({ openPoint, openPaper, openTab, openStack }, null, 2),
			contentType: "application/json",
		});
		await page
			.locator(".bookmark-example-stage")
			.screenshot({ path: testInfo.outputPath("bookmarks-open-cover-layer.png") });
		expect(openStack.hit, JSON.stringify(openStack)).toBe(openStack.expected);
	});

	test(`${direction}: the first native pointer activation opens a bookmarked page`, async ({
		page,
		isMobile,
	}) => {
		const book = await openBookmarks(page, direction);
		const tab = bookmarkForPage(page, 8);
		await tab.scrollIntoViewIfNeeded();
		const bounds = await exposedBounds(tab);
		const x = bounds.x + bounds.width / 2;
		const y = bounds.y + bounds.height / 2;
		if (isMobile) await page.touchscreen.tap(x, y);
		else await page.mouse.click(x, y);
		await expect(book.locator('.page[data-page-index="8"]')).toHaveClass(/current-page/);
	});

	test(`${direction}: keyboard traversal keeps the page order while bookmarks expand`, async ({
		page,
		isMobile,
	}) => {
		test.skip(isMobile, "Keyboard traversal is verified on desktop.");
		await openBookmarks(page, direction);
		const first = bookmarkForPage(page, 2);
		const next = bookmarkForPage(page, 4);
		await first.focus();
		await expectExpanded(first, true);
		await page.keyboard.press("Tab");
		await expect(next).toBeFocused();
		await expectExpanded(next, true);
		await page.keyboard.press("Shift+Tab");
		await expect(first).toBeFocused();
		await expectExpanded(first, true);
	});

	test(`${direction}: built-in bookmarks use the existing table of contents`, async ({
		page,
	}, testInfo) => {
		await page.goto(`/?example=${direction}-bookmarks&test-initialTurnedLeaves=0`);
		await page.getByRole("combobox", { name: "Provider", exact: true }).selectOption("default");
		const book = page.locator(".flipbook");
		const toc = book.locator('.page[data-page-index="2"]');
		await expect(toc.locator(".toc-title").first()).toBeVisible();
		const tabs = book.locator(".flipbook-bookmark");
		const expected = await expectedSpreads(book);
		await expect(tabs).toHaveCount(expected.length);
		for (const tab of await tabs.all()) {
			const spread = Number(await tab.getAttribute("data-spread-index"));
			const label = await tab.getAttribute("aria-label");
			for (const index of [spread * 2 - 1, spread * 2]) {
				const title = await book
					.locator(`.page[data-page-index="${index}"]`)
					.getAttribute("data-page-title");
				if (title) expect(label).toContain(title);
			}
		}
		const compact = await tabs.locator(".flipbook-bookmark__content").allTextContents();
		expect(compact.every((text) => /[A-Za-z\u0590-\u05FF]/.test(text))).toBe(true);
		const leaves = await tabs.evaluateAll((elements) =>
			elements.map((element) => Number((element as HTMLElement).dataset.spreadIndex)),
		);
		expect([...leaves].sort((a, b) => a - b)).toEqual(expected);
		await page.locator(".bookmark-example-stage").screenshot({
			path: testInfo.outputPath("bookmarks-built-in.png"),
		});
		await activateBookmark(bookmarkForPage(page, 4));
		await expect(book.locator('.page[data-page-index="4"]')).toHaveClass(/current-page/);
		await page.locator(".flipbook-toolbar-toc").click();
		await expect(toc).toHaveClass(/current-page/);
		const spread = await currentPages(book);
		await page.getByRole("combobox", { name: "Provider", exact: true }).selectOption("custom");
		await expect(tabs).toHaveCount(expected.length);
		await page.getByRole("combobox", { name: "Provider", exact: true }).selectOption("default");
		expect(await currentPages(book)).toEqual(spread);
	});

	test(`${direction}: all pinned bookmark placements keep separate, reachable tabs`, async ({
		page,
	}, testInfo) => {
		const book = await openBookmarks(page, direction);
		await page.locator(".bookmark-example-stage").screenshot({
			path: testInfo.outputPath("bookmarks-default.png"),
		});
		await activateBookmark(bookmarkForPage(page, 4));
		await expect(book.locator('.page[data-page-index="4"]')).toHaveClass(/current-page/);
		await page.getByRole("combobox", { name: "Attachment", exact: true }).selectOption("pinned");
		const spread = await currentPages(book);
		const turnedEdge = direction === "ltr" ? "left" : "right";
		await expect(
			book.locator(
				`.flipbook-bookmarks__rail[data-edge="${turnedEdge}"] .flipbook-bookmark[data-spread-index="1"]`,
			),
		).toHaveCount(1);
		for (const placement of PLACEMENTS) {
			await page
				.getByRole("combobox", { name: "Placement", exact: true })
				.selectOption(placement.value);
			await expectSeparateTabs(book, placement.edges);
			await expectOrientation(book, "perpendicular");
			await page
				.getByRole("combobox", { name: "Orientation", exact: true })
				.selectOption("parallel");
			await expectSeparateTabs(book, placement.edges).catch(async (error) => {
				await testInfo.attach("bookmark-unreachable-native-target", {
					body: JSON.stringify(
						(await page.evaluate(() => Reflect.get(window, "__unreachableBookmark"))) ?? {
							error: String(error),
						},
						null,
						2,
					),
					contentType: "application/json",
				});
				await page.screenshot({ path: testInfo.outputPath("bookmarks-unreachable-target.png") });
				throw error;
			});
			await expectOrientation(book, "parallel");
			await page
				.getByRole("combobox", { name: "Orientation", exact: true })
				.selectOption("perpendicular");
			expect(await currentPages(book)).toEqual(spread);
		}
	});

	test(`${direction}: bookmark jumps, custom actions, ordering, and provider updates`, async ({
		page,
	}) => {
		const book = await openBookmarks(page, direction);
		const expected = await expectedSpreads(book);
		await page.getByRole("combobox", { name: "Attachment", exact: true }).selectOption("pinned");
		const tab = bookmarkForPage(page, 8);
		await activateBookmark(tab);
		await expect(book.locator('.page[data-page-index="8"]')).toHaveClass(/current-page/);
		const spread = await currentPages(book);
		await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption("top");
		await page.getByRole("combobox", { name: "Order", exact: true }).selectOption("reverse-page");
		const rail = book.locator('.flipbook-bookmarks__rail[data-edge="top"]');
		const reverse = (await railLayout(rail)).tabs.map((item) => Math.floor((item.page + 1) / 2));
		expect(reverse).toEqual([...expected].reverse());
		await page.getByRole("combobox", { name: "Order", exact: true }).selectOption("title");
		const titleOrder = (await railLayout(rail)).tabs.map((item) => Math.floor((item.page + 1) / 2));
		expect([...titleOrder].sort((a, b) => a - b)).toEqual(expected);
		expect(titleOrder).not.toEqual(reverse);
		await page.getByLabel("Upcoming chapters only", { exact: true }).check();
		await expect(book.locator(".flipbook-bookmark")).toHaveCount(
			(await expectedSpreads(book, Math.min(...spread))).length,
		);
		await page.getByLabel("Upcoming chapters only", { exact: true }).uncheck();
		await expect(book.locator(".flipbook-bookmark")).toHaveCount(expected.length);
		expect(await currentPages(book)).toEqual(spread);

		await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("inspect");
		const otherTab = bookmarkForPage(page, 2);
		const label = await otherTab.getAttribute("aria-label");
		const target = Number(await otherTab.getAttribute("data-page-index"));
		await activateBookmark(otherTab);
		await expect(page.locator(".bookmark-example-event")).toHaveText(
			`From leaf ${Math.floor(Math.min(...spread) / 2) + 1}: ${label} (page ${target + 1}). Chapter 2.`,
		);
		expect(await currentPages(book)).toEqual(spread);
		await page
			.getByRole("combobox", { name: "Click action", exact: true })
			.selectOption("navigate");
		await activateBookmark(otherTab);
		await expect(book.locator(`.page[data-page-index="${target}"]`)).toHaveClass(/current-page/);
	});

	test(`${direction}: hover slides the same fixed size bookmark along its long axis`, async ({
		page,
		isMobile,
	}, testInfo) => {
		test.skip(isMobile, "Touch activation is covered without mouse hover.");
		await page.setViewportSize({ width: 1600, height: 1000 });
		const book = await openBookmarks(page, direction);
		await page.getByRole("combobox", { name: "Attachment", exact: true }).selectOption("pinned");
		// Leave room to distinguish outward sliding from the viewport fallback.
		await page.addStyleTag({
			content: `
				.bookmark-example-stage { width: 760px; height: 520px; flex: 0 0 auto; }
				.bookmark-example-stage > .en-book-wrap,
				.bookmark-example-stage > .he-book-wrap { height: 520px; flex: none; }
			`,
		});
		await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("inspect");
		for (const orientation of ["perpendicular", "parallel"] as const) {
			for (const edge of ["left", "right", "top", "bottom"] as const) {
				await test.step(`${orientation}: ${edge}`, async () =>
					checkExpansion(
						page,
						book,
						edge,
						orientation,
						testInfo.outputPath(`bookmarks-${edge}-${orientation}-exposed.png`),
					));
			}
		}
	});

	test(`${direction}: edge hover curls the page while attached bookmarks stay still`, async ({
		page,
		isMobile,
	}, testInfo) => {
		test.skip(isMobile, "Edge hover is a mouse interaction.");
		const book = await openBookmarks(page, direction, 1000000, "0,1");
		await page.mouse.move(0, 0);
		await page.keyboard.press("Escape");
		for (const turn of ["forward", "backward"] as const) {
			const surface = book.locator(`.page[data-page-index="${turn === "forward" ? 4 : 3}"]`);
			const tab = bookmarkForPage(page, turn === "forward" ? 6 : 4);
			await surface.scrollIntoViewIfNeeded();
			const bounds = await boundsOf(surface);
			const before = await boundsOf(tab);
			const onRight = (direction === "ltr") === (turn === "forward");
			await page.mouse.move(
				bounds.x + bounds.width * (onRight ? 0.98 : 0.02),
				bounds.y + bounds.height * 0.1,
			);
			await expect(book.locator(".page--folded")).toHaveCount(2);
			await expect(book.locator(".flipbook-bookmark-surface")).toHaveCount(0);
			await expect(tab).not.toHaveAttribute("data-bookmark-motion", "true");
			const hovered = await boundsOf(tab);
			expect(hovered.x).toBeCloseTo(before.x, 1);
			expect(hovered.y).toBeCloseTo(before.y, 1);
			expect(hovered.width).toBeCloseTo(before.width, 1);
			expect(hovered.height).toBeCloseTo(before.height, 1);
			await page.screenshot({ path: testInfo.outputPath(`bookmarks-${turn}-edge-hover.png`) });
			await page.mouse.move(0, 0);
			await expect(book.locator(".page--folded")).toHaveCount(0);
		}
	});

	test(`${direction}: dragging a bookmark turns the current page and suppresses its click`, async ({
		page,
		isMobile,
	}, testInfo) => {
		for (const turn of ["forward", "backward"] as const) {
			const book = await openBookmarks(page, direction, 1000000, "0,1,2");
			await page
				.getByRole("combobox", { name: "Click action", exact: true })
				.selectOption("navigate");
			const tab = bookmarkForPage(page, turn === "forward" ? 14 : 2);
			await bookmarkSlot(tab).scrollIntoViewIfNeeded();
			const destination = Number(await tab.getAttribute("data-page-index"));
			const before = await page.locator(".bookmark-example-event").textContent();
			const surface = book.locator(`.page[data-page-index="${turn === "forward" ? 6 : 5}"]`);
			const paper = await boundsOf(surface);
			const exposed = await exposedBounds(tab);
			const start = { x: exposed.x + exposed.width / 2, y: exposed.y + exposed.height / 2 };
			const sign = (direction === "ltr") === (turn === "forward") ? -1 : 1;
			await dragBetween(
				page,
				isMobile,
				start,
				{ x: start.x + sign * paper.width * 1.6, y: start.y },
				async () => {
					await expect(book.locator(".page--folded")).toHaveCount(2);
					const moving = await book
						.locator(".page--folded")
						.evaluateAll((pages) =>
							pages
								.map((element) => Number((element as HTMLElement).dataset.pageIndex))
								.sort((a, b) => a - b),
						);
					expect(moving).toEqual(turn === "forward" ? [6, 7] : [4, 5]);
					await page.screenshot({ path: testInfo.outputPath(`bookmarks-drag-${turn}-held.png`) });
				},
			);
			await expect(
				book.locator(`.page[data-page-index="${turn === "forward" ? 8 : 4}"]`),
			).toHaveClass(/current-page/);
			await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
			await expect(page.locator(".bookmark-example-event")).toHaveText(before ?? "");
			await activateBookmark(tab, isMobile);
			await expect(book.locator(`.page[data-page-index="${destination}"]`)).toHaveClass(
				/current-page/,
			);
		}
	});

	test(`${direction}: selection mode keeps bookmark dragging native without flipping`, async ({
		page,
		isMobile,
	}) => {
		const book = await openBookmarks(page, direction, 1000000, "0,1,2");
		await page.locator(".flipbook-toolbar-mouse-mode").click();
		const tab = bookmarkForPage(page, 14);
		await expect(tab).toHaveAttribute("data-mouse-mode", "select");
		await page.mouse.move(0, 0);
		await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
		await bookmarkSlot(tab).scrollIntoViewIfNeeded();
		const exposed = await exposedBounds(tab);
		const spread = await currentPages(book);
		const before = await pageStyles(book);
		const inset = Math.min(8, exposed.width / 5);
		const y = exposed.y + exposed.height / 2;
		await dragBetween(
			page,
			isMobile,
			{ x: exposed.x + inset, y },
			{ x: exposed.x + exposed.width - inset, y },
			async () => {
				await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
			},
		);
		await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
		expect(await currentPages(book)).toEqual(spread);
		expect(await pageStyles(book)).toEqual(before);
		if (!isMobile)
			expect(await page.evaluate(() => window.getSelection()?.toString() ?? "")).not.toBe("");
	});

	test(`${direction}: top and bottom bookmarks stay on the half containing their target leaf`, async ({
		page,
		isMobile,
	}) => {
		const book = await openBookmarks(page, direction, 1000000);
		await activateBookmark(bookmarkForPage(page, 4));
		await expect(book.locator('.page[data-page-index="4"]')).toHaveClass(/current-page/);
		for (const placement of ["top", "bottom", "top-bottom"] as const) {
			await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption(placement);
			const tab = bookmarkForPage(page, 6);
			const forward = book.locator('.page[data-page-index="4"]');
			const backward = book.locator('.page[data-page-index="3"]');
			await expectTabWithinPage(tab, forward);
			await expectTabWithinPage(bookmarkForPage(page, 4), backward);
			await forward.scrollIntoViewIfNeeded();
			const bounds = await boundsOf(forward);
			const before = await boundsOf(tab);
			const sign = direction === "ltr" ? -1 : 1;
			const x = bounds.x + bounds.width * (direction === "ltr" ? 0.9 : 0.1);
			const y = bounds.y + bounds.height * 0.15;
			await dragBetween(
				page,
				isMobile,
				{ x, y },
				{ x: x + sign * bounds.width * 0.15, y: y + bounds.height * 0.03 },
				async () => {
					await expect(book.locator(".page--folded, .page--flipping")).not.toHaveCount(0);
					const held = await boundsOf(tab);
					expect(Math.abs(held.x - before.x)).toBeLessThan(bounds.width * 0.4);
				},
			);
			await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
			await expect(forward).toHaveClass(/current-page/);
		}
	});

	test(`${direction}: fixed side bookmarks follow their owning leaf through cancellation and completion`, async ({
		page,
		isMobile,
	}) => {
		const book = await openBookmarks(page, direction, 1000000);
		const count = (await expectedSpreads(book)).length;
		await activateBookmark(bookmarkForPage(page, 4));
		await expect(book.locator('.page[data-page-index="4"]')).toHaveClass(/current-page/);
		const forwardEdge = direction === "ltr" ? "right" : "left";
		await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption(forwardEdge);
		const tab = bookmarkForPage(page, 6);
		const surface = book.locator('.page[data-page-index="4"]');
		await expect(tab).toBeVisible();
		await expect(bookmarkForPage(page, 4)).toBeHidden();
		// A focused tab can be portaled into its preview; count source identities across both hosts.
		await expect(page.locator(".flipbook-bookmark[data-bookmark-id]")).toHaveCount(count);
		// Leave any hover preview before measuring the bookmark's resting geometry.
		await page.mouse.move(0, 0);
		await page.keyboard.press("Escape");
		await expect(page.locator(".flipbook-bookmark-preview")).toBeHidden();
		const resting = await boundsOf(surface);
		const before = await boundsOf(tab);
		await pullUpperCorner(page, surface, direction, isMobile, 0.15, async () => {
			await expect(book.locator(".page--folded, .page--flipping")).not.toHaveCount(0);
			await expect(tab).toBeVisible();
			const held = await boundsOf(tab);
			expect(Math.abs(held.x - before.x)).toBeLessThan(resting.width * 0.4);
		});
		await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
		await expect(surface).toHaveClass(/current-page/);
		await expect(tab).toBeVisible();
		expectTabMeetsLeaf(await exposedBounds(tab), await boundsOf(surface), direction);
		await pullUpperCorner(page, surface, direction, isMobile, 1.3);
		await expect(book.locator('.page[data-page-index="6"]')).toHaveClass(/current-page/);
		await expect(tab).toBeHidden();
		await expect(bookmarkForPage(page, 8)).toBeVisible();

		await page.getByRole("combobox", { name: "Attachment", exact: true }).selectOption("pinned");
		await expect(book.locator(".flipbook-bookmark")).toHaveCount(count);
		await expect(tab).toBeVisible();
	});

	test(`${direction}: top and bottom bookmark assignments survive completed turns`, async ({
		page,
		isMobile,
	}) => {
		const book = await openBookmarks(page, direction, 1000000);
		const leaves = await expectedSpreads(book);
		await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption("top-bottom");
		for (const [pageIndex, edge] of [
			[leaves[0] * 2, "top"],
			[leaves[leaves.length - 2] * 2, "bottom"],
		] as const) {
			const tab = bookmarkForPage(page, pageIndex);
			await activateBookmark(tab);
			const surface = book.locator(`.page[data-page-index="${pageIndex}"]`);
			await expect(surface).toHaveClass(/current-page/);
			await expect(tab).toHaveAttribute("data-edge", edge);
			await pullUpperCorner(page, surface, direction, isMobile, 1.3);
			await expect(book.locator(`.page[data-page-index="${pageIndex + 2}"]`)).toHaveClass(
				/current-page/,
			);
			await expect(tab).toHaveAttribute("data-edge", edge);
			await expect(tab).toBeVisible();
		}
	});

	test(`${direction}: attached bookmarks move with their leaf while pinned bookmarks stay put`, async ({
		page,
		isMobile,
	}, testInfo) => {
		for (const orientation of ["perpendicular", "parallel"] as const) {
			for (const attachment of ["leaf", "pinned"] as const) {
				const book = await openBookmarks(page, direction);
				await page
					.getByRole("combobox", { name: "Orientation", exact: true })
					.selectOption(orientation);
				await page
					.getByRole("combobox", { name: "Attachment", exact: true })
					.selectOption(attachment);
				const tab = bookmarkForPage(page, 4);
				const other = bookmarkForPage(page, 8);
				const surface = book.locator('.page[data-page-index="2"]');
				await surface.scrollIntoViewIfNeeded();
				await bookmarkSlot(tab).scrollIntoViewIfNeeded();
				const bounds = await boundsOf(surface);
				const before = await boundsOf(tab);
				const beforeTip = await boundsOf(tab.locator(".flipbook-bookmark__content:not([hidden])"));
				if (attachment === "leaf") expectTabMeetsLeaf(await exposedBounds(tab), bounds, direction);
				const stationary = await boundsOf(other);
				const sign = direction === "ltr" ? -1 : 1;
				const x = bounds.x + bounds.width * (direction === "ltr" ? 0.8 : 0.2);
				const y = bounds.y + bounds.height * 0.15;
				await dragBetween(
					page,
					isMobile,
					{ x, y },
					{
						x: x + sign * bounds.width * 0.6,
						y: y + (orientation === "parallel" ? 0 : bounds.height * 0.15),
					},
					async () => {
						await expect(book.locator(".page--folded, .page--flipping")).not.toHaveCount(0);
						await page.screenshot({
							path: testInfo.outputPath(
								`bookmarks-${orientation === "parallel" ? "parallel-" : ""}${attachment}-held.png`,
							),
						});
						if (attachment === "leaf") {
							const reflected = book.locator(
								'.flipbook-bookmark-surface[data-bookmark-surface="spread-2"][data-bookmark-face="1"]:visible',
							);
							await expect(reflected).toHaveCount(1);
							expect(
								await reflected.evaluate((element) => getComputedStyle(element).clipPath),
							).not.toBe("none");
							const tip = reflected.locator(".flipbook-bookmark__content:not([hidden])");
							await expect(tip).toContainText(/[A-Za-z\u0590-\u05FF]/);
							const heldTip = await boundsOf(tip);
							expect(Math.hypot(heldTip.x - beforeTip.x, heldTip.y - beforeTip.y)).toBeGreaterThan(
								5,
							);
							const material = await tipCenterInMaterial(tip);
							await testInfo.attach(`bookmark-${orientation}-reflected-tip-visibility`, {
								body: JSON.stringify(material, null, 2),
								contentType: "application/json",
							});
							expect(material.polygon.length).toBeGreaterThanOrEqual(3);
							expect(material.inside, JSON.stringify(material)).toBe(true);
						} else {
							const held = await boundsOf(tab);
							expect(Math.hypot(held.x - before.x, held.y - before.y)).toBeLessThan(1);
							await expect(
								book.locator('.flipbook-bookmark-surface[data-bookmark-surface="spread-2"]'),
							).toHaveCount(0);
						}
						const unrelated = await boundsOf(other);
						expect(unrelated.x).toBeCloseTo(stationary.x, 0);
						expect(unrelated.y).toBeCloseTo(stationary.y, 0);
					},
				);
				await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
			}
		}
	});
}

test("keyboard activation opens the bookmarked page", async ({ page, isMobile }) => {
	test.skip(isMobile, "Keyboard activation is covered on desktop.");
	const book = await openBookmarks(page, "ltr");
	const tab = bookmarkForPage(page, 6);
	await tab.focus();
	await expect(tab).toBeFocused();
	await expectExpanded(tab, true);
	await page.keyboard.press("Escape");
	await expectExpanded(tab, false);
	await page.keyboard.press("Enter");
	await expect(book.locator('.page[data-page-index="6"]')).toHaveClass(/current-page/);
});

test("touch activates bookmark actions without starting a competing page turn", async ({
	page,
	isMobile,
}) => {
	test.skip(!isMobile, "Touch activation is verified on the mobile browser.");
	const book = await openBookmarks(page, "ltr");
	await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("inspect");
	const spread = await currentPages(book);
	const tab = bookmarkForPage(page, 6);
	await activateBookmark(tab, true);
	await expect(page.locator(".bookmark-example-event")).toContainText("Chapter 4.");
	await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
	expect(await currentPages(book)).toEqual(spread);
	await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("default");
	await activateBookmark(bookmarkForPage(page, 10), true);
	await expect(book.locator('.page[data-page-index="10"]')).toHaveClass(/current-page/);
});

test("bookmark sliding respects reduced motion and resets correctly after resize", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	const book = await openBookmarks(page, "ltr");
	const tab = bookmarkForPage(page, 6);
	await tab.focus();
	await expectExpanded(tab, true);
	const bounds = await boundsOf(page.locator(".flipbook-bookmark-preview[data-open=true]"));
	const viewport = page.viewportSize();
	if (!viewport) throw new Error("Bookmark viewport dimensions are unavailable");
	expect(bounds.x).toBeGreaterThanOrEqual(0);
	expect(bounds.y).toBeGreaterThanOrEqual(0);
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
	expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
	const durations = await page
		.locator(".flipbook-bookmark-preview[data-open=true]")
		.evaluate((element) =>
			[element, ...element.querySelectorAll("button, span")].map(
				(element) => getComputedStyle(element).transitionDuration,
			),
		);
	expect(
		durations.every((duration) => duration.split(",").every((value) => parseFloat(value) === 0)),
	).toBe(true);
	const original = await tab.elementHandle();
	if (!original) throw new Error("The bookmark source disappeared before resizing");
	await page.setViewportSize({ width: viewport.width - 30, height: viewport.height - 70 });
	await expectExpanded(tab, false);
	const restored = book.locator('.flipbook-bookmark[data-spread-index="3"]');
	await expect(restored).toHaveCount(1);
	expect(await restored.evaluate((element, source) => element === source, original)).toBe(true);
	const visible = await exposedBounds(restored);
	expect(visible.x).toBeGreaterThanOrEqual(0);
	expect(visible.x + visible.width).toBeLessThanOrEqual(viewport.width - 29);
	expect(visible.y).toBeGreaterThanOrEqual(0);
	expect(visible.y + visible.height).toBeLessThanOrEqual(viewport.height - 69);
	await restored.blur();
	await restored.focus();
	await expectExpanded(tab, true);
	const repositioned = await boundsOf(tab);
	expect(repositioned.x).toBeGreaterThanOrEqual(0);
	expect(repositioned.y).toBeGreaterThanOrEqual(0);
	expect(repositioned.x + repositioned.width).toBeLessThanOrEqual(viewport.width - 29);
	expect(repositioned.y + repositioned.height).toBeLessThanOrEqual(viewport.height - 69);
	await original.dispose();
});
