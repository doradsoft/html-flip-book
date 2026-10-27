// Runs inside the packed-book fixture directory: import.meta.resolve anchors
// here, so package specifiers resolve through the fixture's node_modules (the
// extracted tarballs), not the monorepo workspace links.
import { fileURLToPath } from "node:url";

const specs = [
	"html-flip-book-vanilla",
	"html-flip-book-vanilla/commands",
	"html-flip-book-vanilla/download",
	"html-flip-book-vanilla/intl",
	"html-flip-book-vanilla/store",
	"html-flip-book-vanilla/style.css",
	"html-flip-book-react",
	"html-flip-book-react/toolbar",
	"html-flip-book-react/styles.css",
];

for (const s of specs) {
	try {
		console.log(`${s} -> ${fileURLToPath(import.meta.resolve(s))}`);
	} catch (e) {
		console.log(`${s} -> ERROR ${e.code}`);
	}
}
