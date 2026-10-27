/**
 * Release script that automates:
 * 1. Moving [Unreleased] changelog entries to a versioned section
 * 2. Updating the version in package.json files
 * 3. Creating a git tag
 *
 * Usage: node scripts/release.mts [patch|minor|major|prerelease]
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import semver from "semver";

const rootDir = join(import.meta.dirname, "..");

type ReleaseType = "patch" | "minor" | "major" | "prerelease";

function getCurrentVersion(): string {
	const packageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf-8"));
	return packageJson.version;
}

function writePackageJson(pkgPath: string, packageJson: Record<string, unknown>): void {
	// Manifests keep a blank line after "version" — restore it since
	// JSON.stringify collapses separators.
	const text = `${JSON.stringify(packageJson, null, "\t")}\n`.replace(
		/("version": "[^"]+",)\n(\t")/,
		"$1\n\n$2",
	);
	writeFileSync(pkgPath, text);
}

function getNextVersion(releaseType: ReleaseType): string {
	const rootPkgPath = join(rootDir, "package.json");
	const packageJson = JSON.parse(readFileSync(rootPkgPath, "utf-8"));
	const next = semver.inc(packageJson.version, releaseType);
	if (!next) {
		throw new Error(`Cannot bump ${packageJson.version} as ${releaseType}`);
	}
	packageJson.version = next;
	writePackageJson(rootPkgPath, packageJson);
	return next;
}

function updateChangelog(version: string): void {
	const changelogPath = join(rootDir, "CHANGELOG.md");
	let changelog = readFileSync(changelogPath, "utf-8");

	const today = new Date().toISOString().split("T")[0];

	// Check if there are any entries under [Unreleased]
	const unreleasedMatch = changelog.match(/## \[Unreleased\]\n([\s\S]*?)(?=\n---|\n## \[)/);
	if (!unreleasedMatch || !unreleasedMatch[1].trim()) {
		console.warn("⚠️  No unreleased changes found in CHANGELOG.md");
	}

	// Replace [Unreleased] header with versioned header and add new [Unreleased] section
	const newUnreleasedSection = `## [Unreleased]

### Added

- None

### Fixed

- None

### Changed

- None

### Breaking Changes

- None

### Engineering

- None

---

## [${version}] - ${today}`;

	changelog = changelog.replace("## [Unreleased]", newUnreleasedSection);

	writeFileSync(changelogPath, changelog);
	console.log(`✅ Updated CHANGELOG.md with version ${version}`);
}

function syncPackageVersions(version: string): void {
	const packages = ["base/package.json", "react/package.json", "react/example/package.json"];

	for (const pkg of packages) {
		const pkgPath = join(rootDir, pkg);
		const packageJson = JSON.parse(readFileSync(pkgPath, "utf-8"));
		packageJson.version = version;
		writePackageJson(pkgPath, packageJson);
		console.log(`✅ Updated ${pkg} to version ${version}`);
	}

	// Keep workspace entries in the root lockfile consistent with the manifests.
	execSync("bun install --lockfile-only", { cwd: rootDir });
	console.log("✅ Synced bun.lock workspace versions");
}

function createGitCommitAndTag(version: string): void {
	execSync("git add -A", { cwd: rootDir });
	execSync(`git commit -m "chore: release v${version}"`, { cwd: rootDir });
	execSync(`git tag -a v${version} -m "Release v${version}"`, { cwd: rootDir });
	console.log(`✅ Created git commit and tag v${version}`);
}

function main(): void {
	const releaseType = (process.argv[2] as ReleaseType) || "prerelease";

	if (!["patch", "minor", "major", "prerelease"].includes(releaseType)) {
		console.error("❌ Invalid release type. Use: patch, minor, major, or prerelease");
		process.exit(1);
	}

	const currentVersion = getCurrentVersion();
	console.log(`📦 Current version: ${currentVersion}`);

	const nextVersion = getNextVersion(releaseType);
	console.log(`🚀 Releasing version: ${nextVersion}`);

	updateChangelog(nextVersion);
	syncPackageVersions(nextVersion);
	createGitCommitAndTag(nextVersion);

	console.log(`
✨ Release v${nextVersion} complete!

Next steps:
  git push origin master --tags
  npm publish --access public --provenance (in base/ and react/ directories)
`);
}

main();
