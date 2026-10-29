import type { Page, TestInfo } from "@playwright/test";
import { addCoverageReport } from "monocart-reporter";

type CoveragePage = Pick<Page, "coverage" | "isClosed">;
type CoverageList = Awaited<ReturnType<Page["coverage"]["stopJSCoverage"]>>;
type ReportCoverage = (coverage: CoverageList, testInfo: TestInfo) => Promise<unknown>;

/** Collect before Playwright disposes its page, including after a failed test. */
export async function withBrowserCoverage(
	browserName: string,
	page: CoveragePage,
	testInfo: TestInfo,
	run: () => Promise<void>,
	report: ReportCoverage = addCoverageReport,
): Promise<void> {
	if (browserName !== "chromium") {
		await run();
		return;
	}
	await page.coverage.startJSCoverage({ resetOnNavigation: false });
	const failures: unknown[] = [];
	try {
		await run();
	} catch (error) {
		failures.push(error);
	}
	try {
		if (page.isClosed()) {
			throw new Error("The test closed its page before E2E coverage could be collected");
		}
		const coverage = await page.coverage.stopJSCoverage();
		await report(coverage, testInfo);
	} catch (error) {
		failures.push(error);
	}
	if (failures.length > 1)
		throw new AggregateError(failures, "Test and browser coverage collection both failed");
	if (failures.length === 1) throw failures[0];
}
