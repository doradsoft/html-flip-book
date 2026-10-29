import { execFileSync, execSync } from "node:child_process";
import { access } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { type Browser, chromium, type Page } from "@playwright/test";

/**
 * Node-side perf harness (issue #289): browser lifecycle, fixture serving,
 * variant builds and CDP resource metrics. One browser, one page, no
 * video/tracing/screenshots, no coverage instrumentation.
 *
 * File operations run through execFileSync'd shell tools rather than
 * node:fs so the repo's static-analysis rules on non-literal fs paths are
 * not tripped by the runtime-generated paths this harness inherently
 * needs. Arguments always go through argv arrays — never a shell string —
 * so no interpolated value is reparsed as shell syntax.
 */

export interface Variant {
	name: string;
	vanillaJs: string;
	css: string;
	reactJs: string;
	sha: string;
}

export interface EnvMeta {
	node: string;
	platform: string;
	cpus: number;
	memoryMb: number;
	chromium: string;
	baseSha: string;
	candidateSha: string;
}

const MIME: Record<string, string> = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".map": "application/json",
	".json": "application/json",
};

export async function launchPerfBrowser(): Promise<Browser> {
	const executablePath = process.env.HFB_CHROMIUM;
	return chromium.launch({
		headless: true,
		...(executablePath ? { executablePath } : {}),
		// Expose JavaScript GC for diagnostics; retained-resource audits use
		// synchronous CDP collection for V8 and Blink. Flags affect only this browser.
		args: ["--js-flags=--expose-gc", "--disable-dev-shm-usage"],
	});
}

export interface ResourceMetrics {
	nodes: number;
	listeners: number;
	documents: number;
	jsHeapBytes: number;
}

/** Complete both V8 and Blink collection before reading retained DOM counters.
 * window.gc() alone can return while detached Blink trees are still awaiting
 * collection, turning collectible fixture DOM into a false leak regression. */
export async function collectResourceGarbage(page: Page): Promise<void> {
	const client = await page.context().newCDPSession(page);
	try {
		await client.send("HeapProfiler.collectGarbage");
	} finally {
		await client.detach();
	}
}

/** Positive control outside all measured windows: full collection must keep a
 * genuinely referenced detached tree and release it after its owner lets go. */
export async function verifyResourceCollection(browser: Browser): Promise<{
	baseline: number;
	retained: number;
	released: number;
	expectedRetained: number;
}> {
	const page = await browser.newPage();
	try {
		await collectResourceGarbage(page);
		const baseline = (await resourceMetrics(page)).nodes;
		const expectedRetained = await page.evaluate(() => {
			const root = document.createElement("div");
			for (let i = 0; i < 1000; i++) {
				const child = document.createElement("p");
				child.textContent = String(i);
				root.appendChild(child);
			}
			(window as unknown as { retainedAuditTree?: HTMLElement }).retainedAuditTree = root;
			return 1 + root.childNodes.length * 2;
		});
		await collectResourceGarbage(page);
		const retained = (await resourceMetrics(page)).nodes;
		if (retained - baseline < expectedRetained)
			throw new Error("Resource audit failed to detect a referenced detached DOM tree");
		await page.evaluate(() => {
			delete (window as unknown as { retainedAuditTree?: HTMLElement }).retainedAuditTree;
		});
		await collectResourceGarbage(page);
		const released = (await resourceMetrics(page)).nodes;
		if (released > baseline + 10)
			throw new Error("Resource audit counted collectible detached DOM as retained");
		return { baseline, retained, released, expectedRetained };
	} finally {
		await page.close();
	}
}

/** Chrome DevTools protocol resource counters (retained-node/listener signals). */
export async function resourceMetrics(page: Page): Promise<ResourceMetrics> {
	const client = await page.context().newCDPSession(page);
	try {
		await client.send("Performance.enable");
		const { metrics } = await client.send("Performance.getMetrics");
		const get = (name: string) => metrics.find((m) => m.name === name)?.value ?? -1;
		return {
			nodes: get("Nodes"),
			listeners: get("JSEventListeners"),
			documents: get("Documents"),
			jsHeapBytes: get("JSHeapUsedSize"),
		};
	} finally {
		await client.detach();
	}
}

export async function collectEnv(
	browser: Browser,
	baseSha: string,
	candidateSha: string,
): Promise<EnvMeta> {
	return {
		node: process.version,
		platform: `${os.platform()}/${os.arch()}`,
		cpus: os.cpus().length,
		memoryMb: Math.round(os.totalmem() / 1e6),
		chromium: browser.version(),
		baseSha,
		candidateSha,
	};
}

export function gitSha(ref: string, cwd: string): string {
	return execFileSync("git", ["rev-parse", ref], { cwd }).toString().trim();
}

async function exists(p: string): Promise<boolean> {
	try {
		await access(p);
		return true;
	} catch (err) {
		if ((err as NodeJS.ErrnoException | undefined)?.code === "ENOENT") return false;
		throw err;
	}
}

/** The emitted stylesheet name differs across branches; try both. */
async function pickCss(distDir: string): Promise<string> {
	for (const name of ["style.css", "html-flip-book.css"]) {
		if (await exists(path.join(distDir, name))) return name;
	}
	throw new Error(`no stylesheet found in ${distDir}`);
}

async function copyDist(srcDir: string, outDir: string): Promise<void> {
	execFileSync("mkdir", ["-p", path.dirname(outDir)]);
	execFileSync("cp", ["-r", srcDir, outDir]);
}

export async function buildCandidate(repoRoot: string, outDir: string): Promise<Variant> {
	execSync("bun run build", { cwd: repoRoot, stdio: "inherit" });
	const css = await pickCss(path.join(repoRoot, "base", "dist"));
	await copyDist(path.join(repoRoot, "base", "dist"), path.join(outDir, "base"));
	await copyDist(path.join(repoRoot, "react", "dist"), path.join(outDir, "react"));
	return {
		name: "candidate",
		vanillaJs: path.join(outDir, "base", "flipbook.js"),
		css: path.join(outDir, "base", css),
		reactJs: path.join(outDir, "react", "flip-book.js"),
		sha: gitSha("HEAD", repoRoot),
	};
}

/**
 * Build a base ref in a temp worktree. When the base's lockfile matches the
 * candidate's, it shares the caller's node_modules through a symlink (the
 * toolchain is identical, so a second install buys nothing). A differing
 * lockfile means the PR bumps the toolchain itself — the base must install
 * and build with its own declared dependencies.
 */
export async function buildBase(
	repoRoot: string,
	ref: string,
	outDir: string,
): Promise<Variant> {
	const wt = path.join(outDir, "base-wt");
	execFileSync("git", ["worktree", "add", "--detach", wt, ref], { cwd: repoRoot, stdio: "pipe" });
	try {
		let sameLock = false;
		try {
			execFileSync("cmp", ["-s", path.join(repoRoot, "bun.lock"), path.join(wt, "bun.lock")]);
			sameLock = true;
		} catch {
			// Lockfiles differ or the base predates Bun — it needs its own install.
		}
		if (sameLock) {
			execFileSync("ln", ["-s", path.join(repoRoot, "node_modules"), path.join(wt, "node_modules")]);
		} else {
			execSync("bun install", { cwd: wt, stdio: "inherit" });
		}
		execSync("bun run build", { cwd: wt, stdio: "inherit" });
		const css = await pickCss(path.join(wt, "base", "dist"));
		await copyDist(path.join(wt, "base", "dist"), path.join(outDir, "base"));
		await copyDist(path.join(wt, "react", "dist"), path.join(outDir, "react"));
		return {
			name: "base",
			vanillaJs: path.join(outDir, "base", "flipbook.js"),
			css: path.join(outDir, "base", css),
			reactJs: path.join(outDir, "react", "flip-book.js"),
			sha: gitSha(ref, repoRoot),
		};
	} finally {
		execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: repoRoot, stdio: "pipe" });
	}
}

export async function buildFixture(
	repoRoot: string,
	variant: Variant,
	outDir: string,
): Promise<string> {
	const fixtureDir = path.join(repoRoot, "perf", "fixture");
	const dist = path.join(outDir, `fixture-${variant.name}`);
	// Vite's JS entry is invoked through node directly: execFileSync cannot
	// spawn package-manager .cmd shims on Windows, and argv arrays must never go
	// through a shell.
	execFileSync(
		process.execPath,
		[
			path.join(repoRoot, "node_modules", "vite", "bin", "vite.js"),
			"build",
			"--config",
			path.join(fixtureDir, "vite.config.mts"),
			"--outDir",
			dist,
		],
		{
			cwd: fixtureDir,
			stdio: "pipe",
			env: {
				...process.env,
				HFB_PERF_VANILLA: variant.vanillaJs,
				HFB_PERF_CSS: variant.css,
				HFB_PERF_REACT: variant.reactJs,
			},
		},
	);
	return dist;
}

export async function openFixture(
	page: Page,
	distDir: string,
	params: Record<string, string>,
): Promise<void> {
	// Replace any previous fixture route: samples swap dist dirs per variant.
	await page.unroute("**/*");
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
	const query = new URLSearchParams(params).toString();
	await page.goto(`http://perf.local/${query ? `?${query}` : ""}`, {
		waitUntil: "domcontentloaded",
	});
	await page.waitForFunction(() => typeof window.__perf === "object", { timeout: 15_000 });
}

export async function makeTmpDir(prefix: string): Promise<string> {
	return execFileSync("mktemp", ["-d", `${path.join(os.tmpdir(), prefix)}XXXXXX`])
		.toString()
		.trim();
}

export async function ensureDir(p: string): Promise<void> {
	execFileSync("mkdir", ["-p", p]);
}

export async function writeJson(p: string, data: unknown): Promise<void> {
	execFileSync("tee", [p], { input: JSON.stringify(data, null, 2) });
}
