import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/coverage-test";

const BOOK = ".cal-book.flipbook";
const SHEET = `${BOOK} .page.current-page:has([data-hebrew-month])`;
const month = (page: Page) => page.locator(`${SHEET} [data-hebrew-month]`);

async function box(page: Page, selector = SHEET) {
	await page.locator(selector).scrollIntoViewIfNeeded();
	const bounds = await page.locator(selector).boundingBox();
	if (!bounds) throw new Error(`Missing sheet: ${selector}`);
	return bounds;
}

async function drag(page: Page, reverse = false, touch = false) {
	const index = Number(await page.locator(SHEET).getAttribute("data-page-index"));
	const sheet = await box(page, reverse ? `${BOOK} .page[data-page-index="${index - 1}"]` : SHEET);
	const x = sheet.x + sheet.width / 2;
	const startY = reverse ? sheet.y + 8 : sheet.y + sheet.height - 8;
	const endY = reverse ? startY + sheet.height * 1.5 : startY - sheet.height * 1.5;
	if (touch) {
		const session = await page.context().newCDPSession(page);
		await session.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [{ x, y: startY }],
		});
		for (let step = 1; step <= 12; step++) {
			await session.send("Input.dispatchTouchEvent", {
				type: "touchMove",
				touchPoints: [{ x, y: startY + ((endY - startY) * step) / 12 }],
			});
		}
		await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
		await session.detach();
	} else {
		await page.mouse.move(x, startY);
		await page.mouse.down();
		await page.mouse.move(x, endY, { steps: 12 });
		await page.mouse.up();
	}
}

test.describe("Vertical spiral calendar", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/?example=vertical-calendar");
		await expect(month(page)).toHaveAttribute("data-hebrew-month", "7");
	});

	test("fits an upright month and constrains the binding to the sheets", async ({
		page,
	}, testInfo) => {
		const sheet = await box(page);
		expect(sheet.width).toBeGreaterThan(testInfo.project.name === "mobile" ? 300 : 340);
		const metrics = await page.locator(BOOK).evaluate((book) => {
			const sheet = book.querySelector<HTMLElement>(".page.current-page:has([data-hebrew-month])");
			if (!sheet) throw new Error("missing month");
			const coil = getComputedStyle(book, "::before");
			const scroll = sheet.querySelector<HTMLElement>(".flipbook-page-scrollport");
			return {
				coilWidth: Number.parseFloat(coil.width),
				width: sheet.clientWidth,
				coilLeft: Number.parseFloat(coil.left),
				left: Number.parseFloat(sheet.style.left),
				scrollHeight: scroll?.scrollHeight,
				height: scroll?.clientHeight,
				bottom: sheet.querySelector("table")?.getBoundingClientRect().bottom,
				pageBottom: sheet.getBoundingClientRect().bottom,
				transform: sheet.style.transform,
			};
		});
		expect(metrics.coilWidth).toBeCloseTo(metrics.width, 0);
		expect(metrics.coilLeft).toBeCloseTo(metrics.left, 0);
		expect(metrics.scrollHeight).toBe(metrics.height);
		expect(metrics.bottom).toBeLessThan(metrics.pageBottom);
		expect(metrics.transform).toContain("rotateX(0deg)");
		await expect(month(page).locator(".cal-page__year-he")).toHaveText("87");
		await expect(month(page).locator(".cal-page__greg-range")).toHaveText("September–October 26");
		await expect(month(page).getByRole("table")).toHaveAccessibleName("Tishrei 5787");
		await page.screenshot({
			path: `docs/images/vertical-calendar/repaired-${testInfo.project.name}.png`,
			fullPage: true,
		});
	});

	for (const input of ["mouse", "touch"]) {
		test(`advances and returns using real ${input} input on opposite free edges`, async ({
			page,
		}) => {
			await drag(page, false, input === "touch");
			await expect(month(page)).toHaveAttribute("data-hebrew-month", "8");
			await drag(page, true, input === "touch");
			await expect(month(page)).toHaveAttribute("data-hebrew-month", "7");
		});
	}

	test("preserves content gestures and normal scrolling outside the affordance", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 500 });
		const sheet = await box(page);
		const x = sheet.x + sheet.width / 2;
		await page.mouse.move(x, sheet.y + sheet.height * 0.5);
		await page.mouse.down();
		await page.mouse.move(x, sheet.y - sheet.height * 0.5, { steps: 12 });
		await page.mouse.up();
		await expect(month(page)).toHaveAttribute("data-hebrew-month", "7");
		const before = await page
			.locator(".example-container")
			.evaluate((element) => element.scrollTop);
		await page.mouse.move(x, sheet.y + 40);
		await page.mouse.wheel(0, -300);
		await expect
			.poll(() => page.locator(".example-container").evaluate((element) => element.scrollTop))
			.toBeLessThan(before);
		await expect(month(page)).toHaveAttribute("data-hebrew-month", "7");
	});

	test("shows every month once through both Adars and the year boundary", async ({ page }) => {
		for (const name of ["חשון", "כסלו", "טבת", "שבט", "אדר א׳", "אדר ב׳"]) {
			await page.locator(".flipbook-toolbar-next").click();
			await expect(month(page).locator(".cal-page__month-he")).toHaveText(name);
		}
		await page.getByRole("combobox", { name: "Go to month" }).selectOption("12");
		await expect(month(page)).toHaveAttribute("data-hebrew-month", "6");
		await page.locator(".flipbook-toolbar-next").click();
		await expect(month(page)).toHaveAttribute("data-hebrew-year", "5788");
		await expect(month(page)).toHaveAttribute("data-hebrew-month", "7");
		await page.locator(".flipbook-toolbar-prev").click();
		await expect(month(page)).toHaveAttribute("data-hebrew-year", "5787");
		await expect(month(page)).toHaveAttribute("data-hebrew-month", "6");
		await page.getByRole("combobox", { name: "Go to month" }).selectOption("3");
		await expect(month(page).locator(".cal-page__greg-range")).toHaveText(
			"December 26 – January 27",
		);
	});

	test("provides up/down keyboard controls with stable focus and boundary state", async ({
		page,
	}) => {
		await page.locator(".flipbook-toolbar-next").focus();
		await page.keyboard.press("ArrowUp");
		await expect(month(page)).toHaveAttribute("data-hebrew-month", "8");
		await expect(page.locator(".flipbook-toolbar-next")).toBeFocused();
		await page.keyboard.press("ArrowDown");
		await expect(month(page)).toHaveAttribute("data-hebrew-month", "7");
		await page.locator(".flipbook-toolbar-first").click();
		await expect(page.locator(".flipbook-toolbar-prev")).toBeDisabled();
		await page.locator(".flipbook-toolbar-last").click();
		await expect(page.locator(".flipbook-toolbar-next")).toBeDisabled();
		await expect(page.getByRole("combobox", { name: "Go to month" })).toHaveValue("25");
	});

	test("opens local date details without turning or contacting a calendar service", async ({
		page,
	}) => {
		const link = month(page).locator("a.cal-cell__link").first();
		await expect(link).toBeVisible();
		const external: string[] = [];
		page.on("request", (request) => {
			if (new URL(request.url()).origin !== new URL(page.url()).origin)
				external.push(request.url());
		});
		await link.click();
		const details = page.getByRole("dialog", { name: "Calendar date details" });
		await expect(details).toBeVisible();
		await expect(details.locator("time")).toHaveAttribute("datetime", "2026-09-12");
		await expect(details).toContainText("September 12, 26");
		await details.getByRole("button", { name: "Close date details" }).click();
		await expect(details).not.toBeVisible();
		await expect(link).toBeFocused();
		expect(external).toEqual([]);
		await expect(month(page)).toHaveAttribute("data-hebrew-month", "7");
		expect(
			await page
				.locator(`${BOOK} .page:not(.current-page)`)
				.evaluateAll((pages) =>
					pages.every(
						(page) => (page as HTMLElement).inert && page.getAttribute("aria-hidden") === "true",
					),
				),
		).toBe(true);
	});

	test("settles with reduced motion and refits the complete grid after resize", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.locator(".flipbook-toolbar-next").click();
		await expect(month(page)).toHaveAttribute("data-hebrew-month", "8", { timeout: 500 });
		await page.setViewportSize({ width: 390, height: 844 });
		await box(page);
		expect(
			await month(page).evaluate((element) => {
				const scrollport = element.closest(".flipbook-page-scrollport");
				return (
					scrollport?.scrollHeight === scrollport?.clientHeight &&
					element.querySelector("table").getBoundingClientRect().bottom <=
						element.getBoundingClientRect().bottom
				);
			}),
		).toBe(true);
	});

	test("keeps the full six-week grid within its sheet in a short desktop viewport", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 640 });
		await box(page);
		expect(
			await month(page).evaluate((element) => {
				const scrollport = element.closest(".flipbook-page-scrollport");
				const lastRow = element.querySelector("tbody tr:last-child");
				return (
					scrollport?.scrollHeight === scrollport?.clientHeight &&
					lastRow &&
					lastRow.getBoundingClientRect().bottom < element.getBoundingClientRect().bottom
				);
			}),
		).toBe(true);
	});

	test("keeps moving faces coincident and the spiral fixed during a held turn", async ({
		page,
	}, testInfo) => {
		const sheet = await box(page);
		const coilBefore = await page
			.locator(BOOK)
			.evaluate((book) => getComputedStyle(book, "::before").top);
		const x = sheet.x + sheet.width / 2;
		await page.mouse.move(x, sheet.y + sheet.height - 5);
		await page.mouse.down();
		await page.mouse.move(x, sheet.y + sheet.height * 0.35, { steps: 10 });
		const a = await page.locator(`${BOOK} .page[data-page-index="2"]`).boundingBox();
		const b = await page.locator(`${BOOK} .page[data-page-index="3"]`).boundingBox();
		if (!a || !b) throw new Error("missing moving faces");
		const host = await page.locator(BOOK).boundingBox();
		if (!host) throw new Error("missing calendar host");
		expect(a.x).toBeGreaterThanOrEqual(host.x);
		expect(a.x + a.width).toBeLessThanOrEqual(host.x + host.width);
		expect(a.x).toBeCloseTo(b.x, 0);
		expect(a.y).toBeCloseTo(b.y, 0);
		expect(a.height).toBeCloseTo(b.height, 0);
		expect(a.width).toBeCloseTo(b.width, 0);
		expect(
			await page.locator(BOOK).evaluate((book) => getComputedStyle(book, "::before").top),
		).toBe(coilBefore);
		await page.screenshot({
			path: `docs/images/vertical-calendar/repaired-mid-turn-${testInfo.project.name}.png`,
			fullPage: true,
		});
		await page.mouse.move(x, sheet.y - sheet.height * 0.3, { steps: 10 });
		const front = await page.locator(`${BOOK} .page[data-page-index="2"]`).boundingBox();
		const reverse = await page.locator(`${BOOK} .page[data-page-index="3"]`).boundingBox();
		if (!front || !reverse) throw new Error("missing reverse face");
		expect(front.y).toBeCloseTo(reverse.y, 0);
		expect(front.height).toBeCloseTo(reverse.height, 0);
		expect(
			await page.locator(BOOK).evaluate((book) => {
				const coil = Number(getComputedStyle(book, "::before").zIndex);
				return [...book.querySelectorAll<HTMLElement>(".page--flipping")].every(
					(page) => Number(page.style.zIndex) > coil,
				);
			}),
		).toBe(true);
		await page.screenshot({
			path: `docs/images/vertical-calendar/repaired-mid-reverse-${testInfo.project.name}.png`,
			fullPage: true,
		});
		await page.mouse.up();
		await expect(month(page)).toHaveAttribute("data-hebrew-month", "8");
	});
});
