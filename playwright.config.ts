import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
	testDir: "./e2e",
	testMatch: "**/*.spec.ts",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: 2, // Retries for flaky tests with mocked time/velocity detection
	workers: isCI ? "100%" : "50%",
	reporter: [
		["list"],
		["html", { outputFolder: ".playwright-report", open: "never" }],
		// Coverage reporter
		[
			"monocart-reporter",
			{
				coverage: {
					name: "E2E Coverage Report",
					outputDir: ".coverage/e2e",
					reports: ["lcovonly", "text"],
					sourceFilter: (sourcePath: string) => {
						return sourcePath.includes("/base/src/") || sourcePath.includes("/react/src/");
					},
				},
			},
		],
	],
	use: {
		baseURL: "http://localhost:5173",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			testIgnore: ["**/mocked/**", "**/integration/**"],
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "mobile",
			testIgnore: ["**/mocked/**", "**/integration/**"],
			use: { ...devices["Pixel 5"] },
		},
		{
			name: "mocked-fast",
			testMatch: "**/mocked/**/*.spec.ts",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "integration-slow",
			testMatch: "**/integration/**/*.spec.ts",
			retries: 2,
			timeout: 30000,
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run dev",
		url: "http://localhost:5173",
		reuseExistingServer: !isCI,
		timeout: 120000,
	},
});
