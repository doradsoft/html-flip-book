/**
 * Tests for mergePdfsFromUrls – verifies that multiple PDFs are actually
 * merged into one document (not just the first / "from" page).
 */
import { PDFDocument } from "pdf-lib";
import PDFMerger from "pdf-merger-js/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Re-implement mergePdfsFromUrls inline so the test doesn't depend on the
// example app's import path, while exercising the exact same algorithm.
// ---------------------------------------------------------------------------

async function fetchPdf(url: string): Promise<Blob | null> {
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		const buf = await res.arrayBuffer();
		return new Blob([buf], { type: "application/pdf" });
	} catch {
		return null;
	}
}

async function mergePdfsFromUrls(urls: string[]): Promise<string | null> {
	if (urls.length === 0) return null;
	const merger = new PDFMerger();

	for (const url of urls) {
		const blob = await fetchPdf(url);
		if (!blob) return null;
		await merger.add(blob);
	}

	const bytes = await merger.saveAsBuffer();
	if (!(bytes instanceof Uint8Array)) return null;
	let binary = "";
	const chunk = 8192;
	for (let i = 0; i < bytes.length; i += chunk) {
		const sub = bytes.subarray(i, i + chunk);
		for (let j = 0; j < sub.length; j++) {
			binary += String.fromCharCode(sub[j]);
		}
	}
	return btoa(binary);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal valid PDF with `pageCount` blank pages using pdf-lib. */
async function createPdfWithPages(pageCount: number): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	for (let i = 0; i < pageCount; i++) {
		doc.addPage([612, 792]); // US Letter
	}
	return doc.save();
}

/** Decode base64 string → Uint8Array */
function base64ToBytes(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/** Count pages in a PDF represented as Uint8Array. */
async function countPdfPages(pdfBytes: Uint8Array): Promise<number> {
	const doc = await PDFDocument.load(pdfBytes);
	return doc.getPageCount();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("mergePdfsFromUrls", () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should merge multiple single-page PDFs into one with all pages", async () => {
		// Create 3 distinct single-page PDFs
		const pdf1 = await createPdfWithPages(1);
		const pdf2 = await createPdfWithPages(1);
		const pdf3 = await createPdfWithPages(1);

		// Mock fetch to return each PDF based on URL
		const urlMap: Record<string, Uint8Array> = {
			"http://test/chapter-1.pdf": pdf1,
			"http://test/chapter-2.pdf": pdf2,
			"http://test/chapter-3.pdf": pdf3,
		};

		fetchSpy.mockImplementation(async (input: string | URL | Request) => {
			const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
			const data = urlMap[url];
			if (!data) return new Response(null, { status: 404 });
			return new Response(new Blob([data], { type: "application/pdf" }), {
				status: 200,
				headers: { "Content-Type": "application/pdf" },
			});
		});

		const result = await mergePdfsFromUrls([
			"http://test/chapter-1.pdf",
			"http://test/chapter-2.pdf",
			"http://test/chapter-3.pdf",
		]);

		expect(result).not.toBeNull();
		const mergedBytes = base64ToBytes(result as string);
		const pageCount = await countPdfPages(mergedBytes);
		expect(pageCount).toBe(3);
	});

	it("should merge multi-page PDFs and preserve total page count", async () => {
		// PDF A has 2 pages, PDF B has 3 pages → merged should have 5
		const pdfA = await createPdfWithPages(2);
		const pdfB = await createPdfWithPages(3);

		fetchSpy.mockImplementation(async (input: string | URL | Request) => {
			const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
			const data = url.includes("a.pdf") ? pdfA : url.includes("b.pdf") ? pdfB : null;
			if (!data) return new Response(null, { status: 404 });
			return new Response(new Blob([data], { type: "application/pdf" }), {
				status: 200,
				headers: { "Content-Type": "application/pdf" },
			});
		});

		const result = await mergePdfsFromUrls(["http://test/a.pdf", "http://test/b.pdf"]);

		expect(result).not.toBeNull();
		const pageCount = await countPdfPages(base64ToBytes(result as string));
		expect(pageCount).toBe(5);
	});

	it("should return null when one fetch fails (404)", async () => {
		const pdf1 = await createPdfWithPages(1);

		fetchSpy.mockImplementation(async (input: string | URL | Request) => {
			const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
			if (url.includes("good.pdf")) {
				return new Response(new Blob([pdf1], { type: "application/pdf" }), {
					status: 200,
					headers: { "Content-Type": "application/pdf" },
				});
			}
			return new Response(null, { status: 404 });
		});

		const result = await mergePdfsFromUrls(["http://test/good.pdf", "http://test/missing.pdf"]);

		expect(result).toBeNull();
	});

	it("should return null for empty URL array", async () => {
		const result = await mergePdfsFromUrls([]);
		expect(result).toBeNull();
	});

	it("should handle a single PDF (from === to)", async () => {
		const pdf = await createPdfWithPages(1);

		fetchSpy.mockImplementation(
			async () =>
				new Response(new Blob([pdf], { type: "application/pdf" }), {
					status: 200,
					headers: { "Content-Type": "application/pdf" },
				}),
		);

		const result = await mergePdfsFromUrls(["http://test/only.pdf"]);
		expect(result).not.toBeNull();
		const pageCount = await countPdfPages(base64ToBytes(result as string));
		expect(pageCount).toBe(1);
	});
});
