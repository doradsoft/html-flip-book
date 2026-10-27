import { expect, test } from "@playwright/test";
import {
	activateBookmark,
	bookmarkForPage,
	bookmarkSlot,
	boundsOf,
	checkExpansion,
	currentPages,
	dragBetween,
	expectExpanded,
	expectedSpreads,
	expectTabMeetsLeaf,
	expectTabWithinPage,
	exposedBounds,
	openBookmarks,
	pageStyles,
	pullUpperCorner,
	railLayout,
	tipCenterInMaterial,
} from "./bookmark-helpers";

for (const direction of ["ltr", "rtl"] as const) {
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
