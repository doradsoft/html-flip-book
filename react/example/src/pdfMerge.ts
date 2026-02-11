/**
 * Merge PDFs from in-memory base64 data (pdf-merger-js).
 * No fetch needed — PDF content is imported at build time.
 */
import PDFMerger from "pdf-merger-js/browser";

/** Decode a base64 string into a Uint8Array. */
function b64ToUint8Array(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/**
 * Merge one or more PDFs (given as base64 strings) into a single PDF.
 * Returns the merged result as a base64 string, or null on failure.
 */
export async function mergePdfs(pdfBase64s: string[]): Promise<string | null> {
	if (pdfBase64s.length === 0) return null;

	const merger = new PDFMerger();
	for (const b64 of pdfBase64s) {
		const bytes = b64ToUint8Array(b64);
		await merger.add(bytes);
	}

	const result = await merger.saveAsBuffer();
	if (!(result instanceof Uint8Array)) return null;

	// Encode merged PDF as base64
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
