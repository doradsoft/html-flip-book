/**
 * PDF export for the flip book example using jspdf.
 * Supports optional per-page content for real book export.
 * For Hebrew, set rtl: true and optionally register a font (e.g. via pdfHebrewFont) and pass hebrewFontName.
 */
import { jsPDF } from "jspdf";
import { addHebrewFontToDoc } from "./pdfHebrewFont";

export interface SemanticPageInfo {
	pageIndex: number;
	semanticName: string;
	title: string;
}

const MARGIN = 20;
const LINE_HEIGHT = 6;
const PAGE_HEIGHT = 297; // A4 default in mm
const BODY_Y_MAX = PAGE_HEIGHT - MARGIN;

/**
 * Draw text with wrapping and add new PDF pages as needed. Returns final y.
 */
function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
	const lines = doc.splitTextToSize(text, maxWidth);
	for (const line of lines) {
		if (y > BODY_Y_MAX) {
			doc.addPage();
			y = MARGIN;
		}
		doc.text(line, x, y);
		y += LINE_HEIGHT;
	}
	return y;
}

/** Options for entire-book export when using real page content */
export interface EntireBookPdfOptions {
	/** Per-page content (covers can be short labels or empty). Length should match totalPages. */
	pageContents?: (string | null)[];
	/** Right-to-left (e.g. Hebrew). Uses setR2L(true). */
	rtl?: boolean;
	/** Font name if a Hebrew-capable font was registered with jsPDF (e.g. addFont). */
	hebrewFontName?: string;
}

/**
 * Generate a PDF for "entire book" export.
 * If pageContents is provided, one PDF page is generated per book page with that content.
 */
export function exportEntireBookPdf(
	title: string,
	totalPages: number,
	options?: EntireBookPdfOptions,
): string {
	const doc = new jsPDF();
	if (options?.rtl) doc.setR2L(true);
	if (options?.hebrewFontName) {
		addHebrewFontToDoc(doc);
		doc.setFont(options.hebrewFontName);
	}
	const pageWidth = doc.internal.pageSize.getWidth();
	const maxWidth = pageWidth - 2 * MARGIN;
	const pageContents = options?.pageContents ?? null;

	if (pageContents && pageContents.length >= totalPages) {
		// Real export: one PDF page per book page
		for (let i = 0; i < totalPages; i++) {
			if (i > 0) doc.addPage();
			let y = MARGIN;
			doc.setFontSize(10);
			const content = pageContents[i];
			const label = content?.trim() ? content : `Page ${i + 1}`;
			y = addWrappedText(doc, label, MARGIN, y, maxWidth);
			// Optional: add a small footer
			doc.setFontSize(8);
			doc.setTextColor(128, 128, 128);
			doc.text(`${title} — ${i + 1} / ${totalPages}`, pageWidth / 2, BODY_Y_MAX + 5, {
				align: "center",
			});
			doc.setTextColor(0, 0, 0);
		}
	} else {
		// Placeholder single-page export
		let y = 20;
		doc.setFontSize(18);
		doc.text(title, pageWidth / 2, y, { align: "center" });
		y += 15;
		doc.setFontSize(11);
		doc.text(`Exported from HTML Flip Book — ${totalPages} pages`, pageWidth / 2, y, {
			align: "center",
		});
		y += 20;
		doc.setFontSize(10);
		doc.text("This is a placeholder export. In a real app you would render each page.", 20, y);
		y += 8;
		doc.text(`Total pages: ${totalPages}`, 20, y);
	}

	const base64 = doc.output("datauristring").split(",")[1];
	if (!base64) throw new Error("PDF output failed");
	return base64;
}

/** Options for page-range export when using real page content */
export interface PageRangePdfOptions {
	/** Per-page content for the full book; indices match pageIndex. Used for selected range. */
	pageContents?: (string | null)[];
	/** Right-to-left (e.g. Hebrew). Uses setR2L(true). */
	rtl?: boolean;
	/** Font name if a Hebrew-capable font was registered with jsPDF (e.g. addFont). */
	hebrewFontName?: string;
}

/**
 * Generate a PDF for a page range export.
 * If pageContents is provided, each selected page is rendered as a PDF page with its content.
 */
export function exportPageRangePdf(
	title: string,
	pages: number[],
	semanticPages: SemanticPageInfo[],
	options?: PageRangePdfOptions,
): string {
	const doc = new jsPDF();
	if (options?.rtl) doc.setR2L(true);
	if (options?.hebrewFontName) {
		addHebrewFontToDoc(doc);
		doc.setFont(options.hebrewFontName);
	}
	const pageWidth = doc.internal.pageSize.getWidth();
	const maxWidth = pageWidth - 2 * MARGIN;
	const pageContents = options?.pageContents ?? null;

	if (pageContents && pages.length > 0) {
		// Real export: one PDF page per selected page
		for (let i = 0; i < pages.length; i++) {
			if (i > 0) doc.addPage();
			const pageIndex = pages[i];
			let y = MARGIN;
			doc.setFontSize(10);
			const content = pageContents[pageIndex];
			const label = content?.trim()
				? content
				: semanticPages.find((p) => p.pageIndex === pageIndex)?.title || `Page ${pageIndex + 1}`;
			y = addWrappedText(doc, label, MARGIN, y, maxWidth);
			doc.setFontSize(8);
			doc.setTextColor(128, 128, 128);
			doc.text(`${title} — page ${pageIndex + 1}`, pageWidth / 2, BODY_Y_MAX + 5, {
				align: "center",
			});
			doc.setTextColor(0, 0, 0);
		}
	} else {
		// Placeholder: summary of selected range
		let y = 20;
		doc.setFontSize(16);
		doc.text(`${title} — Page range`, pageWidth / 2, y, { align: "center" });
		y += 12;
		doc.setFontSize(10);
		const rangeLabel =
			pages.length <= 5
				? pages.join(", ")
				: `${pages[0]}–${pages[pages.length - 1]} (${pages.length} pages)`;
		doc.text(rangeLabel, pageWidth / 2, y, { align: "center" });
		y += 15;
		for (const p of semanticPages.slice(0, 20)) {
			const label = p.semanticName || p.title || `Page ${p.pageIndex + 1}`;
			doc.text(`• ${label}`, 20, y);
			y += 7;
			if (y > 270) {
				doc.addPage();
				y = 20;
			}
		}
		if (semanticPages.length > 20) {
			doc.text(`… and ${semanticPages.length - 20} more`, 20, y);
		}
	}

	const base64 = doc.output("datauristring").split(",")[1];
	if (!base64) throw new Error("PDF output failed");
	return base64;
}
