import { execSync } from "node:child_process";
import { access, mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Artifact-level package test (issue #276): the published tarballs must make
 * every documented `exports` path resolvable in a clean consumer fixture with
 * no monorepo source aliases, and `html-flip-book-react/styles.css` must be a
 * complete stylesheet (core pages/folds/covers/scrollports, bookmarks, TOC,
 * toolbar) — not just the react-only rules.
 *
 * Runs against `npm pack` output of the real build, so it catches export-map
 * entries pointing at files Vite never emits (e.g. dist/style.css vs
 * dist/html-flip-book.css). The packed tarballs are extracted into
 * e2e/fixtures/packed-book/node_modules so the static fixture files resolve
 * the packed artifacts while react/react-dom fall through to the workspace.
 */

const repoRoot = process.cwd();
const fixtureDir = path.join(repoRoot, "e2e", "fixtures", "packed-book");
const fixtureModules = path.join(fixtureDir, "node_modules");

// Dev hosts on musl libc (Alpine) cannot run Playwright's bundled chromium;
// HFB_CHROMIUM=/usr/bin/chromium points at a system build instead.
test.use({
	launchOptions: process.env.HFB_CHROMIUM ? { executablePath: process.env.HFB_CHROMIUM } : {},
});

test.describe.configure({ mode: "serial" });

const requiredArtifacts = [
	"base/dist/flipbook.js",
	"base/dist/style.css",
	"react/dist/flip-book.js",
	"react/dist/toolbar/index.js",
	"react/dist/assets/html-flip-book.css",
];

interface PackedPkg {
	name: string;
	dir: string; // extracted package root inside fixture node_modules
	exports: Record<string, unknown>;
}

const MIME: Record<string, string> = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".map": "application/json",
};

async function exists(p: string): Promise<boolean> {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}

async function ensureBuilt(): Promise<void> {
	const all = await Promise.all(requiredArtifacts.map((f) => exists(path.join(repoRoot, f))));
	if (all.every(Boolean)) return;
	execSync("npm run build", { cwd: repoRoot, stdio: "inherit" });
}

/** Flatten an exports-map entry into every conditional file target. */
function exportTargets(value: unknown): string[] {
	if (typeof value === "string") return [value];
	if (value && typeof value === "object")
		return Object.values(value).flatMap((v) => exportTargets(v));
	return [];
}

async function packAndExtract(pkgDir: string, tmpRoot: string): Promise<PackedPkg> {
	const before = new Set(await readdir(tmpRoot));
	execSync(`npm pack --pack-destination "${tmpRoot}"`, { cwd: pkgDir, stdio: "pipe" });
	const tgz = (await readdir(tmpRoot)).find((f) => f.endsWith(".tgz") && !before.has(f));
	if (!tgz) throw new Error(`npm pack produced no tarball for ${pkgDir}`);
	const dest = await mkdtemp(path.join(tmpRoot, "extract-"));
	execSync(`tar -xzf "${path.join(tmpRoot, tgz)}" -C "${dest}"`);
	const dir = path.join(dest, "package");
	const manifest = JSON.parse(await readFile(path.join(dir, "package.json"), "utf-8"));
	return { name: manifest.name, dir, exports: manifest.exports ?? {} };
}

let tmpRoot: string;
const packed: PackedPkg[] = [];

test.beforeAll(async () => {
	await ensureBuilt();
	tmpRoot = await mkdtemp(path.join(os.tmpdir(), "hfb-pack-"));
	await rm(fixtureModules, { recursive: true, force: true });
	await mkdir(fixtureModules, { recursive: true });
	for (const pkgDir of ["base", "react"]) {
		const pkg = await packAndExtract(path.join(repoRoot, pkgDir), tmpRoot);
		const target = path.join(fixtureModules, pkg.name);
		await mkdir(path.dirname(target), { recursive: true });
		execSync(`mv "${pkg.dir}" "${target}"`);
		pkg.dir = target;
		packed.push(pkg);
	}
});

test.afterAll(async () => {
	await rm(tmpRoot, { recursive: true, force: true });
	await rm(fixtureModules, { recursive: true, force: true });
});

test("every exports-map target exists in the packed tarball", async () => {
	for (const pkg of packed) {
		for (const target of Object.values(pkg.exports).flatMap(exportTargets)) {
			const file = path.join(pkg.dir, target);
			expect(await exists(file), `${pkg.name} export "${target}" missing from tarball`).toBe(true);
		}
	}
});

test("every documented specifier resolves from a clean fixture", async () => {
	// The packages ship ESM-only exports, so resolution must run through
	// import.meta.resolve anchored inside the fixture (a CJS require.resolve
	// cannot see "import"-conditioned export entries).
	const out = execSync(`node "${path.join(fixtureDir, "resolve-check.mjs")}"`, {
		cwd: fixtureDir,
	}).toString();
	for (const line of out.trim().split("\n")) {
		const [spec, resolved] = line.split(" -> ");
		expect(resolved, `${spec} failed to resolve`).not.toMatch(/^ERROR/);
		expect(await exists(resolved), `${spec} resolved to missing file ${resolved}`).toBe(true);
	}
});

test("react styles.css is a complete stylesheet", async () => {
	const css = await readFile(
		path.join(fixtureModules, "html-flip-book-react", "dist/assets/html-flip-book.css"),
		"utf-8",
	);
	// Core mechanics previously only available via html-flip-book-vanilla/style.css.
	for (const marker of [
		".flipbook-page-scrollport",
		".page--cover-interior",
		".flipbook-bookmarks",
		".flipbook--select-text",
	]) {
		expect(css, `react styles.css missing core rule ${marker}`).toContain(marker);
	}
	// React-specific chrome that was already bundled.
	for (const marker of [".flipbook-toolbar", ".toc-page", ".flipbook-toolbar-download-menu"]) {
		expect(css, `react styles.css missing ${marker}`).toContain(marker);
	}
});

test("packed packages render LTR and RTL books with toolbar", async ({ page }) => {
	test.setTimeout(120_000);
	const distDir = path.join(tmpRoot, "fixture-dist");
	execSync(
		`npx vite build --config "${path.join(fixtureDir, "vite.config.mts")}" --outDir "${distDir}"`,
		{ cwd: fixtureDir, stdio: "inherit" },
	);

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
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));
	await page.goto("http://packed.local/", { waitUntil: "domcontentloaded" });
	for (const dir of ["ltr", "rtl"]) {
		const wrap = page.locator(`.book-wrap[data-dir="${dir}"]`);
		await expect(wrap.locator(".flipbook")).toBeVisible();
		await expect(wrap.locator(".page").first()).toBeVisible();
		await expect(wrap.locator(".flipbook-toolbar")).toBeVisible();
		await expect(wrap.locator(".toc-page")).toBeAttached();
		// Scrollport overflow is a stylesheet-only rule: proves pages.scss
		// reached the consumer through html-flip-book-react/styles.css.
		await expect(wrap.locator(".flipbook-page-scrollport").first()).toHaveCSS("overflow", "auto");
		// Toolbar menu styling comes from the packed stylesheet, not inline styles.
		await wrap.locator(".flipbook-toolbar-download-trigger").click();
		await expect(wrap.locator(".flipbook-toolbar-download-menu")).toBeVisible();
	}
	expect(pageErrors).toEqual([]);
});
