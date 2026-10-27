import { fileURLToPath } from "node:url";

// Panel fixture build: the spec passes the base stylesheet path through
// HFB_PANEL_CSS because the emitted filename differs across versions.
const css = process.env.HFB_PANEL_CSS;
if (!css) throw new Error("HFB_PANEL_CSS is not set");

export default {
	root: ".",
	resolve: {
		alias: {
			"html-flip-book-vanilla": fileURLToPath(
				new URL("../../../base/dist/flipbook.js", import.meta.url),
			),
			"flipbook-styles": css,
		},
	},
	build: { emptyOutDir: true },
	logLevel: "warn" as const,
};
