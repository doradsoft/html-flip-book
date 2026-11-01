import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { expect, test } from "./fixtures/coverage-test";

// The e2e suite exercises the vite dev server, which pre-bundles dependencies
// differently than `vite build` does — a dependency artifact that crashes only
// in the production bundle (e.g. gematry's eval-based webpack output) would
// ship broken to GitHub Pages while the suite stays green. This spec builds
// the example for real and loads the bundle to cover that gap.

const exampleDir = path.resolve(process.cwd(), "react/example");

const MIME: Record<string, string> = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".map": "application/json",
	".md": "text/markdown",
	".pdf": "application/pdf",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".svg": "image/svg+xml",
	".png": "image/png",
};

test("production bundle loads without runtime errors", async ({ page }, testInfo) => {
	test.setTimeout(120_000);
	const distDir = path.join(exampleDir, "dist", testInfo.project.name);
	execSync(`bun run build -- --outDir "${distDir}"`, {
		cwd: exampleDir,
		stdio: "inherit",
	});
	// CI builds with base /html-flip-book/ (GITHUB_ACTIONS env), matching the
	// real Pages deployment — serve dist under the same prefix.
	const embeddedPdfScripts: string[] = [];
	const fontRequests: string[] = [];
	await page.route("**/*", async (route) => {
		const pathname = new URL(route.request().url()).pathname.replace(/^\/html-flip-book/, "");
		if (pathname.endsWith("Heebo-Regular.ttf"))
			fontRequests.push(new URL(route.request().url()).pathname);
		const filePath = path.resolve(
			distDir,
			pathname === "/" || pathname === "" ? "index.html" : `.${pathname}`,
		);
		if (!filePath.startsWith(distDir + path.sep)) return route.fulfill({ status: 404 });
		try {
			if (
				path.extname(filePath) === ".js" &&
				(await readFile(filePath, "utf8")).includes("JVBERi0")
			) {
				embeddedPdfScripts.push(path.basename(filePath));
			}
			return await route.fulfill({
				path: filePath,
				contentType: MIME[path.extname(filePath)] ?? "application/octet-stream",
			});
		} catch {
			return route.fulfill({ status: 404 });
		}
	});
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));
	const prefix = process.env.GITHUB_ACTIONS === "true" ? "/html-flip-book" : "";
	await page.goto(`http://pages.local${prefix}/?example=rtl-comprehensive`);
	await expect(page.locator(".flipbook").first()).toBeVisible();
	expect.soft(embeddedPdfScripts, "Reading must not load embedded chapter PDFs").toEqual([]);
	expect.soft(fontRequests, "Reading must not load the PDF-only font").toEqual([]);
	const toolbar = page.locator("[role='toolbar']").first();
	await toolbar.locator(".flipbook-toolbar-download-trigger").click();
	const menu = page.locator(".flipbook-toolbar-download-menu[role='menu']").first();
	await menu.locator('input[type="radio"]').last().check();
	const selects = menu.locator("select.flipbook-toolbar-download-range-select");
	await selects.nth(0).selectOption({ index: 3 });
	await selects.nth(1).selectOption({ index: 3 });
	const fontResponse = page.waitForResponse((response) =>
		response.url().endsWith("Heebo-Regular.ttf"),
	);
	const downloaded = page.waitForEvent("download");
	await menu.getByRole("menuitem").click();
	const download = await downloaded;
	expect((await fontResponse).status()).toBe(200);
	expect(fontRequests).toEqual([`${prefix}/fonts/Heebo-Regular.ttf`]);
	const pdfPath = await download.path();
	if (!pdfPath) throw new Error("Downloaded PDF has no local file");
	const pdfBytes = await readFile(pdfPath);
	expect(pdfBytes.toString("latin1")).toContain("/FontFile2");
	const pdf = await PDFDocument.load(pdfBytes);
	expect(pdf.getPageCount()).toBeGreaterThan(0);
	expect(pageErrors).toEqual([]);
});
