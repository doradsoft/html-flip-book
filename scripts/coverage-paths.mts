import { posix } from "node:path";

/** Normalize sourcemap paths from Vite, Windows, or POSIX to repository paths. */
export function libraryCoveragePath(sourcePath: string, info?: { distFile?: string; url?: string }): string {
	const normalized = sourcePath.replaceAll("\\", "/").split(/[?#]/, 1)[0];
	if (/(?:^|\/)node_modules\//.test(normalized)) return normalized;
	const start = normalized.search(/(?:^|\/)(?:base|react)\/src\//);
	if (start >= 0) return normalized.slice(start + (normalized[start] === "/" ? 1 : 0));
	if (info?.url && info.url !== sourcePath) {
		const original = libraryCoveragePath(info.url);
		if (/(?:^|\/)node_modules\//.test(original)) return original;
		if (/^(?:base|react)\/src\//.test(original)) return original;
	}
	if (info?.distFile) {
		return libraryCoveragePath(posix.join(posix.dirname(info.distFile.replaceAll("\\", "/")), normalized));
	}
	return normalized;
}

export function isLibraryCoverageSource(sourcePath: string): boolean {
	const normalized = sourcePath.replaceAll("\\", "/");
	const libraryPath = libraryCoveragePath(normalized);
	return /^(?:base|react)\/src\/.+\.tsx?$/.test(libraryPath)
		&& !/(?:^|\/)node_modules\//.test(normalized)
		&& !libraryPath.includes("/__tests__/")
		&& !/\.test\.tsx?$/.test(libraryPath);
}
