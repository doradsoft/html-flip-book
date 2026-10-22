import { expect, type Locator, type Page, test } from "@playwright/test";

type Direction = "ltr" | "rtl";
type Edge = "top" | "right" | "bottom" | "left";
type Rect = { left: number; right: number; top: number; bottom: number };
type Point = { x: number; y: number };

async function openBookmarks(page: Page, direction: Direction) {
	await page.goto(`/?example=${direction}-bookmarks`);
	const book = page.locator(".flipbook");
	await expect(book.locator(".flipbook-bookmark")).toHaveCount(6);
	return book;
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
		for (const tab of await rail.locator(".flipbook-bookmark").all()) {
			await tab.scrollIntoViewIfNeeded();
			const pageIndex = Number(await tab.getAttribute("data-page-index"));
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

async function currentPages(book: Locator) {
	return book
		.locator(".page.current-page")
		.evaluateAll((elements) =>
			elements.map((element) => Number((element as HTMLElement).dataset.pageIndex)),
		);
}

async function pageStyles(book: Locator) {
	return book.locator(".page").evaluateAll((elements) =>
		elements.map((element) => {
			const style = (element as HTMLElement).style;
			return [style.transform, style.clipPath];
		}),
	);
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

const PLACEMENTS: { value: string; edges: Edge[] }[] = [
	{ value: "top", edges: ["top"] },
	{ value: "bottom", edges: ["bottom"] },
	{ value: "sides", edges: ["left", "right"] },
	{ value: "left", edges: ["left"] },
	{ value: "right", edges: ["right"] },
	{ value: "top-bottom", edges: ["top", "bottom"] },
];

for (const direction of ["ltr", "rtl"] as const) {
	test(`${direction}: all bookmark placements keep separate, reachable tabs`, async ({
		page,
	}, testInfo) => {
		const book = await openBookmarks(page, direction);
		await page.locator(".bookmark-example-stage").screenshot({
			path: testInfo.outputPath("bookmarks-default.png"),
		});
		const spread = await currentPages(book);
		const turnedEdge = direction === "ltr" ? "left" : "right";
		await expect(
			book.locator(
				`.flipbook-bookmarks__rail[data-edge="${turnedEdge}"] .flipbook-bookmark[data-page-index="0"]`,
			),
		).toHaveCount(1);
		for (const placement of PLACEMENTS) {
			await page
				.getByRole("combobox", { name: "Placement", exact: true })
				.selectOption(placement.value);
			await expectSeparateTabs(book, placement.edges);
			expect(await currentPages(book)).toEqual(spread);
		}
	});

	test(`${direction}: bookmark jumps, custom actions, ordering, and provider updates`, async ({
		page,
	}) => {
		const book = await openBookmarks(page, direction);
		const tab = book.locator('.flipbook-bookmark[data-page-index="8"]');
		await tab.click();
		await expect(book.locator('.page[data-page-index="8"]')).toHaveClass(/current-page/);
		const spread = await currentPages(book);
		await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption("top");
		await page.getByRole("combobox", { name: "Order", exact: true }).selectOption("reverse-page");
		const rail = book.locator('.flipbook-bookmarks__rail[data-edge="top"]');
		expect((await railLayout(rail)).tabs.map((item) => item.page)).toEqual([10, 8, 6, 4, 2, 0]);
		await page.getByRole("combobox", { name: "Order", exact: true }).selectOption("title");
		const labels = await rail
			.locator(".flipbook-bookmark")
			.evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-label")));
		expect(labels).toEqual(
			[...labels].sort((first, second) =>
				String(first).localeCompare(String(second), direction === "ltr" ? "en" : "he"),
			),
		);
		await page.getByLabel("Upcoming chapters only", { exact: true }).check();
		await expect(book.locator(".flipbook-bookmark")).toHaveCount(2);
		await page.getByLabel("Upcoming chapters only", { exact: true }).uncheck();
		await expect(book.locator(".flipbook-bookmark")).toHaveCount(6);
		expect(await currentPages(book)).toEqual(spread);

		await page.getByRole("combobox", { name: "Click action", exact: true }).selectOption("inspect");
		const otherTab = book.locator('.flipbook-bookmark[data-page-index="2"]');
		const label = await otherTab.getAttribute("aria-label");
		await otherTab.click();
		await expect(page.locator(".bookmark-example-event")).toHaveText(
			`From leaf ${Math.floor(Math.min(...spread) / 2) + 1}: ${label} (page 3). Chapter 2.`,
		);
		expect(await currentPages(book)).toEqual(spread);
		await page
			.getByRole("combobox", { name: "Click action", exact: true })
			.selectOption("navigate");
		await otherTab.click();
		await expect(book.locator('.page[data-page-index="2"]')).toHaveClass(/current-page/);
	});

	test(`${direction}: tabs isolate hover and dragging, then remain clickable after a page swipe`, async ({
		page,
		isMobile,
	}) => {
		const book = await openBookmarks(page, direction);
		const tab = book.locator('.flipbook-bookmark[data-page-index="6"]');
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
		await book.locator('.flipbook-bookmark[data-page-index="8"]').click();
		await expect(book.locator('.page[data-page-index="8"]')).toHaveClass(/current-page/);
	});
}

test("keyboard activation opens the bookmarked page", async ({ page, isMobile }) => {
	test.skip(isMobile, "Keyboard activation is covered on desktop.");
	const book = await openBookmarks(page, "ltr");
	const tab = book.locator('.flipbook-bookmark[data-page-index="6"]');
	await tab.focus();
	await expect(tab).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(book.locator('.page[data-page-index="6"]')).toHaveClass(/current-page/);
});

test("touch scrolls a dense horizontal bookmark rail without turning pages", async ({
	page,
	isMobile,
}) => {
	test.skip(!isMobile, "Native touch scrolling is verified on the mobile browser.");
	const book = await openBookmarks(page, "ltr");
	await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption("top");
	const rail = book.locator('.flipbook-bookmarks__rail[data-edge="top"]');
	await rail.scrollIntoViewIfNeeded();
	const overflow = await rail.evaluate((element) => element.scrollWidth - element.clientWidth);
	expect(overflow).toBeGreaterThan(20);
	const initialScroll = await rail.evaluate((element) => element.scrollLeft);
	const spread = await currentPages(book);
	const bounds = await rail.boundingBox();
	if (!bounds) throw new Error("Top bookmark rail must have visible bounds");
	const y = bounds.y + bounds.height / 2;
	await dragBetween(
		page,
		true,
		{ x: bounds.x + bounds.width - 20, y },
		{ x: bounds.x + 20, y },
		async () => {
			await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
		},
	);
	await expect
		.poll(() => rail.evaluate((element) => element.scrollLeft))
		.toBeGreaterThan(initialScroll + 20);
	await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
	expect(await currentPages(book)).toEqual(spread);
	await rail.locator('.flipbook-bookmark[data-page-index="10"]').click();
	await expect(book.locator('.page[data-page-index="10"]')).toHaveClass(/current-page/);
});
