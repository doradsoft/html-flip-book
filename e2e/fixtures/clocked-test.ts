import { test as base, type Page } from "@playwright/test";

/**
 * Custom test fixture for tests that use clock mocking.
 *
 * Clock mocking (page.clock) is unreliable on mobile device emulation,
 * so tests using this fixture automatically skip on mobile projects.
 *
 * Usage:
 * ```ts
 * import { test, expect } from "../fixtures/clocked-test";
 *
 * test("my clocked test", async ({ clockedPage }) => {
 *   await clockedPage.goto("/");
 *   // clock is already installed
 *   await clockedPage.clock.runFor(100);
 * });
 * ```
 */
export const test = base.extend<{ clockedPage: Page }>({
	clockedPage: async ({ page }, use, testInfo) => {
		// Skip on mobile projects - clock mocking is unreliable on mobile device emulation
		if (testInfo.project.name === "mobile") {
			base.skip(true, "Clock mocking unreliable on mobile");
		}

		// Install the mocked clock
		await page.clock.install();

		await use(page);
	},
});

export { expect } from "@playwright/test";
