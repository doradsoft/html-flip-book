import { expect, type Locator, type Page, test } from "@playwright/test";
import {
	TEST_PARAM_FAST_DELTA_THRESHOLD,
	TEST_PARAM_INITIAL_TURNED_LEAVES,
} from "../react/example/src/test-url-params";

type ReadingDirection = "ltr" | "rtl";
type TurnDirection = "forward" | "backward";

async function openBook(page: Page, direction: ReadingDirection, interior = true) {
	const params = new URLSearchParams({
		example: `${direction}-shadow`,
		[TEST_PARAM_FAST_DELTA_THRESHOLD]: "1000000",
	});
	if (interior) params.set(TEST_PARAM_INITIAL_TURNED_LEAVES, "0,1,2");
	await page.goto(`/?${params}`);
	const book = page.locator(`.${direction === "ltr" ? "en" : "he"}-book.flipbook`);
	await expect(book.locator(`.page[data-page-index="${interior ? 6 : 0}"]`)).toBeVisible();
	await expect(book).toBeVisible();
	await book.scrollIntoViewIfNeeded();
	return book;
}

async function holdDrag(
	page: Page,
	book: Locator,
	direction: ReadingDirection,
	turn: TurnDirection,
	corner: "top" | "bottom",
) {
	const sourceIndex = await book
		.locator(".current-page")
		.evaluateAll(
			(pages, side) =>
				pages
					.find((element) => Number((element as HTMLElement).dataset.pageIndex) % 2 === side)
					?.getAttribute("data-page-index"),
			turn === "forward" ? 0 : 1,
		);
	const box = await book.locator(`.page[data-page-index="${sourceIndex}"]`).boundingBox();
	if (!box) throw new Error("Page bounds unavailable");
	const fromRight = (direction === "ltr") === (turn === "forward");
	const movement = fromRight ? -1 : 1;
	const start = box.x + box.width * (fromRight ? 0.92 : 0.08);
	const y = box.y + box.height * (corner === "top" ? 0.1 : 0.9);
	await page.mouse.move(start, y);
	await page.mouse.down();
	await page.mouse.move(
		start + movement * box.width * 0.3,
		y + (corner === "top" ? 1 : -1) * box.height * 0.12,
		{ steps: 8 },
	);
}

async function liftedCorner(book: Locator, backIndex: number, direction: ReadingDirection) {
	return book.locator(`.page[data-page-index="${backIndex}"]`).evaluate((element, isLTR) => {
		const surface = element as HTMLElement;
		const book = surface.closest<HTMLElement>(".flipbook");
		if (!book) throw new Error("Book unavailable");
		const rect = book.getBoundingClientRect();
		const width = Number.parseFloat(surface.style.width);
		const height = Number.parseFloat(surface.style.height);
		const matrix = new DOMMatrix(getComputedStyle(surface).transform);
		const point = matrix.transformPoint(new DOMPoint(isLTR ? 0 : width, height));
		const left = isLTR
			? Number.parseFloat(surface.style.left)
			: book.clientWidth - Number.parseFloat(surface.style.right) - width;
		return {
			x: rect.left + left + point.x,
			y: rect.top + Number.parseFloat(surface.style.top) + point.y,
		};
	}, direction === "ltr");
}

async function expectFlat(book: Locator) {
	await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
	expect(
		await book.locator(".page").evaluateAll((pages) =>
			pages.every((page) => {
				const style = (page as HTMLElement).style;
				return style.clipPath === "" && style.getPropertyValue("--fold-shading") === "";
			}),
		),
	).toBe(true);
}

test.describe("Paper fold rendering", () => {
	for (const direction of ["ltr", "rtl"] as const) {
		for (const turn of ["forward", "backward"] as const) {
			test(`${direction} ${turn}: corner follows a full page-width pull and free vertical motion`, async ({
				page,
			}, testInfo) => {
				const book = await openBook(page, direction);
				const sourceIndex = turn === "forward" ? 6 : 5;
				const backIndex = turn === "forward" ? 7 : 5;
				const box = await book.locator(`.page[data-page-index="${sourceIndex}"]`).boundingBox();
				const bookBox = await book.boundingBox();
				if (!box || !bookBox) throw new Error("Page bounds unavailable");
				const fromRight = (direction === "ltr") === (turn === "forward");
				const movement = fromRight ? -1 : 1;
				const startX = box.x + box.width * (fromRight ? 0.92 : 0.08);
				const startY = box.y + box.height * 0.92;
				const heldX = startX + movement * box.width;
				const spineX = bookBox.x + bookBox.width / 2;
				const cornerY = box.y + box.height;
				await page.mouse.move(startX, startY);
				await page.mouse.down();
				await page.mouse.move(heldX, startY, { steps: 12 });
				await expect(book.locator(".page--folded")).toHaveCount(2);
				let corner = await liftedCorner(book, backIndex, direction);
				expect(Math.abs(corner.x - spineX)).toBeLessThan(1);
				expect(Math.abs(corner.y - cornerY)).toBeLessThan(1);

				await page.mouse.move(heldX, startY - box.height * 0.28, { steps: 8 });
				corner = await liftedCorner(book, backIndex, direction);
				expect(Math.abs(corner.x - spineX)).toBeLessThan(1);
				expect(Math.abs(corner.y - (cornerY - box.height * 0.28))).toBeLessThan(1);
				if (
					process.env.FOLD_SCREENSHOT_DIR &&
					testInfo.project.name === "chromium" &&
					direction === "ltr" &&
					turn === "backward"
				) {
					await page.screenshot({ path: `${process.env.FOLD_SCREENSHOT_DIR}/fold-free-drag.png` });
				}

				await page.mouse.move(heldX, startY + box.height * 0.1, { steps: 8 });
				corner = await liftedCorner(book, backIndex, direction);
				expect(Math.abs(corner.x - spineX)).toBeLessThan(1);
				expect(Math.abs(corner.y - (cornerY + box.height * 0.1))).toBeLessThan(1);
				await page.mouse.move(startX + movement * box.width * 0.8, startY, { steps: 5 });
				await page.mouse.up();
				await page.mouse.move(0, 0);
				await expectFlat(book);
				await expect(book.locator('.page[data-page-index="6"]')).toHaveClass(/current-page/);
			});
			for (const corner of ["top", "bottom"] as const) {
				test(`${direction} ${turn} ${corner}: preserves content and clears each settled fold`, async ({
					page,
				}, testInfo) => {
					const book = await openBook(page, direction);
					const firstIndex = turn === "forward" ? 6 : 4;
					const surfaces = book.locator(
						`.page[data-page-index="${firstIndex}"], .page[data-page-index="${firstIndex + 1}"]`,
					);
					const beforeCurrent = await book
						.locator(".current-page")
						.evaluateAll((pages) => pages.map((page) => (page as HTMLElement).dataset.pageIndex));
					const scrollIndex = turn === "forward" ? 0 : 1;
					await surfaces.nth(scrollIndex).evaluate((page) => {
						const content = page.firstElementChild as HTMLElement;
						const spacer = document.createElement("div");
						spacer.style.height = "2000px";
						spacer.setAttribute("aria-hidden", "true");
						content.append(spacer);
						content.scrollTop = 37;
					});
					const snapshot = await book.evaluateHandle(
						(element, { first, scrollIndex }) => {
							const pages = [first, first + 1].map((index) => {
								const surface = element.querySelector<HTMLElement>(
									`.page[data-page-index="${index}"]`,
								);
								if (!surface) throw new Error(`Missing page ${index}`);
								return surface;
							});
							return {
								book: element,
								pages,
								children: pages.map((page) => page.firstElementChild as HTMLElement),
								elements: Array.from(element.querySelectorAll("*")),
								leafElements: pages.flatMap((page) => Array.from(page.querySelectorAll("*"))),
								scrollIndex,
								scrollTop: (pages[scrollIndex].firstElementChild as HTMLElement).scrollTop,
							};
						},
						{ first: firstIndex, scrollIndex },
					);
					expect(await snapshot.evaluate((state) => state.scrollTop)).toBe(37);
					await holdDrag(page, book, direction, turn, corner);
					await expect(book.locator(".page--folded")).toHaveCount(2);
					for (const surface of await surfaces.all()) {
						await expect(surface).toHaveClass(/page--folded/);
						const geometry = await surface.evaluate((element) => {
							const matrix = new DOMMatrix(getComputedStyle(element).transform);
							const polygon = (element as HTMLElement).style.clipPath;
							return {
								finite: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].every(
									Number.isFinite,
								),
								polygon,
								coordinates: polygon.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [],
							};
						});
						expect(geometry.finite).toBe(true);
						expect(geometry.polygon).toMatch(/^polygon\(/);
						expect(geometry.coordinates.length).toBeGreaterThanOrEqual(6);
						expect(geometry.coordinates.every(Number.isFinite)).toBe(true);
					}
					const back = await surfaces.last().evaluate((element) => {
						const matrix = new DOMMatrix(getComputedStyle(element).transform);
						return { determinant: matrix.a * matrix.d - matrix.b * matrix.c, slope: matrix.b };
					});
					expect(back.determinant).toBeCloseTo(1, 5);
					expect(
						back.slope * (corner === "bottom" ? 1 : -1) * (direction === "ltr" ? 1 : -1),
					).toBeGreaterThan(0);
					const contentIntact = () =>
						snapshot.evaluate((state) => {
							const current = Array.from(state.book.querySelectorAll("*"));
							const currentLeaf = state.pages.flatMap((page) =>
								Array.from(page.querySelectorAll("*")),
							);
							return {
								originalElements:
									current.length === state.elements.length &&
									current.every((element, index) => element === state.elements[index]),
								originalContents: state.pages.every(
									(page, index) => page.firstElementChild === state.children[index],
								),
								originalLeafElements:
									currentLeaf.length === state.leafElements.length &&
									currentLeaf.every((element, index) => element === state.leafElements[index]),
								scrollTop: state.children[state.scrollIndex].scrollTop,
							};
						});
					const intact = {
						originalElements: true,
						originalContents: true,
						originalLeafElements: true,
						scrollTop: 37,
					};
					expect(await contentIntact()).toEqual(intact);
					if (
						process.env.FOLD_SCREENSHOT_DIR &&
						testInfo.project.name === "chromium" &&
						turn === "forward" &&
						((direction === "ltr" && corner === "bottom") ||
							(direction === "rtl" && corner === "top"))
					) {
						await page.screenshot({
							path: `${process.env.FOLD_SCREENSHOT_DIR}/fold-${direction}-${corner}.png`,
						});
					}
					await page.mouse.up();
					await page.mouse.move(0, 0);
					await expectFlat(book);
					expect(
						await book
							.locator(".current-page")
							.evaluateAll((pages) => pages.map((page) => (page as HTMLElement).dataset.pageIndex)),
					).toEqual(beforeCurrent);
					expect(await contentIntact()).toEqual(intact);
					const navigation = page.locator(
						`.flipbook-toolbar-${turn === "forward" ? "next" : "prev"}`,
					);
					// The demo sidebar overlaps the RTL toolbar on narrow viewports.
					if (testInfo.project.name === "mobile") await navigation.press("Enter");
					else await navigation.click();
					await expect(
						book.locator(`.page[data-page-index="${turn === "forward" ? 7 : 4}"]`),
					).toHaveClass(/current-page/);
					await expectFlat(book);
					expect(await contentIntact()).toMatchObject({
						originalContents: true,
						originalLeafElements: true,
						scrollTop: 37,
					});
					await snapshot.dispose();
				});
			}
		}
	}

	for (const direction of ["ltr", "rtl"] as const) {
		test(`${direction}: cover boards retain their rigid rotation`, async ({ page }) => {
			const book = await openBook(page, direction, false);
			await holdDrag(page, book, direction, "forward", "bottom");
			const cover = book.locator('.page[data-page-index="0"]');
			await expect(cover).toHaveAttribute("data-is-cover-page", "1");
			await expect(book.locator(".page--flipping")).toHaveCount(2);
			await expect(book.locator(".page--folded")).toHaveCount(0);
			const transform = await cover.evaluate((element) => (element as HTMLElement).style.transform);
			expect(transform).toMatch(/rotateY\(-?[\d.]+deg\)/);
			const rotation = Number(transform.match(/rotateY\((-?[\d.]+)deg\)/)?.[1]);
			expect(Math.abs(rotation)).toBeGreaterThan(0);
			expect(Math.abs(rotation)).toBeLessThan(90);
			await page.mouse.up();
			await page.mouse.move(0, 0);
			await expectFlat(book);
			await expect(cover).toHaveClass(/current-page/);
		});
	}
});
