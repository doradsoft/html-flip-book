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
		if (!res.ok) return null;
		const buf = await res.arrayBuffer();
		return new Blob([buf], { type: "application/pdf" });
	} catch {
		return null;
	}
}

/**
 * Merge PDFs from the given URLs into one. Returns base64 string or null if any fetch fails.
 */
export async function mergePdfsFromUrls(urls: string[]): Promise<string | null> {
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
