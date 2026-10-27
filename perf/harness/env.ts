import { execSync } from "node:child_process";
import os from "node:os";
import type { Page } from "@playwright/test";

/**
 * Everything the report records about the environment (issue #289): the
 * paired comparison is only meaningful when both legs ran on the same
 * runner/browser/flags, so the report pins all of it.
 */
export interface RunEnvironment {
	runnerOs: string;
	runnerArch: string;
	cpuModel: string;
	cpuCores: number;
	nodeVersion: string;
	playwrightVersion: string;
	userAgent: string;
	hardwareConcurrency: number;
	devicePixelRatio: number;
	webglRenderer: string;
	visibilityState: string;
	viewport: { width: number; height: number };
	protocolHeadless: boolean;
}

export function collectRunnerMetadata(): Pick<
	RunEnvironment,
	"runnerOs" | "runnerArch" | "cpuModel" | "cpuCores" | "nodeVersion" | "playwrightVersion"
> {
	const cpu = os.cpus()[0];
	let playwrightVersion = "unknown";
	try {
		playwrightVersion = execSync("npx playwright --version", {
			encoding: "utf-8",
		}).trim();
	} catch {
		// Version stays "unknown" — recorded honestly rather than guessed.
	}
	return {
		runnerOs: `${os.type()} ${os.release()}`,
		runnerArch: os.arch(),
		cpuModel: cpu?.model ?? "unknown",
		cpuCores: os.cpus().length,
		nodeVersion: process.version,
		playwrightVersion,
	};
}

export async function collectBrowserMetadata(
	page: Page,
): Promise<
	Pick<
		RunEnvironment,
		| "userAgent"
		| "hardwareConcurrency"
		| "devicePixelRatio"
		| "webglRenderer"
		| "visibilityState"
		| "viewport"
		| "protocolHeadless"
	>
> {
	return page.evaluate(() => {
		const gpuCanvas = document.createElement("canvas");
		const gl = gpuCanvas.getContext("webgl");
		let webglRenderer = "unavailable";
		if (gl) {
			const info = gl.getExtension("WEBGL_debug_renderer_info");
			webglRenderer = info
				? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
				: String(gl.getParameter(gl.RENDERER));
		}
		return {
			userAgent: navigator.userAgent,
			hardwareConcurrency: navigator.hardwareConcurrency,
			devicePixelRatio: window.devicePixelRatio,
			webglRenderer,
			visibilityState: document.visibilityState,
			viewport: { width: window.innerWidth, height: window.innerHeight },
			protocolHeadless: navigator.webdriver,
		};
	});
}
