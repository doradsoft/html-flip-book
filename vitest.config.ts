import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		conditions: ["development", "browser", "module", "default"],
		alias: [
			{
				find: "html-flip-book-vanilla/commands",
				replacement: path.resolve(__dirname, "base/src/commands/index.ts"),
			},
			{
				find: "html-flip-book-vanilla/download",
				replacement: path.resolve(__dirname, "base/src/download/index.ts"),
			},
			{
				find: "html-flip-book-vanilla/intl",
				replacement: path.resolve(__dirname, "base/src/intl/index.ts"),
			},
			{
				find: "html-flip-book-vanilla/store",
				replacement: path.resolve(__dirname, "base/src/store/index.ts"),
			},
			{
				find: "html-flip-book-vanilla",
				replacement: path.resolve(__dirname, "base/src/flipbook.ts"),
			},
		],
	},
	test: {
		globals: true,
		environment: "happy-dom",
		include: ["base/src/**/*.test.ts", "react/src/**/*.test.{ts,tsx}"],
		deps: {
			inline: ["react", "react-dom", "@testing-library/react"],
		},
		coverage: {
			provider: "istanbul",
			reporter: ["lcov", "text", "json-summary"],
			reportsDirectory: ".coverage/unit",
			include: ["base/src/**/*.ts", "react/src/**/*.{ts,tsx}"],
			exclude: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**"],
		},
	},
});
