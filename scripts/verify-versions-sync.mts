#!/usr/bin/env npx tsx
/**
 * Verifies that all package.json versions are in sync.
 * Used as a pre-commit hook to ensure consistent versioning.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

interface PackageJson {
	version: string;
}

function getVersion(relativePath: string): string {
	const fullPath = join(rootDir, relativePath);
	const content = readFileSync(fullPath, "utf-8");
	const pkg: PackageJson = JSON.parse(content);
	return pkg.version;
}

const packages = [
	{ name: "base", path: "base/package.json" },
	{ name: "react", path: "react/package.json" },
	{ name: "example", path: "react/example/package.json" },
];

const versions = packages.map((pkg) => ({
	...pkg,
	version: getVersion(pkg.path),
}));

const baseVersion = versions[0].version;
const mismatches = versions.filter((v) => v.version !== baseVersion);

if (mismatches.length > 0) {
	console.error("❌ Version mismatch detected!");
	console.error("");
	for (const pkg of versions) {
		const icon = pkg.version === baseVersion ? "✓" : "✗";
		console.error(`  ${icon} ${pkg.name}: ${pkg.version}`);
	}
	console.error("");
	console.error("All package.json versions must be identical.");
	process.exit(1);
}

console.log(`✅ All package versions in sync: ${baseVersion}`);
