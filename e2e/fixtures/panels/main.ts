import { FlipBook } from "html-flip-book-vanilla";
import "flipbook-styles";

/**
 * Panel fixture (issue #279): each book mixes normal document pages with
 * `.flipbook-page-panel` pages carrying a fixed header/footer and a
 * scrollable inner pane. Markup is built with DOM APIs so nothing here
 * depends on generated source strings.
 */

function div(className: string): HTMLDivElement {
	const el = document.createElement("div");
	el.className = className;
	return el;
}

function normal(label: string): HTMLElement {
	const page = div("page");
	const article = document.createElement("article");
	article.className = "prose";
	for (let i = 1; i <= 40; i++) {
		const p = document.createElement("p");
		p.textContent = `${label} paragraph ${i} tall document content that overflows the page.`;
		article.appendChild(p);
	}
	page.appendChild(article);
	return page;
}

function panel(label: string): HTMLElement {
	const page = div("page");
	const wrap = div("flipbook-page-panel fixture-panel");
	const header = div("fixture-panel-header");
	header.textContent = `${label} header`;
	const pane = div("fixture-pane");
	pane.tabIndex = 0;
	const list = document.createElement("ol");
	for (let i = 1; i <= 60; i++) {
		const li = document.createElement("li");
		li.textContent = `Panel line ${i}`;
		list.appendChild(li);
	}
	pane.appendChild(list);
	const footer = div("fixture-panel-footer");
	footer.textContent = `${label} footer`;
	wrap.append(header, pane, footer);
	page.appendChild(wrap);
	return page;
}

const books = new Map<string, FlipBook>();
for (const dir of ["ltr", "rtl"] as const) {
	const host = document.getElementById(`book-${dir}`);
	if (!host) throw new Error(`missing #book-${dir}`);
	for (const el of [
		normal(`${dir} page 0`),
		panel(`${dir} page 1`),
		panel(`${dir} page 2`),
		normal(`${dir} page 3`),
		normal(`${dir} page 4`),
		normal(`${dir} page 5`),
	]) {
		host.appendChild(el);
	}
	const book = new FlipBook({
		pagesCount: 6,
		direction: dir,
		leafAspectRatio: { width: 3, height: 2 },
		enableHistory: false,
	});
	book.render(`#book-${dir}`);
	book.jumpToPage(1);
	books.set(dir, book);
}
(window as unknown as { books: Map<string, FlipBook> }).books = books;
