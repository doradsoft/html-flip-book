import { TEST_PARAM_INITIAL_TURNED_LEAVES } from "../react/example/src/test-url-params";
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
	test(`${direction}: paper shading finishes with the turn while covers retain their fade`, async ({
		page,
	}) => {
		const params = new URLSearchParams({
			example: `${direction}-buffer`,
			[TEST_PARAM_INITIAL_TURNED_LEAVES]: "0,1,2",
		});
		await page.goto(`/?${params}`);
		const book = page.locator(bookClass(direction));
		const paper = book.locator('.page[data-page-index="6"]');
		const cover = book.locator('.page[data-page-index="0"]');
		await expect(paper).toBeVisible();
		for (const pseudo of ["::before", "::after"]) {
			expect(
				await paper.evaluate(
					(element, pseudo) => getComputedStyle(element, pseudo).transitionDuration,
					pseudo,
				),
			).toBe("0s");
			expect(
				await cover.evaluate(
					(element, pseudo) => getComputedStyle(element, pseudo).transitionDuration,
					pseudo,
				),
			).toBe("0.12s");
		}
		await page.locator(".flipbook-toolbar-next").click();
		await expect(book.locator('.page[data-page-index="8"]')).toHaveClass(/current-page/);
		await expect(book.locator(".page--flipping")).toHaveCount(0);
		expect(
			await paper.evaluate(
				(element) =>
					element
						.getAnimations({ subtree: true })
						.filter(
							(animation) =>
								animation instanceof CSSTransition &&
								animation.transitionProperty === "opacity" &&
								animation.playState === "running",
						).length,
			),
		).toBe(0);
	});

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
