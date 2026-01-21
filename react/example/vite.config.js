import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";
import packageJson from "./package.json";

export default defineConfig(({ mode }) => {
	const isProd = mode === "production";
	const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
	return {
		mode,
		assetsInclude: ["**/*.md"],
		base: isGitHubPages ? "/html-flip-book/" : "",
		resolve: {
			alias: {
				"html-flip-book-react": path.resolve(__dirname, "../src/FlipBook.tsx"),
				"html-flip-book-base": path.resolve(__dirname, "../../base/src/flipbook.ts"),
			},
		},
		build: {
			sourcemap: !isProd,
			emptyOutDir: true,
			rollupOptions: {
				external: ["react", "react-dom"],
				makeAbsoluteExternalsRelative: true,
			},
			terserOptions: {
				module: true,
				output: {
					comments: () => false,
				},
				compress: {
					drop_console: true,
				},
			},
		},
		esbuild: { legalComments: "none" },
		server: {
			port: 5173,
			strictPort: true,
			open: false,
			fs: {
				allow: [path.resolve(__dirname, ".."), path.resolve(__dirname, "../..")],
			},
		},
		plugins: [
			react(),
			{
				name: "markdown-loader",
				transform(_export, id) {
					if (id.endsWith(".md")) {
						const mdContent = fs.readFileSync(id, "utf-8");
						return {
							code: `export default ${JSON.stringify(mdContent)}`,
							map: null, // provide source map if available
						};
					}
				},
			},
			tsconfigPaths(),
			checker({
				typescript: true,
			}),
			{
				name: "update-esm-package-props",
				generateBundle: (_options, bundle) => {
					if (isProd) {
						for (const fileName in bundle) {
							if (fileName.startsWith("index-")) {
								fs.writeFile(
									path.resolve(__dirname, "./package.json"),
									JSON.stringify({ ...packageJson, main: `dist/${fileName}` }, null, 2),
									(err) => {
										if (err) throw err;
										console.log("\x1b[36m%s\x1b[0m", "\nPackage ESM main entrypoint updated!\n\r");
									},
								);
							}
						}
					}
				},
			},
		],
	};
});
