import { expect, test } from "@playwright/test";
import {
	activateBookmark,
	bookmarkForPage,
	boundsOf,
	currentPages,
	expectExpanded,
	expectedSpreads,
	expectOrientation,
	expectSeparateTabs,
	exposedBounds,
	exposedHitPoint,
	fontFamilies,
	inspectBookmark,
	openBookmarks,
	PLACEMENTS,
	pullUpperCorner,
} from "./bookmark-helpers";

for (const direction of ["ltr", "rtl"] as const) {
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
}
