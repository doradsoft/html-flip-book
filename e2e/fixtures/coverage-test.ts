import { test as base } from "@playwright/test";
import { withBrowserCoverage } from "./coverage-collector";

export * from "@playwright/test";

export const test = base.extend<{ browserCoverage: undefined }>({
	browserCoverage: [
		async ({ page, browserName }, use, testInfo) => {
			await withBrowserCoverage(browserName, page, testInfo, () => use(undefined));
		},
		{ auto: true },
	],
});
