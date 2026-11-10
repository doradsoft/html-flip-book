import { expect, test } from "./fixtures/coverage-test";

const BOOK = ".cal-book.flipbook";
const PAGE = `${BOOK} .page`;

test.describe("Vertical spiral calendar", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/?example=vertical-calendar");
	});

	test("renders an upright top-bound book with spiral coil and dual-calendar dates", async ({
		page,
	}) => {
		// Land inside the month sequence so calendar sheets are mounted.
		await page.goto("/?example=vertical-calendar&test-initialTurnedLeaves=0,1,2,3");
		const book = page.locator(BOOK);
		await expect(book).toBeVisible();
		await expect(book).toHaveClass(/flipbook--vertical/);

		// The engine draws the coil via ::before at the binding seam.
		const coil = await book.evaluate((el) => {
			const cs = getComputedStyle(el, "::before");
			return { content: cs.content, height: cs.height, zIndex: cs.zIndex };
		});
		expect(coil.content).not.toBe("none");
		expect(Number.parseFloat(coil.height)).toBeGreaterThan(0);

		// Calendar content: Hebrew month name + Gregorian range with 2-digit year.
		const monthPage = page
			.locator(".cal-page", { has: page.locator(".cal-page__month-he") })
			.first();
		await expect(monthPage.locator(".cal-page__month-he")).not.toBeEmpty();
		const gregRange = await monthPage.locator(".cal-page__greg-range").textContent();
		expect(gregRange).toMatch(/\d{2}/);

		// A day cell carries a Hebrew numeral and a Gregorian day-of-month.
		const dayCell = monthPage.locator(".cal-cell", { has: page.locator(".cal-cell__he") }).nth(8);
		await expect(dayCell.locator(".cal-cell__he")).not.toBeEmpty();
		await expect(dayCell.locator(".cal-cell__ge")).not.toBeEmpty();
	});

	test("dragging the lower edge upward turns the sheet to the next page", async ({ page }) => {
		const book = page.locator(BOOK);
		const box = await book.boundingBox();
		if (!box) throw new Error("book not found");
		const startX = box.x + box.width / 2;
		const startY = box.y + box.height * 0.92; // inside the bottom-edge turn zone
		await page.mouse.move(startX, startY);
		await page.mouse.down();
		await page.mouse.move(startX, box.y + box.height * 0.2, { steps: 15 });
		await page.mouse.up();
		await page.waitForTimeout(900);
		// The current-page marker moved off the cover.
		const currentIndex = await page
			.locator(`${PAGE}.current-page`)
			.first()
			.getAttribute("data-page-index");
		expect(Number(currentIndex)).toBeGreaterThan(0);
	});

	test("dragging back down reverses the turn", async ({ page }) => {
		const book = page.locator(BOOK);
		const box = await book.boundingBox();
		if (!box) throw new Error("book not found");
		const x = box.x + box.width / 2;
		// Flip forward first.
		await page.mouse.move(x, box.y + box.height * 0.92);
		await page.mouse.down();
		await page.mouse.move(x, box.y + box.height * 0.2, { steps: 15 });
		await page.mouse.up();
		await page.waitForTimeout(900);
		const afterForward = await page
			.locator(`${PAGE}.current-page`)
			.first()
			.getAttribute("data-page-index");
		// Drag the turned sheet back down.
		await page.mouse.move(x, box.y + box.height * 0.2);
		await page.mouse.down();
		await page.mouse.move(x, box.y + box.height * 0.92, { steps: 15 });
		await page.mouse.up();
		await page.waitForTimeout(900);
		const afterBack = await page
			.locator(`${PAGE}.current-page`)
			.first()
			.getAttribute("data-page-index");
		expect(Number(afterBack)).toBeLessThan(Number(afterForward));
	});

	test("gestures starting outside the turn edge do not flip", async ({ page }) => {
		const book = page.locator(BOOK);
		const box = await book.boundingBox();
		if (!box) throw new Error("book not found");
		const x = box.x + box.width / 2;
		const before = await page
			.locator(`${PAGE}.current-page`)
			.first()
			.getAttribute("data-page-index");
		// Grab the middle of the sheet (outside the bottom 22% affordance).
		await page.mouse.move(x, box.y + box.height * 0.45);
		await page.mouse.down();
		await page.mouse.move(x, box.y + box.height * 0.1, { steps: 15 });
		await page.mouse.up();
		await page.waitForTimeout(700);
		const after = await page
			.locator(`${PAGE}.current-page`)
			.first()
			.getAttribute("data-page-index");
		expect(after).toBe(before);
	});

	test("toolbar next/previous buttons turn pages both ways", async ({ page }) => {
		const before = await page
			.locator(`${PAGE}.current-page`)
			.first()
			.getAttribute("data-page-index");
		await page.locator(".flipbook-toolbar-next").click();
		await page.waitForTimeout(900);
		const fwd = await page.locator(`${PAGE}.current-page`).first().getAttribute("data-page-index");
		expect(Number(fwd)).toBeGreaterThan(Number(before));
		await page.locator(".flipbook-toolbar-prev").click();
		await page.waitForTimeout(900);
		const back = await page.locator(`${PAGE}.current-page`).first().getAttribute("data-page-index");
		expect(Number(back)).toBeLessThan(Number(fwd));
	});

	test("keyboard arrows turn pages as a labelled alternative", async ({ page }) => {
		const book = page.locator(BOOK);
		await book.click({ position: { x: 10, y: 10 } });
		const before = await page
			.locator(`${PAGE}.current-page`)
			.first()
			.getAttribute("data-page-index");
		// RTL books mirror arrow keys: ArrowLeft advances, ArrowRight goes back.
		await page.keyboard.press("ArrowLeft");
		await page.waitForTimeout(900);
		const fwd = await page.locator(`${PAGE}.current-page`).first().getAttribute("data-page-index");
		expect(Number(fwd)).toBeGreaterThan(Number(before));
		await page.keyboard.press("ArrowRight");
		await page.waitForTimeout(900);
		const back = await page.locator(`${PAGE}.current-page`).first().getAttribute("data-page-index");
		expect(Number(back)).toBe(Number(before));
	});

	test("clickable date links do not turn the page", async ({ page }) => {
		// Jump to a month page that contains holiday/today links.
		await page.goto("/?example=vertical-calendar&test-initialTurnedLeaves=0,1,2,3,4");
		const link = page.locator(`${PAGE}.current-page a.cal-cell__link`).first();
		const count = await page.locator(`${PAGE}.current-page a.cal-cell__link`).count();
		test.skip(count === 0, "no link cells on this page");
		const before = await page
			.locator(`${PAGE}.current-page`)
			.first()
			.getAttribute("data-page-index");
		await link.click();
		await page.waitForTimeout(300);
		const after = await page
			.locator(`${PAGE}.current-page`)
			.first()
			.getAttribute("data-page-index");
		expect(after).toBe(before);
	});

	test("leap-year Adar I and Adar II sheets exist in sequence", async ({ page }) => {
		// Pages 8-9 = Adar I / Adar II of Hebrew year 5787 (leaf 4).
		await page.goto("/?example=vertical-calendar&test-initialTurnedLeaves=0,1,2,3");
		const adarI = page.locator(`${PAGE}[data-page-index="8"] .cal-page__month-he`);
		const adarII = page.locator(`${PAGE}[data-page-index="9"] .cal-page__month-he`);
		await expect(adarI).toHaveText(/אדר א/);
		await expect(adarII).toHaveText(/אדר ב/);
	});

	test("reduced motion completes turns without animated delay", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		const book = page.locator(BOOK);
		const box = await book.boundingBox();
		if (!box) throw new Error("book not found");
		const before = await page
			.locator(`${PAGE}.current-page`)
			.first()
			.getAttribute("data-page-index");
		const x = box.x + box.width / 2;
		await page.mouse.move(x, box.y + box.height * 0.92);
		await page.mouse.down();
		await page.mouse.move(x, box.y + box.height * 0.2, { steps: 10 });
		await page.mouse.up();
		// Reduced motion should settle almost immediately.
		await page.waitForTimeout(250);
		const after = await page
			.locator(`${PAGE}.current-page`)
			.first()
			.getAttribute("data-page-index");
		expect(Number(after)).toBeGreaterThan(Number(before));
	});

	test("book re-lays out on viewport resize", async ({ page }) => {
		const book = page.locator(BOOK);
		const before = await book.boundingBox();
		await page.setViewportSize({ width: 500, height: 800 });
		const after = await book.boundingBox();
		expect(after).not.toBeNull();
		expect(Math.abs((after?.width ?? 0) - (before?.width ?? 0))).toBeGreaterThan(50);
		// Pages still positioned inside the book.
		const top = await page
			.locator(PAGE)
			.first()
			.evaluate((el) => el.style.top);
		expect(top).not.toBe("");
	});
});
