import { execSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";

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
	execSync(`npm run build -- --outDir "${distDir}"`, {
		cwd: exampleDir,
		stdio: "inherit",
	});
	// CI builds with base /html-flip-book/ (GITHUB_ACTIONS env), matching the
	// real Pages deployment — serve dist under the same prefix.
	await page.route("**/*", async (route) => {
		const pathname = new URL(route.request().url()).pathname.replace(/^\/html-flip-book/, "");
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
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));
	const prefix = process.env.GITHUB_ACTIONS === "true" ? "/html-flip-book" : "";
	await page.goto(`http://pages.local${prefix}/?example=rtl-comprehensive`);
	await expect(page.locator(".flipbook").first()).toBeVisible();
	expect(pageErrors).toEqual([]);
});
