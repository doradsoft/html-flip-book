import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(tmpdir(), "hfb-packed-fixture");

function npm(args: string[], cwd: string) {
	return execFileSync("npm", args, { cwd, encoding: "utf8", shell: true }).trim();
}

/** Pack both packages into a clean fixture and install them with no monorepo
 *  aliases — the exact resolution a downstream app performs. */
function installPackedPackages() {
	rmSync(fixture, { recursive: true, force: true });
	mkdirSync(fixture, { recursive: true });
	writeFileSync(
		path.join(fixture, "package.json"),
		JSON.stringify({ name: "hfb-packed-fixture", type: "module" }),
	);
	const baseTgz = npm(["pack", "--pack-destination", fixture], path.join(repoRoot, "base"));
	const reactTgz = npm(["pack", "--pack-destination", fixture], path.join(repoRoot, "react"));
	npm(
		[
			"install",
			"--ignore-scripts",
			"--no-audit",
			"--no-fund",
			"--legacy-peer-deps",
			path.join(fixture, reactTgz),
			path.join(fixture, baseTgz),
		],
		fixture,
	);
	return path.join(fixture, "node_modules");
}

function exportedCss(nm: string, pkgName: string, subpath: string) {
	const pkgDir = path.join(nm, pkgName);
	const { exports: ex } = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
	const target = ex?.[subpath];
	expect(typeof target, `${pkgName} missing export ${subpath}`).toBe("string");
	const file = path.join(pkgDir, target);
	expect(existsSync(file), `${pkgName}${subpath} → ${target} does not exist`).toBe(true);
	return readFileSync(file, "utf8");
}

test.describe.configure({ mode: "serial", timeout: 300_000 });

test("documented stylesheet exports resolve in the packed packages", () => {
	const nm = installPackedPackages();
	const vanillaCss = exportedCss(nm, "html-flip-book-vanilla", "./style.css");
	const reactCss = exportedCss(nm, "html-flip-book-react", "./styles.css");

	for (const sel of [".flipbook-page-scrollport", ".page--cover", ".flipbook-bookmark"]) {
		expect(vanillaCss, `vanilla css missing ${sel}`).toContain(sel.slice(1));
		expect(reactCss, `react css missing ${sel}`).toContain(sel.slice(1));
	}
	// The react entry must be complete without a second import.
	for (const sel of [".flipbook-toolbar", "toc"]) {
		expect(reactCss, `react css missing ${sel}`).toContain(sel);
	}
});

test("packed react stylesheet actually styles flipbook markup in-browser", async ({ page }) => {
	const nm = installPackedPackages();
	const css = exportedCss(nm, "html-flip-book-react", "./styles.css");
	await page.setContent(`<style>${css}</style>
		<div class="flipbook" style="height:600px">
			<div class="page" data-page-index="1" style="inset:0">
				<div class="flipbook-page-scrollport">
					<div class="flipbook-page-content"><div class="flipbook-page-bounded"></div></div>
				</div>
			</div>
			<div class="flipbook-bookmarks"><div class="flipbook-bookmark">x</div></div>
		</div>`);
	const metrics = await page.evaluate(() => ({
		pageContain: getComputedStyle(document.querySelector(".page")).contain,
		portOverflow: getComputedStyle(document.querySelector(".flipbook-page-scrollport")).overflowY,
		boundedHeight: document.querySelector(".flipbook-page-bounded").clientHeight,
		contentHeight: document.querySelector(".flipbook-page-content").clientHeight,
		bookmarkCursor: getComputedStyle(document.querySelector(".flipbook-bookmark")).cursor,
	}));
	// `layout style paint` serializes as the `content` shorthand.
	expect(metrics.pageContain).toBe("content");
	expect(metrics.portOverflow).toBe("auto");
	expect(metrics.boundedHeight).toBe(metrics.contentHeight);
	expect(metrics.bookmarkCursor).toBe("pointer");
});
