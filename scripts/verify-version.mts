#!/usr/bin/env npx tsx
/**
 * Unified version verification script.
 * Performs two checks:
 * 1. All package.json versions are in sync
 * 2. Current version is greater than the latest released version
 *
 * Used as a pre-commit hook and in CI to ensure proper versioning.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";

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
 * Get the latest released version from git tags.
 * Returns null if no releases exist.
 */
function getReleasedVersion(): string | null {
	try {
		const result = execSync('git tag -l "v*" --sort=-v:refname', {
			encoding: "utf-8",
			cwd: rootDir,
			stdio: ["pipe", "pipe", "pipe"],
		});
		const tags = result.trim().split("\n").filter(Boolean);
		if (tags.length === 0) {
			return null;
		}
		// Remove 'v' prefix from tag
		return tags[0].replace(/^v/, "");
	} catch {
		return null;
	}
}

/**
 * Verify all package.json versions are in sync
 */
function verifyVersionsSync(): { passed: boolean; baseVersion: string } {
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
		return { passed: false, baseVersion };
	}

	console.log("   ✅ All versions in sync");
	return { passed: true, baseVersion };
}

/**
 * Verify current version is greater than released version
 */
function verifyVersionBump(currentVersion: string): boolean {
	console.log("\n🚀 Version Bump Check");
	console.log("---------------------");
	console.log(`   Current version: ${currentVersion}`);

	const releasedVersion = getReleasedVersion();
	if (!releasedVersion) {
		console.log("   ✅ No previous release found - version check passed");
		return true;
	}
	console.log(`   Released version: ${releasedVersion}`);

	const current = semver.parse(currentVersion);
	const released = semver.parse(releasedVersion);

	if (!current) {
		console.error(
			`   ❌ ERROR: Invalid current version format: ${currentVersion}`,
		);
		return false;
	}
	if (!released) {
		console.error(
			`   ❌ ERROR: Invalid released version format: ${releasedVersion}`,
		);
		return false;
	}

	if (semver.gt(current, released)) {
		console.log(
			`   ✅ Version ${currentVersion} is greater than released version ${releasedVersion}`,
		);
		return true;
	}

	console.error(
		`   ❌ ERROR: Version ${currentVersion} is NOT greater than released version ${releasedVersion}`,
	);
	console.error("   Please bump the version before committing.");
	console.error("   Run in base/: npm version patch (or minor/major/prerelease)");
	return false;
}

function main(): void {
	console.log("🔍 Version Verification");
	console.log("========================");

	const syncResult = verifyVersionsSync();
	const bumpPassed = verifyVersionBump(syncResult.baseVersion);

	console.log("\n========================");
	if (syncResult.passed && bumpPassed) {
		console.log("✅ All version checks passed!");
		process.exit(0);
	} else {
		console.log("❌ Some version checks failed!");
		process.exit(1);
	}
}

main();
