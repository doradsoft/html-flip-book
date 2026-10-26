import type { PageSemantics } from "../page-semantics";
import type { DownloadConfig, DownloadResult, SemanticPageInfo } from "./types";

/** UTF-8 safe base64 (btoa only accepts Latin-1 input). */
function toBase64(text: string): string {
	let binary = "";
	for (const byte of new TextEncoder().encode(text)) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function pagesIndexResult(pages: SemanticPageInfo[]): DownloadResult {
	return { ext: "json", data: toBase64(JSON.stringify(pages, null, "\t")) };
}

/**
 * Built-in {@link DownloadConfig} used when `enableDownload !== false` and no
 * consumer `downloadConfig` is provided.
 *
 * Both handlers export a JSON index (`SemanticPageInfo[]`: pageIndex,
 * semanticName, title) rather than rendered page content — the base package
 * has no document renderer, so a faithful index is the useful zero-dependency
 * default. "Entire book" lists pages that have a semantic name or title
 * (all pages when the book has no {@link PageSemantics}); a page range lists
 * every selected page.
 *
 * Consumers needing PDF/image export still provide their own `downloadConfig`,
 * which replaces this default entirely.
 */
export function createDefaultDownloadConfig(options: {
	pagesCount: number;
	pageSemantics?: PageSemantics;
}): DownloadConfig {
	const { pagesCount, pageSemantics } = options;
	const pageInfo = (pageIndex: number): SemanticPageInfo => {
		const semanticName = pageSemantics?.indexToSemanticName(pageIndex) ?? "";
		const title = pageSemantics?.indexToTitle(pageIndex) ?? "";
		// Without a semantics provider every page is meaningful — fall back to
		// 1-based names like the toolbar's range selector does.
		if (!pageSemantics) {
			return { pageIndex, semanticName: String(pageIndex + 1), title: `Page ${pageIndex + 1}` };
		}
		return { pageIndex, semanticName, title };
	};

	return {
		onDownloadSefer: () => {
			const pages: SemanticPageInfo[] = [];
			for (let i = 0; i < pagesCount; i++) {
				const info = pageInfo(i);
				if (info.semanticName || info.title) pages.push(info);
			}
			return Promise.resolve(pagesIndexResult(pages));
		},
		onDownloadPageRange: (pages) => Promise.resolve(pagesIndexResult(pages.map(pageInfo))),
	};
}
