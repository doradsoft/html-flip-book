import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 700 } });

for (const direction of ["ltr", "rtl"] as const) {
	for (const turnedLeaves of [[0], [0, 1, 2]]) {
		test(`${direction} spread after ${turnedLeaves.length} leaves: previews only at physical page edges`, async ({
			page,
		}) => {
			await page.goto(
				`/?example=${direction}-buffer&test-initialTurnedLeaves=${turnedLeaves.join(",")}`,
			);
			const book = page.locator(`.${direction === "ltr" ? "en" : "he"}-book.flipbook`);
			const frontIndex = turnedLeaves.length * 2;
			await expect(book.locator(`.page[data-page-index="${frontIndex}"]`)).toBeVisible();
			const bookBounds = await book.boundingBox();
			if (!bookBounds) throw new Error("Book bounds unavailable");
			const surfaces = book.locator(".page");
			const snapshot = () =>
				surfaces.evaluateAll((pages) =>
					pages.map((page) => {
						const style = (page as HTMLElement).style;
						return [
							style.transform,
							style.clipPath,
							style.getPropertyValue("--fold-shading"),
							style.getPropertyValue("--inner-shadow-shadow"),
							style.getPropertyValue("--inner-shadow-highlight"),
						];
					}),
				);
			const resting = await snapshot();
			const move = async (x: number, y: number) => {
				await page.mouse.move(x, y);
				// Let the throttled mousemove run before asserting that nothing changed.
				await page.waitForTimeout(40);
			};

			for (const side of ["left", "right"] as const) {
				const isRight = side === "right";
				const isForward = (direction === "ltr") === isRight;
				const surface = book.locator(
					`.page[data-page-index="${isForward ? frontIndex : frontIndex - 1}"]`,
				);
				const bounds = await surface.boundingBox();
				if (!bounds) throw new Error("Page bounds unavailable");
				const edgeX = bounds.x + (isRight ? bounds.width : 0);
				const insideX = edgeX + (isRight ? -3 : 3);
				for (const y of [0.1, 0.5, 0.9]) {
					await move(
						bookBounds.x + (isRight ? bookBounds.width - 5 : 5),
						bounds.y + bounds.height * y,
					);
					await expect.poll(snapshot).toEqual(resting);
				}
				for (const [x, y] of [
					[edgeX + (isRight ? 5 : -5), bounds.y + bounds.height / 2],
					[insideX, bounds.y - 5],
					[insideX, bounds.y + bounds.height + 5],
				]) {
					await move(x, y);
					await expect.poll(snapshot).toEqual(resting);
				}
				for (let i = 0; i < 3; i++) {
					await move(insideX, bounds.y + bounds.height * 0.1 + i);
					await expect.poll(snapshot).not.toEqual(resting);
				}
				await move(edgeX + (isRight ? 5 : -5), bounds.y + bounds.height * 0.1);
				await expect.poll(snapshot).toEqual(resting);
				await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
			}
		});
	}
}
