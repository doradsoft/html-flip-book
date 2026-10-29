import { type CDPSession, expect, type Locator, type Page, test } from "./fixtures/coverage-test";

type ContentKind = "image" | "link" | "linked-image";
type Pull = { x: number; y: number; client?: CDPSession };

async function addContent(surface: Locator, kind: ContentKind) {
	await surface.evaluate((element, contentKind) => {
		const fixture = document.createElement("div");
		fixture.dataset.nativeDragFixture = "";
		fixture.dataset.dragStarts = "0";
		fixture.dataset.nativeDrags = "0";
		fixture.dataset.clicks = "0";
		fixture.style.cssText =
			"position:absolute;left:50%;top:40%;transform:translateX(-50%);width:80px;height:70px;z-index:10";
		const image = document.createElement("img");
		image.src =
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr1kAAAAASUVORK5CYII=";
		image.alt = "Drag test picture";
		image.style.cssText = "display:block;width:80px;height:70px;background:teal";
		const link = document.createElement("a");
		link.href = "#native-drag-link";
		link.style.cssText = "display:block;width:80px;height:70px;background:white";
		if (contentKind === "linked-image") link.append(image);
		else link.textContent = "Drag this link";
		fixture.append(contentKind === "image" ? image : link);
		fixture.addEventListener("click", () => {
			fixture.dataset.clicks = String(Number(fixture.dataset.clicks) + 1);
		});
		fixture.addEventListener("dragstart", (event) => {
			fixture.dataset.dragStarts = String(Number(fixture.dataset.dragStarts) + 1);
			if (!event.defaultPrevented) {
				fixture.dataset.nativeDrags = String(Number(fixture.dataset.nativeDrags) + 1);
			}
		});
		element.append(fixture);
	}, kind);
	const fixture = surface.locator("[data-native-drag-fixture]");
	const target = fixture.locator(kind === "link" ? "a" : "img");
	await expect(target).toBeVisible();
	return { fixture, target };
}

async function openContent(page: Page, direction: string, turn: string, kind: ContentKind) {
	await page.goto(
		`/?example=${direction}-comprehensive&test-initialTurnedLeaves=0,1,2&test-fastDeltaThreshold=1000000`,
	);
	const book = page.locator(`.${direction === "ltr" ? "en" : "he"}-book.flipbook`);
	const surface = book.locator(`.page[data-page-index="${turn === "forward" ? 6 : 5}"]`);
	await expect(surface).toBeVisible();
	const movement = (direction === "ltr") === (turn === "forward") ? -1 : 1;
	const settledPage = book.locator(`.page[data-page-index="${turn === "forward" ? 8 : 4}"]`);
	return { book, surface, movement, settledPage, ...(await addContent(surface, kind)) };
}

async function press(page: Page, target: Locator, touch: boolean): Promise<Pull> {
	const bounds = await target.boundingBox();
	if (!bounds) throw new Error("Drag target missing");
	const pull: Pull = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
	if (touch) {
		pull.client = await page.context().newCDPSession(page);
		await pull.client.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [{ x: pull.x, y: pull.y }],
		});
	} else {
		await page.mouse.move(pull.x, pull.y);
		await page.mouse.down();
	}
	return pull;
}

async function move(page: Page, pull: Pull, x: number) {
	if (pull.client) {
		for (let step = 1; step <= 8; step++) {
			await pull.client.send("Input.dispatchTouchEvent", {
				type: "touchMove",
				touchPoints: [{ x: pull.x + ((x - pull.x) * step) / 8, y: pull.y }],
			});
		}
	} else await page.mouse.move(x, pull.y, { steps: 8 });
	return { ...pull, x };
}

async function release(page: Page, pull: Pull) {
	if (pull.client) {
		await pull.client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
		await pull.client.detach();
	} else await page.mouse.up();
	await page.mouse.move(0, 0);
}

async function expectLinkClick(page: Page, target: Locator, kind: ContentKind) {
	if (kind === "image") return;
	await target.click();
	await expect(page).toHaveURL(/#native-drag-link$/);
}

async function expectPageOwnsDrag(fixture: Locator, touch: boolean) {
	await expect(fixture).toHaveAttribute("data-native-drags", "0");
	if (touch) return;
	await expect
		.poll(async () => Number(await fixture.getAttribute("data-drag-starts")))
		.toBeGreaterThan(0);
}

async function checkTurning(
	page: Page,
	touch: boolean,
	direction: string,
	turn: string,
	kind: ContentKind,
) {
	const { book, surface, fixture, target, movement, settledPage } = await openContent(
		page,
		direction,
		turn,
		kind,
	);
	await expectLinkClick(page, target, kind);
	const clicks = Number(await fixture.getAttribute("data-clicks"));
	const bounds = await surface.boundingBox();
	if (!bounds) throw new Error("Page bounds missing");
	let pull = await press(page, target, touch);
	const origin = pull.x;
	pull = await move(page, pull, origin + movement * bounds.width * 0.35);
	await expect(book.locator(".page--folded")).toHaveCount(2);
	await expectPageOwnsDrag(fixture, touch);
	pull = await move(page, pull, origin + movement * bounds.width * 1.3);
	await release(page, pull);
	await expect(settledPage).toHaveClass(/current-page/);
	await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
	await expect(fixture).toHaveAttribute("data-clicks", String(clicks));
}

for (const direction of ["ltr", "rtl"]) {
	for (const turn of ["forward", "backward"]) {
		for (const kind of ["image", "link", "linked-image"] as const) {
			test(`${direction} ${turn}: dragging ${kind} turns the page`, async ({ page, isMobile }) => {
				await checkTurning(page, isMobile, direction, turn, kind);
			});
		}
	}
}

for (const mode of ["select", "excluded"]) {
	for (const kind of ["image", "link", "linked-image"] as const) {
		test(`${mode}: ${kind} retains native dragging without page animation`, async ({
			page,
			isMobile,
		}) => {
			test.skip(
				isMobile,
				"Native mouse dragging is checked on desktop; touch turning is covered above.",
			);
			const { book, surface, fixture, target } = await openContent(page, "ltr", "forward", kind);
			if (mode === "select")
				await page.getByRole("button", { name: "Select text with mouse" }).click();
			else await fixture.evaluate((element) => element.setAttribute("data-flipbook-no-flip", ""));
			const pull = await press(page, target, false);
			const movedPull = await move(page, pull, pull.x - 70);
			await expect
				.poll(async () => Number(await fixture.getAttribute("data-native-drags")))
				.toBeGreaterThan(0);
			await expect(book.locator(".page--folded, .page--flipping")).toHaveCount(0);
			await release(page, movedPull);
			await expect(surface).toHaveClass(/current-page/);
		});
	}
}
