/**
 * Generate EN book PDFs one per page (for merging on the fly in the app).
 * Run from react/example: npm run generate:en-pdf
 * Requires: npm install @mdpdf/mdpdf (dev)
 * Output: public/downloads/en/page-00.pdf, page-01.pdf, ...
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "assets", "pages_data", "en", "content");
const OUT_DIR = path.join(ROOT, "public", "downloads", "en");

async function main() {
	const { markdownToPdf } = await import("@mdpdf/mdpdf");
	fs.mkdirSync(OUT_DIR, { recursive: true });

	const contentNames = fs.readdirSync(CONTENT_DIR).filter((n) => n.endsWith(".md"));
	contentNames.sort((a, b) => a.localeCompare(b));

	const pad = (n: number) => String(n).padStart(2, "0");

	// Page 0: cover
	const coverMd = "# SQL Tutorial\n\nA Complete Guide to Database Management";
	const coverPdf = await markdownToPdf(coverMd);
	fs.writeFileSync(path.join(OUT_DIR, "page-00.pdf"), new Uint8Array(coverPdf));
	console.log("Wrote page-00.pdf (cover)");

	// Page 1: front interior (blank)
	const blankMd = " ";
	const blankPdf = await markdownToPdf(blankMd);
	fs.writeFileSync(path.join(OUT_DIR, "page-01.pdf"), new Uint8Array(blankPdf));
	console.log("Wrote page-01.pdf (interior)");

	// Page 2: TOC
	const tocMd = "# Table of Contents\n\nNavigate using the toolbar or flip through the book.";
	const tocPdf = await markdownToPdf(tocMd);
	fs.writeFileSync(path.join(OUT_DIR, "page-02.pdf"), new Uint8Array(tocPdf));
	console.log("Wrote page-02.pdf (toc)");

	// Pages 3 .. 3+len-1: content (one PDF per .md file)
	for (let i = 0; i < contentNames.length; i++) {
		const name = contentNames[i];
		const filePath = path.join(CONTENT_DIR, name);
		const md = fs.readFileSync(filePath, "utf-8");
		const pdfBytes = await markdownToPdf(md);
		const pageNum = 3 + i;
		fs.writeFileSync(
			path.join(OUT_DIR, `page-${pad(pageNum)}.pdf`),
			new Uint8Array(pdfBytes),
		);
		console.log(`Wrote page-${pad(pageNum)}.pdf (${name})`);
	}

	const n = 3 + contentNames.length;
	// Page n: last blank
	fs.writeFileSync(path.join(OUT_DIR, `page-${pad(n)}.pdf`), new Uint8Array(blankPdf));
	console.log(`Wrote page-${pad(n)}.pdf (blank)`);
	// Page n+1: back interior
	fs.writeFileSync(path.join(OUT_DIR, `page-${pad(n + 1)}.pdf`), new Uint8Array(blankPdf));
	console.log(`Wrote page-${pad(n + 1)}.pdf (back interior)`);
	// Page n+2: back cover
	const backMd = "# More in This Series\n\nJavaScript Fundamentals, React Development, Node.js Backend";
	const backPdf = await markdownToPdf(backMd);
	fs.writeFileSync(path.join(OUT_DIR, `page-${pad(n + 2)}.pdf`), new Uint8Array(backPdf));
	console.log(`Wrote page-${pad(n + 2)}.pdf (back cover)`);

	const totalPages = n + 3;
	console.log(`Done. ${totalPages} pages in ${OUT_DIR}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
