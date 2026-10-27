// Fixture build config: resolves the packed packages placed in this
// directory's node_modules by the spec. JSX via esbuild (no plugin needed).
export default {
	root: ".",
	esbuild: { jsx: "automatic" as const },
	resolve: { dedupe: ["react", "react-dom", "react/jsx-runtime"] },
	logLevel: "warn" as const,
};
