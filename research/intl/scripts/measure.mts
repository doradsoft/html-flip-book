/**
 * intl benchmark: builds consumer fixtures with vite (repo toolchain) and
 * reports raw/min/gzip/brotli bytes. Used for #341 baseline vs Paraglide.
 *
 * Usage: bun run research/intl/scripts/measure.mts <fixture.ts...>
 *        bun run research/intl/scripts/measure.mts --all
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, join, resolve } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "../../..");
const outRoot = join(import.meta.dirname, "../out");
const require = createRequire(`${root}/package.json`);
const { build } = require("vite") as typeof import("vite");

function sizes(code: string) {
	const raw = Buffer.byteLength(code);
	const gz = gzipSync(code, { level: 9 }).length;
	const br = brotliCompressSync(code, {
		params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
	}).length;
	return { raw, gz, br };
}

async function buildFixture(entry: string, label: string) {
	const outDir = join(outRoot, label);
	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });
	await build({
		root,
		logLevel: "silent",
		resolve: {
			alias: [
				{
					find: /^html-flip-book-vanilla$/,
					replacement: resolve(root, "base/src/flipbook.ts"),
				},
				{
					find: /^html-flip-book-vanilla\/(.*)$/,
					replacement: `${resolve(root, "base/src")}/$1`,
				},
			],
		},
		build: {
			outDir,
			emptyOutDir: true,
			minify: true,
			sourcemap: false,
			write: true,
			lib: { entry, formats: ["es"], fileName: () => "bundle.js" },
			rollupOptions: {
				external: [/^react/, /^react-dom/],
				output: { inlineDynamicImports: true },
			},
		},
	});
	// The fixtures alias the lib source directly, so nothing externalizes except react.
	const code = readFileSync(join(outDir, "bundle.js"), "utf8");
	return { label, ...sizes(code) };
}

const fixtures = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const all = process.argv.includes("--all") || fixtures.length === 0;
const dir = join(import.meta.dirname, "../fixtures");
const entries = all
	? (await import("node:fs")).readdirSync(dir)
			.filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
			.map((f) => join(dir, f))
	: fixtures.map((f) => join(dir, f));

const rows: Record<string, string | number>[] = [];
for (const entry of entries) {
	const label = basename(entry).replace(/\.(ts|tsx)$/, "");
	rows.push(await buildFixture(entry, label));
}

writeFileSync(
	join(outRoot, "measure-results.json"),
	JSON.stringify(rows, null, 2),
);
console.log("fixture                 raw(B)   gzip(B)  brotli(B)");
for (const r of rows) {
	console.log(
		`${String(r.label).padEnd(24)}${String(r.raw).padStart(8)}${String(r.gz).padStart(9)}${String(r.br).padStart(10)}`,
	);
}
