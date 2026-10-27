import { execSync } from "node:child_process";
import { access, mkdtemp, readdir, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Bounded page panels (issue #279): a consumer page root carrying
 * `.flipbook-page-panel` stays exactly page-height so a stationary
 * header/footer plus an independently scrolling inner pane work without
 * overriding the internal scrollport rules. The page scrollport must stay
 * dormant (nothing to scroll) while the pane owns wheel/keyboard/touch
 * scrolling, and inner scroll positions must survive page turns.
 *
 * The spec builds the static fixture in e2e/fixtures/panels against the
 * workspace dist with Vite — the same way a real bundler consumer resolves
 * the package — so the assertions exercise the shipped stylesheet, not
 * example-app CSS.
 */

const repoRoot = process.cwd();
const fixtureDir = path.join(repoRoot, "e2e", "fixtures", "panels");

// Dev hosts on musl libc (Alpine) cannot run Playwright's bundled chromium;
// HFB_CHROMIUM=/usr/bin/chromium points at a system build instead.
test.use({
	launchOptions: process.env.HFB_CHROMIUM ? { executablePath: process.env.HFB_CHROMIUM } : {},
});

async function exists(p: string): Promise<boolean> {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}

async function ensureBuilt(): Promise<string> {
	const distDir = path.join(repoRoot, "base", "dist");
	if (!(await exists(path.join(distDir, "flipbook.js")))) {
		execSync("npm run build:base", { cwd: repoRoot, stdio: "inherit" });
	}
	const css = (await readdir(distDir)).find((f) => f.endsWith(".css"));
	if (!css) throw new Error("base build produced no stylesheet");
	return path.join(distDir, css);
}

const MIME: Record<string, string> = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
};

let distDir: string;
let tmpRoot: string;

test.beforeAll(async () => {
	const cssPath = await ensureBuilt();
	tmpRoot = await mkdtemp(path.join(os.tmpdir(), "hfb-panels-"));
	distDir = path.join(tmpRoot, "dist");
	execSync(
		`npx vite build --config "${path.join(fixtureDir, "vite.config.mts")}" --outDir "${distDir}"`,
		{
			cwd: fixtureDir,
			stdio: "inherit",
			env: { ...process.env, HFB_PANEL_CSS: cssPath },
		},
	);
});

test.afterAll(async () => {
	await rm(tmpRoot, { recursive: true, force: true });
});

test.beforeEach(async ({ page }) => {
	await page.route("**/*", async (route) => {
		const pathname = new URL(route.request().url()).pathname;
		const filePath = path.resolve(
			distDir,
			pathname === "/" || pathname === "" ? "index.html" : `.${pathname}`,
		);
		if (!filePath.startsWith(distDir + path.sep)) return route.fulfill({ status: 404 });
		try {
			return await route.fulfill({
				path: filePath,
				contentType: MIME[path.extname(filePath)] ?? "application/octet-stream",
			});
		} catch {
			return route.fulfill({ status: 404 });
		}
	});
	await page.goto("http://panels.local/", { waitUntil: "domcontentloaded" });
});

for (const dir of ["ltr", "rtl"]) {
	test(`[${dir}] panel is bounded and only the inner pane scrolls`, async ({ page }) => {
		const wrap = page.locator(`.book-wrap[data-dir="${dir}"]`);
		// Panels live on indices 1 and 2; .current-page marks the spread on top
		// (back-side pages keep a box while mirrored away).
		const panel = wrap.locator(".page.current-page .flipbook-page-panel").first();
		const pane = panel.locator(".fixture-pane");
		const scrollport = panel.locator(
			"xpath=ancestor::*[contains(@class,'flipbook-page-scrollport')]",
		);
		await expect(panel).toBeVisible();
		await expect(panel.locator(".fixture-panel-header")).toBeVisible();
		await expect(panel.locator(".fixture-panel-footer")).toBeVisible();

		// Bounded: the panel never exceeds the scrollport, so the page
		// scrollport has nothing to scroll and stays dormant.
		const metrics = await panel.evaluate((panelEl) => {
			const port = panelEl.closest(".flipbook-page-scrollport");
			const paneEl = panelEl.querySelector(".fixture-pane");
			if (!port || !paneEl) throw new Error("panel structure missing");
			return {
				panelH: panelEl.getBoundingClientRect().height,
				portClient: port.clientHeight,
				portScrollable: port.scrollHeight - port.clientHeight,
				paneScrollable: paneEl.scrollHeight - paneEl.clientHeight,
			};
		});
		expect(metrics.panelH).toBeCloseTo(metrics.portClient, 0);
		expect(metrics.portScrollable).toBe(0);
		expect(metrics.paneScrollable).toBeGreaterThan(100);

		// Wheel over the pane scrolls the pane, not the page scrollport.
		const box = await pane.boundingBox();
		if (!box) throw new Error("pane is not visible");
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.wheel(0, 400);
		await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBeGreaterThan(50);
		expect(await scrollport.evaluate((el) => el.scrollTop)).toBe(0);

		// Keyboard scrolling works through the focusable pane.
		await pane.focus();
		const before = await pane.evaluate((el) => el.scrollTop);
		await page.keyboard.press("PageDown");
		await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBeGreaterThan(before);
	});

	test(`[${dir}] inner scroll position survives a page turn`, async ({ page }) => {
		const wrap = page.locator(`.book-wrap[data-dir="${dir}"]`);
		const pane = wrap.locator(".page.current-page .fixture-pane").first();
		await expect(pane).toBeVisible();
		await pane.evaluate((el) => {
			el.scrollTop = 300;
		});
		await page.evaluate(
			(direction) =>
				(window as unknown as { books: Record<string, { flipNext(): void }> }).books[
					direction
				].flipNext(),
			dir,
		);
		await page.waitForTimeout(1600);
		await page.evaluate(
			(direction) =>
				(window as unknown as { books: Record<string, { flipPrev(): void }> }).books[
					direction
				].flipPrev(),
			dir,
		);
		await page.waitForTimeout(1600);
		expect(await pane.evaluate((el) => el.scrollTop)).toBe(300);
	});
}

test("normal pages keep the document-style inward scrollbar", async ({ page }) => {
	const wrap = page.locator('.book-wrap[data-dir="ltr"]');
	// Show a spread containing a normal (non-panel) document page.
	await page.evaluate(() =>
		(
			window as unknown as { books: Record<string, { jumpToPage(i: number): void }> }
		).books.ltr.jumpToPage(3),
	);
	// Back-side pages keep a box while mirrored away — .current-page marks the
	// two pages actually on top of the spread.
	const normalPage = wrap.locator(".page.current-page:not(:has(.flipbook-page-panel))").first();
	await expect(normalPage).toBeVisible();
	const port = normalPage.locator(".flipbook-page-scrollport");
	const scrollable = await port.evaluate((el) => el.scrollHeight - el.clientHeight);
	expect(scrollable).toBeGreaterThan(100);
	const box = await normalPage.boundingBox();
	if (!box) throw new Error("normal page is not visible");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.wheel(0, 300);
	await expect.poll(() => port.evaluate((el) => el.scrollTop)).toBeGreaterThan(50);
});
