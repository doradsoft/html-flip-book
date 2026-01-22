#!/usr/bin/env npx tsx
/**
 * Verifies that the current package version is greater than the latest released version.
 * Used as a pre-commit hook to ensure version is bumped before releasing.
 *
 * Compares the version in package.json against the latest git tag (v*).
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

/**
 * Get the current version from package.json
 */
function getCurrentVersion(): string {
	const pkgPath = join(rootDir, "package.json");
	const content = readFileSync(pkgPath, "utf-8");
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

function main(): void {
	console.log("🔍 Version Verification");
	console.log("========================");

	const currentVersion = getCurrentVersion();
	console.log(`   Current version: ${currentVersion}`);

	const releasedVersion = getReleasedVersion();
	if (!releasedVersion) {
		console.log("   ✅ No previous release found - version check passed");
		process.exit(0);
	}
	console.log(`   Released version: ${releasedVersion}`);

	const current = semver.parse(currentVersion);
	const released = semver.parse(releasedVersion);

	if (!current) {
		console.error(
			`   ❌ ERROR: Invalid current version format: ${currentVersion}`,
		);
		process.exit(1);
	}
	if (!released) {
		console.error(
			`   ❌ ERROR: Invalid released version format: ${releasedVersion}`,
		);
		process.exit(1);
	}

	if (semver.gt(current, released)) {
		console.log(
			`   ✅ Version ${currentVersion} is greater than released version ${releasedVersion}`,
		);
		process.exit(0);
	}

	console.error(
		`   ❌ ERROR: Version ${currentVersion} is NOT greater than released version ${releasedVersion}`,
	);
	console.error("   Please bump the version in package.json before committing.");
	console.error(
		'   Run: npm version patch (or minor/major/prerelease) in the root directory',
	);
	process.exit(1);
}

main();
