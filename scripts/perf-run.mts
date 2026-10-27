import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildReport, writeReport } from "../perf/harness/report.mts";
import { serveDirectory } from "../perf/harness/serve.mts";

/**
 * Benchmark orchestrator (issue #289).
 *
 *   node scripts/perf-run.mts                     # head only (local smoke)
 *   node scripts/perf-run.mts --base <sha>        # paired base/head comparison
 *   node scripts/perf-run.mts --base HEAD         # A/A calibration run
 *   node scripts/perf-run.mts --pairs 20 --skip-build
 *
 * Both revisions are built from their own worktrees and lockfiles, served
 * as static production builds on fixed ports, and sampled by the perf
 * Playwright suite in balanced alternating pair order. Build/install time
 * never enters the timed samples.
 */
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BUILDS = join(ROOT, "perf", ".builds");
const RESULTS = join(ROOT, "perf-results");
const BASE_PORT = 4101;
const HEAD_PORT = 4102;

interface Args {
	base?: string;
	pairs: number;
	skipBuild: boolean;
}

function parseArgs(argv: string[]): Args {
	const args: Args = { pairs: 10, skipBuild: false };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--base") args.base = argv[++i];
		else if (a === "--pairs") args.pairs = Number(argv[++i]);
		else if (a === "--skip-build") args.skipBuild = true;
	}
	if (!Number.isInteger(args.pairs) || args.pairs < 1) {
		throw new Error(`--pairs must be a positive integer, got ${argv.join(" ")}`);
	}
	return args;
}

function run(command: string, args: string[], cwd: string): void {
	const win = process.platform === "win32";
	const result = spawnSync(command, args, {
		cwd,
		stdio: "inherit",
		shell: win, // npm/npx resolve through .cmd shims on Windows
	});
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed in ${cwd} (exit ${result.status})`);
	}
}

function git(args: string[]): string {
	const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf-8" });
	if (result.status !== 0) {
		throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
	}
	return result.stdout.trim();
}

function resolveSha(ref: string): string {
	if (!/^[0-9a-zA-Z._~^/-]+$/.test(ref)) {
		throw new Error(`invalid git ref: ${ref}`);
	}
	return git(["rev-parse", "--verify", `${ref}^{commit}`]);
}

function buildExample(worktreeDir: string, outDir: string): void {
	run("npm", ["ci"], worktreeDir);
	run("npm", ["run", "build"], worktreeDir);
	run("npm", ["run", "build:example"], worktreeDir);
	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });
	cpSync(join(worktreeDir, "react", "example", "dist"), outDir, { recursive: true });
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const headSha = git(["rev-parse", "HEAD"]);
	const baseSha = args.base ? resolveSha(args.base) : "";

	mkdirSync(RESULTS, { recursive: true });

	const headDist = join(BUILDS, "head");
	if (!args.skipBuild) buildExample(ROOT, headDist);
	if (!existsSync(join(headDist, "index.html"))) {
		throw new Error(`no head build at ${headDist} — run without --skip-build`);
	}

	const baseSrc = join(BUILDS, "base-src");
	const baseDist = join(BUILDS, "base");
	try {
		if (baseSha) {
			git(["worktree", "add", "--detach", baseSrc, baseSha]);
			// The base builds with its own package-lock.json — the whole point
			// of comparing immutable revisions.
			buildExample(baseSrc, baseDist);
		}

		const servers = [await serveDirectory(headDist, HEAD_PORT)];
		if (baseSha) servers.push(await serveDirectory(baseDist, BASE_PORT));
		console.log(`serving head@${headSha.slice(0, 12)} → :${HEAD_PORT}`);
		if (baseSha) console.log(`serving base@${baseSha.slice(0, 12)} → :${BASE_PORT}`);

		const env = {
			...process.env,
			PERF_HEAD_URL: `http://127.0.0.1:${HEAD_PORT}`,
			PERF_BASE_URL: baseSha ? `http://127.0.0.1:${BASE_PORT}` : "",
			PERF_PAIRS: String(args.pairs),
		};
		// Async spawn — spawnSync would block the event loop and starve the
		// servers above (they live in this process for the whole test run).
		const status = await new Promise<number>((resolve) => {
			const test = spawn("npx", ["playwright", "test", "-c", "playwright.perf.config.ts"], {
				cwd: ROOT,
				env,
				stdio: "inherit",
				shell: process.platform === "win32",
			});
			test.on("close", (code) => resolve(code ?? 1));
		});
		for (const server of servers) server.close();
		if (status !== 0) process.exit(status);

		const report = buildReport(join(RESULTS, "samples.json"), { baseSha, headSha });
		const markdown = writeReport(report, RESULTS);
		console.log(`\n${markdown}\n`);
		if (process.env.GITHUB_STEP_SUMMARY) {
			const { appendFileSync } = await import("node:fs");
			appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
		}
		console.log(`outcome: ${report.outcome}`);
	} finally {
		// Always release the scratch worktree — it holds a nested checkout.
		if (existsSync(baseSrc)) {
			git(["worktree", "remove", "--force", baseSrc]);
			// node_modules and build output are untracked, so the worktree
			// removal can leave the directory itself behind.
			rmSync(baseSrc, { recursive: true, force: true });
		}
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
