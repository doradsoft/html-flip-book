/**
 * Download types for flipbook export.
 * Consumers implement the handlers; the toolbar (or other UI) invokes them.
 */

/** Describes one page in a range for the page-ranges download handler */
export interface SemanticPageInfo {
	/** Zero-based page index in the book */
	pageIndex: number;
	/** Display page number (e.g. Hebrew letter or "1") */
	semanticName: string;
	/** Title for the page (e.g. "פרק א'") */
	title: string;
}

/** Result of a download: file extension and base64-encoded content (e.g. from server action) */
export interface DownloadResult {
	ext: string;
	/** Base64-encoded file content */
	data: string;
}

/** Optional context for page-ranges download (e.g. sefer name for Tanach) */
export interface PageRangesDownloadContext {
	seferName?: string;
}

/**
 * Sefer (entire book) download handler.
 * Receives no arguments; consumer decides scope (e.g. current sefer from context).
 * Returns download result or null if not available.
 */
export type SeferDownloadHandler = () => Promise<DownloadResult | null>;

/**
 * Page-ranges download handler.
 * Receives page indices and semantic info for the selected range, and optional context.
 * Returns download result or null if not available.
 */
export type PageRangesDownloadHandler = (
	pages: number[],
	semanticPages: SemanticPageInfo[],
	context?: PageRangesDownloadContext,
) => Promise<DownloadResult | null>;

/**
 * Download configuration for the flipbook (entire book and page range).
 * Passed via FlipBook options; toolbar reads it from the flipbook ref.
 */
export interface DownloadConfig {
	/** Called when user chooses "Download entire book". Return result or null. */
	onDownloadSefer?: SeferDownloadHandler;
	/** Called when user chooses "Download page range" with selected pages. Return result or null. */
	onDownloadPageRange?: PageRangesDownloadHandler;
	/** Optional context passed to onDownloadPageRange (e.g. seferName) */
	downloadContext?: PageRangesDownloadContext;
	/** Suggested filename base for entire book download. Default: "book" */
	entireBookFilename?: string;
	/** Suggested filename base for range download. Default: "pages" */
	rangeFilename?: string;
}
