import { execSync } from "node:child_process";
import * as fs from "node:fs";
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
 * dist/html-flip-book.css).
 */

const repoRoot = process.cwd();

const requiredArtifacts = [
	"base/dist/flipbook.js",
	"base/dist/style.css",
	"react/dist/flip-book.js",
	"react/dist/toolbar/index.js",
	"react/dist/assets/html-flip-book.css",
];

interface PackedPkg {
	name: string;
	dir: string; // extracted package root (contains package.json + dist/)
	exports: Record<string, unknown>;
}

function ensureBuilt(): void {
	if (requiredArtifacts.every((f) => fs.existsSync(path.join(repoRoot, f)))) return;
	execSync("npm run build", { cwd: repoRoot, stdio: "inherit" });
}

function packAndExtract(pkgDir: string, tmpRoot: string): PackedPkg {
	const before = new Set(fs.readdirSync(tmpRoot));
	execSync(`npm pack --pack-destination "${tmpRoot}"`, { cwd: pkgDir, stdio: "pipe" });
	const tgz = [...fs.readdirSync(tmpRoot)].find((f) => f.endsWith(".tgz") && !before.has(f));
	if (!tgz) throw new Error(`npm pack produced no tarball for ${pkgDir}`);
	const dest = fs.mkdtempSync(path.join(tmpRoot, "extract-"));
	execSync(`tar -xzf "${path.join(tmpRoot, tgz)}" -C "${dest}"`);
	const dir = path.join(dest, "package");
	const manifest = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
	return { name: manifest.name, dir, exports: manifest.exports ?? {} };
}

/** Flatten an exports-map entry into every conditional file target. */
function exportTargets(value: unknown): string[] {
	if (typeof value === "string") return [value];
	if (value && typeof value === "object")
		return Object.values(value).flatMap((v) => exportTargets(v));
	return [];
}

const MIME: Record<string, string> = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".map": "application/json",
};

test.describe.configure({ mode: "serial" });

// Dev hosts on musl libc (Alpine) cannot run Playwright's bundled chromium;
// HFB_CHROMIUM=/usr/bin/chromium points at a system build instead.
test.use({
	launchOptions: process.env.HFB_CHROMIUM ? { executablePath: process.env.HFB_CHROMIUM } : {},
});

let tmpRoot: string;
let fixtureModules: string;
const packed: PackedPkg[] = [];

test.beforeAll(() => {
	ensureBuilt();
	tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hfb-pack-"));
	fixtureModules = path.join(tmpRoot, "fixture", "node_modules");
	fs.mkdirSync(fixtureModules, { recursive: true });
	for (const pkgDir of ["base", "react"]) {
		const pkg = packAndExtract(path.join(repoRoot, pkgDir), tmpRoot);
		packed.push(pkg);
		fs.renameSync(pkg.dir, path.join(fixtureModules, pkg.name));
		pkg.dir = path.join(fixtureModules, pkg.name);
	}
	// Transitive deps the packed bundles import at runtime/build time.
	for (const dep of ["react", "react-dom", "hammerjs", "throttle-debounce", "type-fest"]) {
		fs.symlinkSync(path.join(repoRoot, "node_modules", dep), path.join(fixtureModules, dep), "dir");
	}
});

test.afterAll(() => {
	fs.rmSync(tmpRoot, { recursive: true, force: true });
});

test("every exports-map target exists in the packed tarball", () => {
	for (const pkg of packed) {
		for (const target of Object.values(pkg.exports).flatMap(exportTargets)) {
			const file = path.join(pkg.dir, target);
			expect(fs.existsSync(file), `${pkg.name} export "${target}" missing from tarball`).toBe(true);
		}
	}
});

test("every documented specifier resolves from a clean fixture", () => {
	// The packages ship ESM-only exports, so resolution must run through
	// import.meta.resolve anchored inside the fixture (a CJS require.resolve
	// cannot see "import"-conditioned export entries).
	const checker = path.join(tmpRoot, "fixture", "resolve-check.mjs");
	fs.writeFileSync(
		checker,
		`import { fileURLToPath } from "node:url";
const specs = [
  "html-flip-book-vanilla",
  "html-flip-book-vanilla/commands",
  "html-flip-book-vanilla/download",
  "html-flip-book-vanilla/intl",
  "html-flip-book-vanilla/store",
  "html-flip-book-vanilla/style.css",
  "html-flip-book-react",
  "html-flip-book-react/toolbar",
  "html-flip-book-react/styles.css",
];
for (const s of specs) {
  try {
    console.log(s + " -> " + fileURLToPath(import.meta.resolve(s)));
  } catch (e) {
    console.log(s + " -> ERROR " + e.code);
  }
}
`,
	);
	const out = execSync(`node "${checker}"`).toString();
	for (const line of out.trim().split("\n")) {
		const [spec, resolved] = line.split(" -> ");
		expect(resolved, `${spec} failed to resolve`).not.toMatch(/^ERROR/);
		expect(fs.existsSync(resolved), `${spec} resolved to missing file ${resolved}`).toBe(true);
	}
});

test("react styles.css is a complete stylesheet", () => {
	const css = fs.readFileSync(
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
	const fixtureDir = path.join(tmpRoot, "fixture");
	fs.writeFileSync(
		path.join(fixtureDir, "index.html"),
		`<!doctype html><html><head><style>
.book-wrap { display: flex; flex-direction: column; }
.book-wrap > .flipbook { flex: 1; min-height: 0; }
</style></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>`,
	);
	fs.writeFileSync(
		path.join(fixtureDir, "main.tsx"),
		`import { createRoot } from "react-dom/client";
import { FlipBook, TocPage } from "html-flip-book-react";
import { Toolbar, PrevButton, NextButton, PageIndicator, DownloadDropdown } from "html-flip-book-react/toolbar";
import "html-flip-book-react/styles.css";
import { createElement, useRef } from "react";

function Book({ direction }: { direction: "ltr" | "rtl" }) {
	const ref = useRef(null);
	const total = 5;
	const content = [2, 3, 4].map((n) =>
		createElement("div", { key: n, className: "fixture-page" }, "Page " + n),
	);
	const pages = [
		createElement("div", { key: "cover", className: "fixture-cover" }, "Cover"),
		createElement(TocPage, {
			key: "toc",
			onNavigate: (i: number) => (ref.current as any)?.jumpToPage?.(i),
			totalPages: total,
			direction,
		}),
		...content,
		createElement("div", { key: "back", className: "fixture-cover" }, "Back"),
	];
	return createElement(
		"div",
		{ className: "book-wrap", "data-dir": direction, style: { width: 600, height: 400, direction } },
		createElement(FlipBook, {
			ref,
			pages,
			// The wrapper selects its container by the first class token, so
			// each book on the page needs a unique className.
			className: "fixture-book-" + direction,
			direction,
			enableHistory: false,
		}),
		createElement(
			Toolbar,
			{ flipBookRef: ref, direction },
			createElement(PrevButton, null),
			createElement(PageIndicator, null),
			createElement(NextButton, null),
			createElement(DownloadDropdown, null),
		),
	);
}

createRoot(document.getElementById("root")!).render(
	createElement(
		"div",
		null,
		createElement(Book, { direction: "ltr" }),
		createElement(Book, { direction: "rtl" }),
	),
);
`,
	);
	fs.writeFileSync(
		path.join(fixtureDir, "vite.config.mjs"),
		`export default {
  root: ${JSON.stringify(fixtureDir)},
  esbuild: { jsx: "automatic" },
  resolve: { dedupe: ["react", "react-dom", "react/jsx-runtime"] },
  build: { outDir: ${JSON.stringify(path.join(fixtureDir, "dist"))}, emptyOutDir: true },
  logLevel: "warn",
};
`,
	);
	execSync(`npx vite build --config "${path.join(fixtureDir, "vite.config.mjs")}"`, {
		cwd: repoRoot,
		stdio: "inherit",
	});

	const distDir = path.join(fixtureDir, "dist");
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
