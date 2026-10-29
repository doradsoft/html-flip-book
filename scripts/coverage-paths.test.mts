import { describe, expect, it } from "vitest";
import { isLibraryCoverageSource, libraryCoveragePath } from "./coverage-paths.mts";

describe("library coverage paths", () => {
	it.each([
		"/work/node_modules/another/base/src/leaf.ts",
		"C:\\work\\node_modules\\another\\react\\src\\FlipBook.tsx",
		"http://localhost:5173/@fs/C:/work/node_modules/another/base/src/leaf.ts?t=123",
	])("keeps vendor sources excluded after normalization: %s", (input) => {
		expect(isLibraryCoverageSource(libraryCoveragePath(input))).toBe(false);
	});
	it("does not map a vendor source URL into a first-party generated directory", () => {
		const result = libraryCoveragePath("leaf.ts", {
			url: "file:///work/node_modules/another/base/src/leaf.ts",
			distFile: "base/src/bundle.js",
		});
		expect(isLibraryCoverageSource(result)).toBe(false);
	});
	it("resolves basename-only sourcemap sources beside the generated module", () => {
		expect(libraryCoveragePath("FlipBook.tsx", { distFile: "react/src/FlipBook.tsx" })).toBe("react/src/FlipBook.tsx");
		expect(libraryCoveragePath("leaf.ts", { distFile: "C:\\repo\\base\\src\\flipbook.ts" })).toBe("base/src/leaf.ts");
	});
	it("prefers an original source URL and removes transform queries", () => {
		expect(libraryCoveragePath("leaf.ts", { url: "file:///repo/base/src/leaf.ts" })).toBe("base/src/leaf.ts");
		expect(libraryCoveragePath("base/src/leaf.ts?v=123")).toBe("base/src/leaf.ts");
	});
	it.each([
		["base/src/leaf.ts", "base/src/leaf.ts"],
		["/home/runner/work/repo/base/src/leaf.ts", "base/src/leaf.ts"],
		["C:\\work\\repo\\react\\src\\FlipBook.tsx", "react/src/FlipBook.tsx"],
		["http://localhost:5173/@fs/C:/work/repo/react/src/FlipBook.tsx", "react/src/FlipBook.tsx"],
	])("normalizes %s", (input, expected) => {
		expect(libraryCoveragePath(input)).toBe(expected);
		expect(isLibraryCoverageSource(input)).toBe(true);
	});
	it.each([
		"react/example/src/App.tsx",
		"node_modules/react/index.js",
		"/work/node_modules/another/base/src/leaf.ts",
		"base/src/__tests__/leaf.test.ts",
		"base/src/pages.scss",
	])("excludes non-library runtime source %s", (input) => {
		expect(isLibraryCoverageSource(input)).toBe(false);
	});
});
