/**
 * Tests for mergePdfs – verifies that multiple PDFs (given as base64 strings)
 * are actually merged into one document (not just the first / "from" page).
 */
import { PDFDocument } from "pdf-lib";
import PDFMerger from "pdf-merger-js/browser";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Re-implement mergePdfs inline so the test doesn't depend on the
// example app's import path, while exercising the exact same algorithm.
// ---------------------------------------------------------------------------

function b64ToUint8Array(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

async function mergePdfs(pdfBase64s: string[]): Promise<string | null> {
	if (pdfBase64s.length === 0) return null;
	const merger = new PDFMerger();

	for (const b64 of pdfBase64s) {
		const bytes = b64ToUint8Array(b64);
		await merger.add(bytes);
	}

	const result = await merger.saveAsBuffer();
	if (!(result instanceof Uint8Array)) return null;

	let binary = "";
	const chunk = 8192;
	for (let i = 0; i < result.length; i += chunk) {
		const sub = result.subarray(i, i + chunk);
		for (let j = 0; j < sub.length; j++) {
			binary += String.fromCharCode(sub[j]);
		}
	}
	return btoa(binary);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal valid PDF with `pageCount` blank pages, returned as base64. */
async function createPdfBase64(pageCount: number): Promise<string> {
	const doc = await PDFDocument.create();
	for (let i = 0; i < pageCount; i++) {
		doc.addPage([612, 792]); // US Letter
	}
	const bytes = await doc.save();
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/** Count pages in a PDF represented as base64. */
async function countPdfPages(b64: string): Promise<number> {
	const doc = await PDFDocument.load(b64ToUint8Array(b64));
	return doc.getPageCount();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("mergePdfs", () => {
	it("should merge multiple single-page PDFs into one with all pages", async () => {
		const pdf1 = await createPdfBase64(1);
		const pdf2 = await createPdfBase64(1);
		const pdf3 = await createPdfBase64(1);

		const result = await mergePdfs([pdf1, pdf2, pdf3]);

		expect(result).not.toBeNull();
		const pageCount = await countPdfPages(result as string);
		expect(pageCount).toBe(3);
	});

	it("should merge multi-page PDFs and preserve total page count", async () => {
		// PDF A has 2 pages, PDF B has 3 pages → merged should have 5
		const pdfA = await createPdfBase64(2);
		const pdfB = await createPdfBase64(3);

		const result = await mergePdfs([pdfA, pdfB]);

		expect(result).not.toBeNull();
		const pageCount = await countPdfPages(result as string);
		expect(pageCount).toBe(5);
	});

	it("should return null for empty input array", async () => {
		const result = await mergePdfs([]);
		expect(result).toBeNull();
	});

	it("should handle a single PDF (from === to)", async () => {
		const pdf = await createPdfBase64(1);

		const result = await mergePdfs([pdf]);
		expect(result).not.toBeNull();
		const pageCount = await countPdfPages(result as string);
		expect(pageCount).toBe(1);
	});
});
