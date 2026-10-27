import { describe, expect, it } from "vitest";
import { nextReleaseVersion } from "./next-version.mts";

describe("nextReleaseVersion", () => {
	it("returns the manifest version when no release tags exist", () => {
		expect(nextReleaseVersion([], "1.2.3")).toBe("1.2.3");
	});

	it("ignores tags that are not versions", () => {
		expect(
			nextReleaseVersion(["v-docs", "latest", "vX"], "0.0.0-alpha.87"),
		).toBe("0.0.0-alpha.87");
	});

	it("bumps the prerelease counter after a prerelease tag", () => {
		expect(
			nextReleaseVersion(
				["v0.0.0-alpha.87", "v0.0.0-alpha.86"],
				"0.0.0-alpha.88",
			),
		).toBe("0.0.0-alpha.88");
	});

	it("advances past the latest tag even when the manifest lags", () => {
		// A merge that landed before the post-release bump PR merged: the
		// release must still get a fresh version instead of reusing the tag.
		expect(
			nextReleaseVersion(["v0.0.0-alpha.87"], "0.0.0-alpha.87"),
		).toBe("0.0.0-alpha.88");
	});

	it("bumps the patch component after a stable tag", () => {
		expect(nextReleaseVersion(["v1.2.3"], "1.2.3")).toBe("1.2.4");
	});

	it("prefers a manifest version ahead of the tag sequence", () => {
		// A deliberate major/minor prep merged into the manifests should be
		// released as-is rather than as the next mechanical prerelease.
		expect(nextReleaseVersion(["v0.0.0-alpha.87"], "1.0.0")).toBe("1.0.0");
	});

	it("sorts by semver, not lexically or by tag list order", () => {
		expect(
			nextReleaseVersion(
				["v0.0.0-alpha.9", "v0.0.0-alpha.10", "v1.0.0"],
				"1.0.1",
			),
		).toBe("1.0.1");
	});

	it("rejects an invalid manifest version", () => {
		expect(() => nextReleaseVersion([], "not-a-version")).toThrow(
			/Invalid manifest version/,
		);
	});
});
