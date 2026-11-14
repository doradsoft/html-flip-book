import { expect, test } from "./fixtures/coverage-test";

test("switches the vertical book's toolbar layout without losing its month", async ({
	page,
}, testInfo) => {
	await page.goto("/?example=vertical-calendar");
	const toolbar = page.getByRole("toolbar", { name: "FlipBook navigation" });
	const layout = page.getByRole("combobox", { name: "Toolbar layout" });
	const month = page.locator(".cal-book .page.current-page [data-hebrew-month]");
	await expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
	for (const orientation of ["vertical", "horizontal"]) {
		await layout.selectOption(orientation);
		await expect(toolbar).toHaveAttribute("aria-orientation", orientation);
		await expect(toolbar).toHaveCSS(
			"flex-direction",
			orientation === "vertical" ? "column" : "row",
		);
		for (const button of ["first", "prev", "next", "last"])
			await expect(toolbar.locator(`.flipbook-toolbar-${button} svg`)).toHaveCSS(
				"transform",
				"matrix(0, -1, 1, 0, 0, 0)",
			);
		await expect(toolbar.locator(".flipbook-toolbar-indicator")).toHaveCSS("transform", "none");
		expect(
			await toolbar
				.locator(".flipbook-toolbar-fullscreen svg")
				.evaluate((icon) => new DOMMatrix(getComputedStyle(icon).transform).b),
		).toBe(0);
		const geometry = await toolbar.evaluate((element) => {
			const first = element.querySelector(".flipbook-toolbar-first").getBoundingClientRect();
			const prev = element.querySelector(".flipbook-toolbar-prev").getBoundingClientRect();
			return {
				sameColumn: Math.abs(first.x - prev.x) < 1,
				sameRow: Math.abs(first.y - prev.y) < 1,
			};
		});
		expect(geometry.sameColumn).toBe(orientation === "vertical");
		expect(geometry.sameRow).toBe(orientation === "horizontal");
		await page.screenshot({
			path: `docs/images/vertical-calendar/toolbar-${orientation}-${testInfo.project.name}.png`,
			fullPage: true,
		});
		const grid = await month.evaluate((element) => {
			const scrollport = element.closest(".flipbook-page-scrollport");
			return {
				scrollHeight: scrollport.scrollHeight,
				height: scrollport.clientHeight,
				tableBottom: element.querySelector("table").getBoundingClientRect().bottom,
				pageBottom: element.getBoundingClientRect().bottom,
				font: getComputedStyle(element).fontSize,
			};
		});
		expect(grid.scrollHeight, JSON.stringify(grid)).toBe(grid.height);
		expect(grid.tableBottom, JSON.stringify(grid)).toBeLessThanOrEqual(grid.pageBottom);
		const bounds = await toolbar.boundingBox();
		expect(bounds.x).toBeGreaterThanOrEqual(0);
		expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
		await toolbar.locator(".flipbook-toolbar-next").click();
		await expect(month).toHaveAttribute("data-hebrew-month", "8");
		await toolbar.locator(".flipbook-toolbar-prev").click();
		await expect(month).toHaveAttribute("data-hebrew-month", "7");
	}
});

test("keeps vertical toolbar commands, focus, and boundary states working", async ({ page }) => {
	await page.goto("/?example=vertical-calendar");
	await page.getByRole("combobox", { name: "Toolbar layout" }).selectOption("vertical");
	const toolbar = page.getByRole("toolbar");
	const month = page.locator(".cal-book .page.current-page [data-hebrew-month]");
	await toolbar.locator(".flipbook-toolbar-next").focus();
	await page.keyboard.press("ArrowUp");
	await expect(month).toHaveAttribute("data-hebrew-month", "8");
	await expect(toolbar.locator(".flipbook-toolbar-next")).toBeFocused();
	await page.getByRole("combobox", { name: "Toolbar layout" }).selectOption("horizontal");
	await expect(month).toHaveAttribute("data-hebrew-month", "8");
	await page.getByRole("combobox", { name: "Toolbar layout" }).selectOption("vertical");
	await toolbar.locator(".flipbook-toolbar-first").click();
	await expect(toolbar.locator(".flipbook-toolbar-prev")).toBeDisabled();
	await toolbar.locator(".flipbook-toolbar-last").click();
	await expect(toolbar.locator(".flipbook-toolbar-next")).toBeDisabled();
});

for (const direction of ["ltr", "rtl"]) {
	test(`preserves the ${direction} horizontal book's toolbar and lateral chevrons`, async ({
		page,
	}) => {
		await page.goto(`/?example=${direction}-no-shadow`);
		const toolbar = page.getByRole("toolbar");
		await expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
		await expect(toolbar).toHaveAttribute("data-flip-axis", "horizontal");
		await expect(toolbar).toHaveCSS("flex-direction", "row");
		await expect(toolbar.locator(".flipbook-toolbar-next svg")).toHaveCSS(
			"transform",
			direction === "rtl" ? "matrix(-1, 0, 0, 1, 0, 0)" : "none",
		);
		await expect(page.getByRole("combobox", { name: "Toolbar layout" })).toHaveCount(0);
	});
}

test("reserves a stable title slot before visiting cover, month and end labels", async ({
	page,
}, testInfo) => {
	await page.goto("/?example=vertical-calendar");
	await page.getByRole("combobox", { name: "Toolbar layout" }).selectOption("vertical");
	const toolbar = page.getByRole("toolbar");
	const indicator = toolbar.locator(".flipbook-toolbar-indicator");
	const initial = await toolbar.boundingBox();
	expect(initial.width).toBeCloseTo(64, 1);
	const months = page.getByRole("combobox", { name: "Go to month" });
	const options = await months.locator("option").evaluateAll((options) =>
		options.map((option) => ({
			value: (option as HTMLOptionElement).value,
			text: option.textContent.trim(),
		})),
	);
	for (const option of options) {
		await months.selectOption(option.value);
		const text = option.value === "-1" ? "כריכה" : option.value === "25" ? "סיום" : option.text;
		await expect(indicator).toHaveText(text);
		const bounds = await toolbar.boundingBox();
		expect(bounds.width).toBeCloseTo(initial.width, 1);
		expect(bounds.height).toBeCloseTo(initial.height, 1);
		if (option.value === "-1")
			await toolbar.screenshot({
				path: `docs/images/vertical-calendar/toolbar-stable-cover-${testInfo.project.name}.png`,
			});
	}
	await months.selectOption("0");
	await expect(indicator).toHaveText("תשרי 87");
	await toolbar.screenshot({
		path: `docs/images/vertical-calendar/toolbar-stable-title-${testInfo.project.name}.png`,
	});
});

test("caps title height at two lines with ellipsis and keeps the full label available", async ({
	page,
}) => {
	await page.goto("/?example=vertical-calendar");
	await page.getByRole("combobox", { name: "Toolbar layout" }).selectOption("vertical");
	const toolbar = page.getByRole("toolbar");
	const indicator = toolbar.locator(".flipbook-toolbar-indicator");
	await indicator.evaluate((element) => ((element as HTMLElement).style.width = "20px"));
	await expect(indicator).toHaveAttribute("title", "תשרי 87");
	const label = indicator.locator(".flipbook-toolbar-indicator-label");
	await expect(label).toHaveCSS("text-overflow", "ellipsis");
	await expect(label).toHaveCSS("white-space", "normal");
	await expect(label).toHaveCSS("-webkit-line-clamp", "2");
	const metrics = await label.evaluate((element) => ({
		height: element.clientHeight,
		content: element.scrollHeight,
	}));
	expect(metrics.content).toBeGreaterThan(metrics.height);
	await expect(indicator).toHaveText("תשרי 87");
});
