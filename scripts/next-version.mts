#!/usr/bin/env node
/**
 * Computes the version the next release should carry.
 *
 * Git tags are the source of truth for released versions: the next release is
 * `semver.inc(latestTag)` — prerelease bump for `…-alpha.N` tags, patch for
 * stable ones. When no tag exists yet the manifest version is the release
 * version, and a manifest ahead of the tag sequence (a deliberate major/minor
 * prep change) wins over the mechanical increment.
 *
 * Used by ci.yml (release job) and auto-bump-version.yml.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";

export function nextReleaseVersion(
	tagNames: string[],
	manifestVersion: string,
): string {
	const released = tagNames
		.map((t) => semver.parse(t.replace(/^v/, "")))
		.filter((v): v is semver.SemVer => v !== null)
		.sort(semver.rcompare)[0];
	if (!semver.valid(manifestVersion)) {
		throw new Error(`Invalid manifest version: ${manifestVersion}`);
	}
	if (!released) {
		return manifestVersion;
	}
	const computed = semver.inc(
		released,
		released.prerelease.length > 0 ? "prerelease" : "patch",
	);
	if (!computed) {
		throw new Error(`Cannot bump released version ${released.version}`);
	}
	return semver.gt(manifestVersion, computed) ? manifestVersion : computed;
}

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
	const tags = execFileSync("git", ["tag", "-l", "v*"], {
		encoding: "utf-8",
		cwd: rootDir,
	})
		.trim()
		.split("\n")
		.filter(Boolean);
	const manifest = JSON.parse(
		readFileSync(join(rootDir, "base/package.json"), "utf-8"),
	).version as string;
	console.log(nextReleaseVersion(tags, manifest));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}
