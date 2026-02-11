/**
 * Merge PDFs from URLs on the fly (pdf-merger-js).
 * Used for the real ebook split under assets/pages_data/en/pdf/.
 */
import PDFMerger from "pdf-merger-js/browser";

/**
 * Fetch PDF from url; return Blob or null on failure.
 */
async function fetchPdf(url: string): Promise<Blob | null> {
	try {
		const res = await fetch(url);
		if (!res.ok) {
			console.warn(`[pdfMerge] fetchPdf FAILED (status ${res.status}) for:`, url);
			return null;
		}
		const buf = await res.arrayBuffer();
		const blob = new Blob([buf], { type: "application/pdf" });
		console.debug(`[pdfMerge] fetchPdf OK — ${blob.size} bytes from:`, url);
		return blob;
	} catch (err) {
		console.warn("[pdfMerge] fetchPdf EXCEPTION for:", url, err);
		return null;
	}
}

/**
 * Merge PDFs from the given URLs into one. Returns base64 string or null if any fetch fails.
 */
export async function mergePdfsFromUrls(urls: string[]): Promise<string | null> {
	console.debug(`[pdfMerge] mergePdfsFromUrls called with ${urls.length} URL(s)`);
	if (urls.length === 0) return null;
	const merger = new PDFMerger();

	for (let idx = 0; idx < urls.length; idx++) {
		const url = urls[idx];
		const blob = await fetchPdf(url);
		if (!blob) {
			console.warn(`[pdfMerge] Aborting merge — fetch failed at index ${idx}/${urls.length}`);
			return null;
		}
		await merger.add(blob);
		console.debug(`[pdfMerge] Added PDF ${idx + 1}/${urls.length} to merger`);
	}

	const bytes = await merger.saveAsBuffer();
	console.debug(
		`[pdfMerge] saveAsBuffer returned ${bytes instanceof Uint8Array ? `Uint8Array(${bytes.length})` : typeof bytes}`,
	);
	if (!(bytes instanceof Uint8Array)) return null;
	let binary = "";
	const chunk = 8192;
	for (let i = 0; i < bytes.length; i += chunk) {
		const sub = bytes.subarray(i, i + chunk);
		for (let j = 0; j < sub.length; j++) {
			binary += String.fromCharCode(sub[j]);
		}
	}
	const result = btoa(binary);
	console.debug(`[pdfMerge] Merge complete — ${result.length} base64 chars`);
	return result;
}
