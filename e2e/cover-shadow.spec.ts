import { expect, type Locator, test } from "./fixtures/coverage-test";

const bookClass = (direction: string) => `.${direction === "ltr" ? "en" : "he"}-book.flipbook`;

async function overlayOpacity(page: Locator, pseudo: "::before" | "::after") {
	return page.evaluate(
		(element, sel) => Number.parseFloat(getComputedStyle(element, sel).opacity),
		pseudo,
	);
}

async function hoverEdge(target: Locator, side: "left" | "right") {
	const bounds = await target.boundingBox();
	if (!bounds) throw new Error("Visible page bounds unavailable");
	const edgeX = bounds.x + bounds.width * (side === "right" ? 0.98 : 0.02);
	await target.page().mouse.move(edgeX, bounds.y + bounds.height * 0.15);
}

for (const direction of ["ltr", "rtl"] as const) {
	test(`${direction}: coverConfig.noShadow hides cover overlays while interior shadow stays`, async ({
		page,
	}) => {
		await page.goto(`/?example=${direction}-comprehensive&test-coverNoShadow`);
		const book = page.locator(bookClass(direction));
		const cover = book.locator('.page[data-page-index="0"]');
		const interior = book.locator('.page[data-page-index="1"]');
		await expect(cover).toBeVisible();
		await expect(cover).toHaveClass(/page--no-shadow/);
		await expect(interior).not.toHaveClass(/page--no-shadow/);

		await hoverEdge(cover, direction === "ltr" ? "right" : "left");

		// The lifted leaf writes shadow vars on BOTH its pages; the tagged cover
		// must keep its overlays hidden while the interior side still shades.
		await expect
			.poll(() => overlayOpacity(interior, "::before"), {
				message: "interior shadow should engage on hover",
			})
			.toBeGreaterThan(0);

		expect(await overlayOpacity(cover, "::before")).toBe(0);
		expect(await overlayOpacity(cover, "::after")).toBe(0);
	});

	test(`${direction}: without noShadow the cover shades like any other page`, async ({ page }) => {
		await page.goto(`/?example=${direction}-comprehensive`);
		const book = page.locator(bookClass(direction));
		const cover = book.locator('.page[data-page-index="0"]');
		await expect(cover).toBeVisible();
		await expect(cover).not.toHaveClass(/page--no-shadow/);

		await hoverEdge(cover, direction === "ltr" ? "right" : "left");
		await expect
			.poll(() => overlayOpacity(cover, "::before"), {
				message: "cover shadow should engage on hover",
			})
			.toBeGreaterThan(0);
	});
}
