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
	await expect(book.locator(".flipbook-bookmark")).toHaveCount((await expectedLeaves(book)).length);
	await expect(bookmarkForPage(page, 0)).toHaveCount(0);
	await expect(
		book.locator('.flipbook-bookmark[data-page-index="2"] .flipbook-bookmark__content'),
	).toContainText(direction === "ltr" ? /contents/i : /תוכן|שער/);
	const compact = await book
		.locator(".flipbook-bookmark[data-bookmark-id] > .flipbook-bookmark__content:not([hidden])")
		.allTextContents();
	expect(compact.every((text) => /[A-Za-z\u0590-\u05FF]/.test(text))).toBe(true);
	await expect(book).toHaveClass(new RegExp(direction === "ltr" ? "en-book" : "he-book"));
	await expect(book.locator('.page[data-page-index="0"] h1')).toHaveText(
		direction === "ltr" ? "SQL Tutorial" : "ספר בראשית",
	);
	await expect(book.locator('.page[data-page-index="2"]')).toContainText(
		direction === "ltr" ? "Table of Contents" : "תוכן העניינים",
	);
	return book;
}

async function expectedLeaves(book: Locator, minimumPage = 0) {
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
					.map((page) => Math.floor(page.index / 2)),
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
				const rect = tab.getBoundingClientRect();
				return {
					page: Number(tab.dataset.pageIndex),
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
		for (let index = 1; index < layout.tabs.length; index++) {
			expect(overlaps(layout.tabs[index - 1], layout.tabs[index])).toBe(false);
		}
		const pageOrder = layout.tabs.map((tab) => tab.page);
		expect(pageOrder).toEqual([...pageOrder].sort((first, second) => first - second));
		const axis = edge === "top" || edge === "bottom" ? "left" : "top";
		const positions = layout.tabs.map((tab) => tab[axis]);
		expect(positions).toEqual([...positions].sort((first, second) => first - second));
		for (const pageIndex of layout.tabs.map((tab) => tab.page)) {
			const tab = bookmarkForPage(book.page(), pageIndex);
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
	await tab.click();
	await expect(page.locator(".bookmark-example-event")).toHaveText(
		`From leaf ${Math.floor(Math.min(...spread) / 2) + 1}: ${label} (page ${target + 1}). Chapter ${Math.floor(target / 2) + 1}.`,
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

async function expectTabWithinPage(tab: Locator, surface: Locator) {
	const [bookmark, page] = await Promise.all([boundsOf(tab), boundsOf(surface)]);
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
		`.flipbook-bookmark[data-leaf-index="${Math.floor(pageIndex / 2)}"][data-bookmark-id]`,
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

async function checkExpansion(page: Page, book: Locator, edge: Edge, screenshotPath: string) {
	await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption(edge);
	const pageResting = await pageStyles(book);
	const tab = bookmarkForPage(page, 2);
	await tab.scrollIntoViewIfNeeded();
	await expectExpanded(tab, false);
	const original = await tab.elementHandle();
	if (!original) throw new Error("The original bookmark element is unavailable");
	const label = await tab.getAttribute("aria-label");
	const resting = await boundsOf(tab);
	await page.mouse.move(resting.x + resting.width / 2, resting.y + resting.height / 2);
	await expectExpanded(tab, true);
	const full = page.locator(".flipbook-bookmark-preview[data-open=true]");
	await expect(full.locator(".example-bookmark-full strong")).toHaveText(label ?? "");
	expect(
		await full.locator("button").evaluate((button, source) => button === source, original),
	).toBe(true);
	const expanded = await boundsOf(full);
	const outward = {
		left: resting.x - expanded.x,
		right: expanded.x + expanded.width - (resting.x + resting.width),
		top: resting.y - expanded.y,
		bottom: expanded.y + expanded.height - (resting.y + resting.height),
	};
	expect(expanded.x).toBeLessThanOrEqual(resting.x + 1);
	expect(expanded.y).toBeLessThanOrEqual(resting.y + 1);
	expect(expanded.x + expanded.width).toBeGreaterThanOrEqual(resting.x + resting.width - 1);
	expect(expanded.y + expanded.height).toBeGreaterThanOrEqual(resting.y + resting.height - 1);
	expect(outward[edge]).toBeGreaterThan(1);
	await page.screenshot({ path: screenshotPath });
	await full.locator("button").click();
	await expect(page.locator(".bookmark-example-event")).toContainText("Chapter 2.");
	await page.mouse.move(0, 0);
	await expectExpanded(tab, false);
	const restored = book.locator('.flipbook-bookmark[data-page-index="2"]');
	await expect(restored).toHaveCount(1);
	expect(await restored.evaluate((button, source) => button === source, original)).toBe(true);
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

for (const direction of ["ltr", "rtl"] as const) {
	test(`${direction}: each physical bookmark shows and activates the current page face`, async ({
		page,
		isMobile,
	}, testInfo) => {
		const book = await openBookmarks(page, direction, 1000000);
		const count = (await expectedLeaves(book)).length;
		const tab = bookmarkForPage(page, 12);
		const front = await book.locator('.page[data-page-index="12"]').getAttribute("data-page-title");
		const back = await book.locator('.page[data-page-index="13"]').getAttribute("data-page-title");
		await expect(tab).toHaveAttribute("data-page-index", "12");
		await expect(tab).toHaveAttribute("data-face", "0");
		await expect(tab).toHaveAttribute("aria-label", front ?? "");
		const brief = await tab.locator(".flipbook-bookmark__content").textContent();
		await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("inspect");
		await inspectBookmark(page, book, tab);
		await page
			.getByRole("combobox", { name: "Click action", exact: true })
			.selectOption("navigate");
		await tab.click();
		const surface = book.locator('.page[data-page-index="12"]');
		await expect(surface).toHaveClass(/current-page/);
		await pullUpperCorner(page, surface, direction, isMobile, 1.3, async () => {
			await page.screenshot({ path: testInfo.outputPath("bookmarks-dual-face-held.png") });
		});
		await expect(book.locator('.page[data-page-index="13"]')).toHaveClass(/current-page/);
		await expect(tab).toHaveAttribute("data-page-index", "13");
		await expect(tab).toHaveAttribute("data-face", "1");
		await expect(tab).toHaveAttribute("aria-label", back ?? "");
		await expect(tab.locator(".flipbook-bookmark__content")).not.toHaveText(brief ?? "");
		await page
			.locator(".bookmark-example-stage")
			.screenshot({ path: testInfo.outputPath("bookmarks-dual-face-back.png") });
		await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("inspect");
		await inspectBookmark(page, book, tab);
		await page
			.getByRole("combobox", { name: "Click action", exact: true })
			.selectOption("navigate");
		await tab.click();
		await expect(book.locator('.page[data-page-index="13"]')).toHaveClass(/current-page/);
		await pullUpperCorner(
			page,
			book.locator('.page[data-page-index="13"]'),
			direction === "ltr" ? "rtl" : "ltr",
			isMobile,
			1.3,
		);
		await expect(book.locator('.page[data-page-index="12"]')).toHaveClass(/current-page/);
		await expect(tab).toHaveAttribute("data-page-index", "12");
		await expect(tab).toHaveAttribute("aria-label", front ?? "");
		await expect(book.locator(".flipbook-bookmark")).toHaveCount(count);
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
			const count = (await expectedLeaves(book)).length;
			await expect(book.locator(".flipbook-bookmark")).toHaveCount(count);
			await page.getByRole("button", { name: "Hide bookmarks", exact: true }).click();
			await expect(book.locator(".flipbook-bookmark")).toHaveCount(0);
			expect(await currentPages(book)).toEqual(spread);
			await show.click();
			await expect(book.locator(".flipbook-bookmark")).toHaveCount(count);
			expect(await currentPages(book)).toEqual(spread);
		}
	});

	test(`${direction}: covers keep the inner part of bookmarks underneath the book`, async ({
		page,
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
			owner: getComputedStyle(element.querySelector('.page[data-page-index="2"]') as Element)
				.zIndex,
			tab: getComputedStyle(
				element.querySelector('.flipbook-bookmark[data-leaf-index="1"]') as Element,
			).zIndex,
		}));
		await testInfo.attach("bookmark-cover-stacking", {
			body: JSON.stringify({ inner, outer, hit, stack }, null, 2),
			contentType: "application/json",
		});
		expect(hit.innerTab, JSON.stringify({ hit, stack })).toBe(false);
		expect(hit.innerPage).toBe("0");
		expect(hit.outerLeaf).toBe("1");
		await page
			.locator(".bookmark-example-stage")
			.screenshot({ path: testInfo.outputPath("bookmarks-cover-layer.png") });
	});

	test(`${direction}: the first native pointer activation opens a bookmarked page`, async ({
		page,
		isMobile,
	}) => {
		const book = await openBookmarks(page, direction);
		const tab = bookmarkForPage(page, 8);
		await tab.scrollIntoViewIfNeeded();
		const bounds = await boundsOf(tab);
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
		const expected = await expectedLeaves(book);
		await expect(tabs).toHaveCount(expected.length);
		for (const tab of await tabs.all()) {
			const index = Number(await tab.getAttribute("data-page-index"));
			const title = await book
				.locator(`.page[data-page-index="${index}"]`)
				.getAttribute("data-page-title");
			if (title) await expect(tab).toHaveAttribute("aria-label", title);
		}
		const compact = await tabs.locator(".flipbook-bookmark__content").allTextContents();
		expect(compact.every((text) => /[A-Za-z\u0590-\u05FF]/.test(text))).toBe(true);
		const leaves = await tabs.evaluateAll((elements) =>
			elements.map((element) => Number((element as HTMLElement).dataset.leafIndex)),
		);
		expect([...leaves].sort((a, b) => a - b)).toEqual(expected);
		await page.locator(".bookmark-example-stage").screenshot({
			path: testInfo.outputPath("bookmarks-built-in.png"),
		});
		await bookmarkForPage(page, 4).click();
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
		await bookmarkForPage(page, 4).click();
		await expect(book.locator('.page[data-page-index="4"]')).toHaveClass(/current-page/);
		await page.getByRole("combobox", { name: "Attachment", exact: true }).selectOption("pinned");
		const spread = await currentPages(book);
		const turnedEdge = direction === "ltr" ? "left" : "right";
		await expect(
			book.locator(
				`.flipbook-bookmarks__rail[data-edge="${turnedEdge}"] .flipbook-bookmark[data-leaf-index="1"]`,
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
			await expectSeparateTabs(book, placement.edges);
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
		const expected = await expectedLeaves(book);
		await page.getByRole("combobox", { name: "Attachment", exact: true }).selectOption("pinned");
		const tab = bookmarkForPage(page, 8);
		await tab.click();
		await expect(book.locator('.page[data-page-index="8"]')).toHaveClass(/current-page/);
		const spread = await currentPages(book);
		await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption("top");
		await page.getByRole("combobox", { name: "Order", exact: true }).selectOption("reverse-page");
		const rail = book.locator('.flipbook-bookmarks__rail[data-edge="top"]');
		const reverse = (await railLayout(rail)).tabs.map((item) => Math.floor(item.page / 2));
		expect(reverse).toEqual([...expected].reverse());
		await page.getByRole("combobox", { name: "Order", exact: true }).selectOption("title");
		const titleOrder = (await railLayout(rail)).tabs.map((item) => Math.floor(item.page / 2));
		expect([...titleOrder].sort((a, b) => a - b)).toEqual(expected);
		expect(titleOrder).not.toEqual(reverse);
		await page.getByLabel("Upcoming chapters only", { exact: true }).check();
		await expect(book.locator(".flipbook-bookmark")).toHaveCount(
			(await expectedLeaves(book, Math.min(...spread))).length,
		);
		await page.getByLabel("Upcoming chapters only", { exact: true }).uncheck();
		await expect(book.locator(".flipbook-bookmark")).toHaveCount(expected.length);
		expect(await currentPages(book)).toEqual(spread);

		await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("inspect");
		const otherTab = bookmarkForPage(page, 2);
		const label = await otherTab.getAttribute("aria-label");
		const target = Number(await otherTab.getAttribute("data-page-index"));
		await otherTab.click();
		await expect(page.locator(".bookmark-example-event")).toHaveText(
			`From leaf ${Math.floor(Math.min(...spread) / 2) + 1}: ${label} (page ${target + 1}). Chapter 2.`,
		);
		expect(await currentPages(book)).toEqual(spread);
		await page
			.getByRole("combobox", { name: "Click action", exact: true })
			.selectOption("navigate");
		await otherTab.click();
		await expect(book.locator(`.page[data-page-index="${target}"]`)).toHaveClass(/current-page/);
	});

	test(`${direction}: hover reveals full bookmark content outward from every edge`, async ({
		page,
		isMobile,
	}, testInfo) => {
		test.skip(isMobile, "Touch activation is covered without mouse hover.");
		await page.setViewportSize({ width: 1600, height: 1000 });
		const book = await openBookmarks(page, direction);
		await page.getByRole("combobox", { name: "Attachment", exact: true }).selectOption("pinned");
		// Leave room at every edge to distinguish outward expansion from the viewport fallback.
		await page.addStyleTag({
			content: `
				.bookmark-example-stage { width: 760px; height: 520px; flex: 0 0 auto; }
				.bookmark-example-stage > .en-book-wrap,
				.bookmark-example-stage > .he-book-wrap { height: 520px; flex: none; }
			`,
		});
		await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("inspect");
		for (const edge of ["left", "right", "top", "bottom"] as const) {
			await checkExpansion(page, book, edge, testInfo.outputPath(`bookmarks-${edge}-expanded.png`));
		}
	});

	test(`${direction}: tabs isolate hover and dragging, then remain clickable after a page swipe`, async ({
		page,
		isMobile,
	}) => {
		const book = await openBookmarks(page, direction);
		const tab = bookmarkForPage(page, 6);
		await tab.scrollIntoViewIfNeeded();
		const tabBox = await tab.boundingBox();
		const bookBox = await book.boundingBox();
		if (!tabBox || !bookBox) throw new Error("Bookmark and book must have visible bounds");
		const start = { x: tabBox.x + tabBox.width / 2, y: tabBox.y + tabBox.height / 2 };
		const resting = await pageStyles(book);
		const spread = await currentPages(book);
		await page.mouse.move(start.x, start.y);
		// The mousemove handler is throttled; allow a queued preview to appear before checking.
		await page.waitForTimeout(40);
		expect(await pageStyles(book)).toEqual(resting);
		await dragBetween(
			page,
			isMobile,
			start,
			{ x: bookBox.x + bookBox.width / 2, y: start.y },
			async () => {
				await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
			},
		);
		await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
		expect(await currentPages(book)).toEqual(spread);

		const surface = book.locator('.page[data-page-index="2"]');
		await surface.scrollIntoViewIfNeeded();
		const box = await surface.boundingBox();
		if (!box) throw new Error("Forward page must have visible bounds");
		const y = box.y + box.height * 0.65;
		const sign = direction === "ltr" ? -1 : 1;
		const x = box.x + box.width * (direction === "ltr" ? 0.8 : 0.2);
		await dragBetween(page, isMobile, { x, y }, { x: x + sign * box.width * 1.3, y });
		await expect(book.locator('.page[data-page-index="4"]')).toHaveClass(/current-page/);
		await bookmarkForPage(page, 8).click();
		await expect(book.locator('.page[data-page-index="8"]')).toHaveClass(/current-page/);
	});

	test(`${direction}: top and bottom bookmarks stay on the half containing their target leaf`, async ({
		page,
		isMobile,
	}) => {
		const book = await openBookmarks(page, direction, 1000000);
		await bookmarkForPage(page, 4).click();
		await expect(book.locator('.page[data-page-index="4"]')).toHaveClass(/current-page/);
		for (const placement of ["top", "bottom", "top-bottom"] as const) {
			await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption(placement);
			const tab = bookmarkForPage(page, 4);
			const forward = book.locator('.page[data-page-index="4"]');
			const backward = book.locator('.page[data-page-index="3"]');
			await expectTabWithinPage(tab, forward);
			await expectTabWithinPage(bookmarkForPage(page, 2), backward);
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
		const count = (await expectedLeaves(book)).length;
		await bookmarkForPage(page, 4).click();
		await expect(book.locator('.page[data-page-index="4"]')).toHaveClass(/current-page/);
		const forwardEdge = direction === "ltr" ? "right" : "left";
		await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption(forwardEdge);
		const tab = bookmarkForPage(page, 4);
		const surface = book.locator('.page[data-page-index="4"]');
		await expect(tab).toBeVisible();
		await expect(bookmarkForPage(page, 2)).toBeHidden();
		await expect(book.locator(".flipbook-bookmark")).toHaveCount(count);
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
		expectTabMeetsLeaf(await boundsOf(tab), await boundsOf(surface), direction);
		await pullUpperCorner(page, surface, direction, isMobile, 1.3);
		await expect(book.locator('.page[data-page-index="6"]')).toHaveClass(/current-page/);
		await expect(tab).toBeHidden();
		await expect(bookmarkForPage(page, 6)).toBeVisible();

		await page.getByRole("combobox", { name: "Attachment", exact: true }).selectOption("pinned");
		await expect(book.locator(".flipbook-bookmark")).toHaveCount(count);
		await expect(tab).toBeVisible();
	});

	test(`${direction}: top and bottom bookmark assignments survive completed turns`, async ({
		page,
		isMobile,
	}) => {
		const book = await openBookmarks(page, direction, 1000000);
		const leaves = await expectedLeaves(book);
		await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption("top-bottom");
		for (const [pageIndex, edge] of [
			[leaves[0] * 2, "top"],
			[leaves[leaves.length - 1] * 2, "bottom"],
		] as const) {
			const tab = bookmarkForPage(page, pageIndex);
			await tab.click();
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
		for (const attachment of ["leaf", "pinned"] as const) {
			const book = await openBookmarks(page, direction);
			await page
				.getByRole("combobox", { name: "Attachment", exact: true })
				.selectOption(attachment);
			const tab = bookmarkForPage(page, 2);
			const other = bookmarkForPage(page, 8);
			const surface = book.locator('.page[data-page-index="2"]');
			await surface.scrollIntoViewIfNeeded();
			const bounds = await boundsOf(surface);
			const before = await boundsOf(tab);
			if (attachment === "leaf") expectTabMeetsLeaf(before, bounds, direction);
			const stationary = await boundsOf(other);
			const sign = direction === "ltr" ? -1 : 1;
			const x = bounds.x + bounds.width * (direction === "ltr" ? 0.8 : 0.2);
			const y = bounds.y + bounds.height * 0.15;
			await dragBetween(
				page,
				isMobile,
				{ x, y },
				{ x: x + sign * bounds.width * 0.6, y: y + bounds.height * 0.15 },
				async () => {
					await expect(book.locator(".page--folded, .page--flipping")).not.toHaveCount(0);
					const held = await boundsOf(tab);
					const distance = Math.hypot(held.x - before.x, held.y - before.y);
					if (attachment === "leaf") expect(distance).toBeGreaterThan(5);
					else expect(distance).toBeLessThan(1);
					const unrelated = await boundsOf(other);
					expect(unrelated.x).toBeCloseTo(stationary.x, 0);
					expect(unrelated.y).toBeCloseTo(stationary.y, 0);
					await page.screenshot({ path: testInfo.outputPath(`bookmarks-${attachment}-held.png`) });
				},
			);
			await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
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
	await tab.tap();
	await expect(page.locator(".bookmark-example-event")).toContainText("Chapter 4.");
	await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
	expect(await currentPages(book)).toEqual(spread);
	await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("default");
	await bookmarkForPage(page, 10).tap();
	await expect(book.locator('.page[data-page-index="10"]')).toHaveClass(/current-page/);
});

test("bookmark expansion respects reduced motion and stays inside the viewport", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await openBookmarks(page, "ltr");
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
});
