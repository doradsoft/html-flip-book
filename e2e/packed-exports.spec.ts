import { execSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Packs both packages and installs the tarballs into a clean fixture
// (e2e/fixtures/packed-consumer, package.json committed, node_modules
// gitignored) — the exact resolution a downstream app performs, with no
// monorepo aliases. File contents reach the test through page.route +
// route.fulfill({path}), so the spec needs no dynamic fs calls.
//
// npm is used deliberately here despite the repo's bun package manager:
// the published artifacts target npm-registry consumers, so pack/install
// behavior is validated with the reference client (bun has no `pm pack`).

const repoRoot = process.cwd();
const consumerDir = "e2e/fixtures/packed-consumer";
const nmDir = path.resolve(repoRoot, consumerDir, "node_modules");

function npmPack(subdir: string): string {
	const out = execSync("npm pack", {
		cwd: path.join(repoRoot, subdir),
		encoding: "utf8",
	});
	return out.trim().split("\n").pop() ?? "";
}

function installPackedPackages() {
	const baseTgz = npmPack("base");
	const reactTgz = npmPack("react");
	// Absolute tarball paths — `dir/name.tgz` alone parses as GitHub shorthand.
	execSync(
		`npm --prefix "${consumerDir}" install --ignore-scripts --no-audit --no-fund --no-package-lock --legacy-peer-deps "${path.join(repoRoot, "base", baseTgz)}" "${path.join(repoRoot, "react", reactTgz)}"`,
		{ cwd: repoRoot, stdio: "inherit" },
	);
}

/** Serve the fixture's node_modules over a fake host; missing files 404. */
async function mountNodeModules(page: import("@playwright/test").Page) {
	await page.route("**/*", async (route) => {
		const pathname = new URL(route.request().url()).pathname;
		const filePath = path.resolve(
			nmDir,
			pathname === "/" || pathname === "" ? "index.html" : `.${pathname}`,
		);
		if (!filePath.startsWith(nmDir + path.sep)) return route.fulfill({ status: 404 });
		try {
			return await route.fulfill({ path: filePath });
		} catch {
			return route.fulfill({ status: 404 });
		}
	});
	await page.goto("http://hfb.local/");
}

const CORE_SELECTORS = [".flipbook-page-scrollport", ".page--cover", ".flipbook-bookmark"];

test.describe.configure({ mode: "serial", timeout: 300_000 });

test("documented stylesheet exports resolve in the packed packages", async ({ page }) => {
	installPackedPackages();
	await mountNodeModules(page);

	const vanillaCss = await page.evaluate(async () => {
		const pkg = await (await fetch("/html-flip-book-vanilla/package.json")).json();
		const res = await fetch(
			`/html-flip-book-vanilla/${pkg.exports["./style.css"].replace("./", "")}`,
		);
		return res.ok ? res.text() : null;
	});
	const reactCss = await page.evaluate(async () => {
		const pkg = await (await fetch("/html-flip-book-react/package.json")).json();
		const res = await fetch(
			`/html-flip-book-react/${pkg.exports["./styles.css"].replace("./", "")}`,
		);
		return res.ok ? res.text() : null;
	});

	expect(
		vanillaCss,
		"html-flip-book-vanilla/style.css did not resolve to a shipped file",
	).not.toBeNull();
	expect(
		reactCss,
		"html-flip-book-react/styles.css did not resolve to a shipped file",
	).not.toBeNull();
	for (const sel of CORE_SELECTORS) {
		expect(vanillaCss, `vanilla css missing ${sel}`).toContain(sel.slice(1));
		expect(reactCss, `react css missing ${sel}`).toContain(sel.slice(1));
	}
	// The react entry must be complete without a second import.
	for (const sel of [".flipbook-toolbar", "toc"]) {
		expect(reactCss, `react css missing ${sel}`).toContain(sel);
	}
});

test("packed react stylesheet actually styles flipbook markup in-browser", async ({ page }) => {
	installPackedPackages();
	await mountNodeModules(page);
	const css = await page.evaluate(async () => {
		const pkg = await (await fetch("/html-flip-book-react/package.json")).json();
		const res = await fetch(
			`/html-flip-book-react/${pkg.exports["./styles.css"].replace("./", "")}`,
		);
		return res.ok ? res.text() : "";
	});
	expect(css.length).toBeGreaterThan(1000);

	await page.setContent(`<style>${css}</style>
		<div class="flipbook" style="height:600px">
			<div class="page" data-page-index="1" style="inset:0">
				<div class="flipbook-page-scrollport">
					<div class="flipbook-page-content"><div class="flipbook-page-bounded"></div></div>
				</div>
			</div>
			<div class="flipbook-bookmarks"><div class="flipbook-bookmark">x</div></div>
		</div>`);
	// `layout style paint` serializes as the `content` shorthand.
	await expect(page.locator(".page")).toHaveCSS("contain", "content");
	await expect(page.locator(".flipbook-page-scrollport")).toHaveCSS("overflow-y", "auto");
	await expect(page.locator(".flipbook-bookmark")).toHaveCSS("cursor", "pointer");
	const bounded = await page.locator(".flipbook-page-bounded").boundingBox();
	const content = await page.locator(".flipbook-page-content").boundingBox();
	expect(bounded?.height).toBe(content?.height);
});
