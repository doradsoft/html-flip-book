#!/usr/bin/env node
/**
 * Version verification script.
 * Ensures all package.json versions are in sync.
 *
 * Release versions are derived from git tags (scripts/next-version.mts), so
 * pull requests no longer bump the manifests — only the sync invariant is
 * enforced here, as a pre-commit hook and in CI.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

interface PackageJson {
	version: string;
}

const PACKAGES = [
	{ name: "root", path: "package.json" },
	{ name: "base", path: "base/package.json" },
	{ name: "react", path: "react/package.json" },
	{ name: "example", path: "react/example/package.json" },
];

/**
 * Get the version from a package.json file
 */
function getVersion(relativePath: string): string {
	const fullPath = join(rootDir, relativePath);
	const content = readFileSync(fullPath, "utf-8");
	const pkg: PackageJson = JSON.parse(content);
	return pkg.version;
}

/**
 * Verify all package.json versions are in sync
 */
function verifyVersionsSync(): boolean {
	console.log("\n📦 Version Sync Check");
	console.log("---------------------");

	const versions = PACKAGES.map((pkg) => ({
		...pkg,
		version: getVersion(pkg.path),
	}));

	const baseVersion = versions[0].version;
	const mismatches = versions.filter((v) => v.version !== baseVersion);

	for (const pkg of versions) {
		const icon = pkg.version === baseVersion ? "✓" : "✗";
		console.log(`   ${icon} ${pkg.name}: ${pkg.version}`);
	}

	if (mismatches.length > 0) {
		console.error("\n   ❌ Version mismatch detected!");
		console.error("   All package.json versions must be identical.");
		return false;
	}

	console.log("   ✅ All versions in sync");
	return true;
}

function main(): void {
	console.log("🔍 Version Verification");
	console.log("========================");

	const passed = verifyVersionsSync();

	console.log("\n========================");
	if (passed) {
		console.log("✅ All version checks passed!");
		process.exit(0);
	} else {
		console.log("❌ Some version checks failed!");
		process.exit(1);
	}
}

main();
