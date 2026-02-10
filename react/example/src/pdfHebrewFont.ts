/**
 * Hebrew font for jsPDF. Pre-load and register so PDF export displays Hebrew correctly.
 * Put a Hebrew-capable TTF in public/fonts/ (e.g. Heebo-Regular.ttf) and call loadHebrewFont() on app init.
 */
import type { jsPDF } from "jspdf";

const FONT_NAME = "Hebrew";
const FONT_FILE = "Heebo-Regular.ttf";
const FONT_URL = `/fonts/${FONT_FILE}`;

let cachedBase64: string | null = null;

/** Cache base64 TTF so it can be added to any new jsPDF instance. */
export function cacheHebrewFontBase64(base64: string): void {
	cachedBase64 = base64;
}

/** Return the font name to pass to PDF export options when a font is cached. */
export function getHebrewPdfFontName(): string | undefined {
	return cachedBase64 ? FONT_NAME : undefined;
}

/** Add the cached Hebrew font to a jsPDF document. Call before setFont when using hebrewFontName. */
export function addHebrewFontToDoc(doc: jsPDF): void {
	if (!cachedBase64) return;
	try {
		doc.addFileToVFS(FONT_FILE, cachedBase64);
		doc.addFont(FONT_FILE, FONT_NAME, "normal");
	} catch {
		// Font already added or invalid
	}
}

/**
 * Fetch a Hebrew TTF from the app's public folder and cache it.
 * Call once when the app (or HeBook) mounts. If no file is present, PDF will still export with RTL but encoding may be wrong.
 */
export async function loadHebrewFont(): Promise<void> {
	if (cachedBase64) return;
	try {
		const res = await fetch(FONT_URL);
		if (!res.ok) return;
		const ab = await res.arrayBuffer();
		const bytes = new Uint8Array(ab);
		let binary = "";
		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		cachedBase64 = btoa(binary);
	} catch {
		// No font file or network error
	}
}
