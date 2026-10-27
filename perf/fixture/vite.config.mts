import { fileURLToPath } from "node:url";

// Perf fixture build. The driver builds one fixture per variant under test:
// HFB_PERF_VANILLA and HFB_PERF_CSS point at that variant's dist artifacts so
// base and candidate run through byte-identical fixture code.
const vanilla = process.env.HFB_PERF_VANILLA;
const css = process.env.HFB_PERF_CSS;
const react = process.env.HFB_PERF_REACT;
if (!vanilla || !css || !react) {
	throw new Error("HFB_PERF_VANILLA, HFB_PERF_CSS and HFB_PERF_REACT must all be set");
}

export default {
	root: ".",
	resolve: {
		alias: {
			"html-flip-book-vanilla": vanilla,
			"html-flip-book-react": react,
			"flipbook-styles": css,
		},
	},
	build: { emptyOutDir: true },
	logLevel: "warn" as const,
};
