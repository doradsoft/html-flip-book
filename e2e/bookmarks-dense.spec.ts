import {
	assertDenseStack,
	currentPages,
	exerciseDenseTabs,
	openDenseBookmarks,
	resizeDenseRail,
} from "./bookmark-helpers.mts";
import { expect, test } from "./fixtures/coverage-test";

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
				const before = await assertDenseStack(rail);
				await page.screenshot({ path: testInfo.outputPath("bookmarks-dense-stacked-idle.png") });
				const restingPages = await currentPages(book);
				await exerciseDenseTabs(page, book, before.capacity, isMobile, testInfo);
				expect(await currentPages(book)).toEqual(restingPages);
				const resized = await resizeDenseRail(page, book, rail, edge, before.capacity);
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
}
