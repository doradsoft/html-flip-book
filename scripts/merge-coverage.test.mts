import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mergeCoverageReports } from "./merge-coverage.mts";

const lcov = (source: string, hits = 1) => `TN:\nSF:${source}\nDA:1,${hits}\nLF:1\nLH:${hits ? 1 : 0}\nend_of_record\n`;
let root: string;
function report(relative: string, content: string) {
	const target = join(root, relative);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, content);
}
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "flipbook-coverage-")); });
afterEach(() => {
	if (!resolve(root).startsWith(resolve(tmpdir(), "flipbook-coverage-"))) throw new Error("Unsafe test cleanup path");
	rmSync(root, { recursive: true, force: true });
});

describe("required browser coverage", () => {
	it("rejects unit-only coverage", () => {
		report("unit/lcov.info", lcov("base/src/leaf.ts"));
		expect(() => mergeCoverageReports(root)).toThrow(/E2E coverage/);
	});
	it("rejects missing unit coverage", () => {
		report("e2e/lcov.info", lcov("react/src/FlipBook.tsx"));
		expect(() => mergeCoverageReports(root)).toThrow(/Unit coverage/);
	});
	it.each(["", "TN:\nend_of_record\n", lcov("node_modules/react/index.js"), lcov("base/src/leaf.ts", 0)])("rejects unusable browser report %j", (content) => {
		report("unit/lcov.info", lcov("base/src/leaf.ts"));
		report("e2e/lcov.info", content);
		expect(() => mergeCoverageReports(root)).toThrow(/covered library source/);
	});
	it("rejects a missing expected shard even when another report exists", () => {
		report("unit/lcov.info", lcov("base/src/leaf.ts"));
		report("e2e/e2e-coverage-1/lcov.info", lcov("react/src/FlipBook.tsx"));
		expect(() => mergeCoverageReports(root, 2)).toThrow(/shard 2/);
	});
	it("merges useful flat local browser coverage with unit coverage", () => {
		report("unit/lcov.info", lcov("base/src/leaf.ts"));
		report("e2e/lcov.info", lcov("react/src/FlipBook.tsx"));
		expect(readFileSync(mergeCoverageReports(root), "utf8")).toContain("SF:react/src/FlipBook.tsx");
	});
	it("requires and merges every expected shard report", () => {
		report("unit/lcov.info", lcov("base/src/leaf.ts"));
		for (const shard of [1, 2, 3]) report(`e2e/e2e-coverage-${shard}/lcov.info`, lcov(`react/src/shard${shard}.tsx`));
		const content = readFileSync(mergeCoverageReports(root, 3), "utf8");
		for (const shard of [1, 2, 3]) expect(content).toContain(`SF:react/src/shard${shard}.tsx`);
	});
	it.each([0, -1, 1.5, Number.NaN])("rejects invalid expected shard count %s", (shards) => {
		expect(() => mergeCoverageReports(root, shards)).toThrow(/shard count/);
	});
});
