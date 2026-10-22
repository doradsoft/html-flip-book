import "./bookmarks.scss";

/** A bookmark identifies a zero-based page and keeps consumer data intact. */
export interface Bookmark {
	id: string;
	pageIndex: number;
	/** Accessible name, also used as the default bookmark content. */
	label: string;
	data?: unknown;
	className?: string;
}

export interface BookmarkContext {
	currentPageIndex: number;
	/** Index of the leaf containing the first page of the current spread. */
	currentLeafIndex: number;
	direction: "ltr" | "rtl";
}

export type BookmarkPlacement = "top" | "bottom" | "sides" | "left" | "right" | "top-bottom";

/** Configuration for book-wide bookmarks. Strings render as text, never HTML. */
export interface BookmarkProvider<Content = string | HTMLElement> {
	getBookmarks: (context: BookmarkContext) => readonly Bookmark[];
	renderBookmark?: (bookmark: Bookmark) => Content;
	placement?: BookmarkPlacement;
	/** Page order runs left to right on horizontal rails and top to bottom on side rails. */
	order?: "page" | "reverse-page" | ((a: Bookmark, b: Bookmark) => number);
	className?: string;
	/** Replaces the default page jump. Receives the current leaf at activation time. */
	onClick?: (currentLeafIndex: number, bookmark: Bookmark) => void;
}

type Edge = "top" | "right" | "bottom" | "left";

export interface BookmarkInsets {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export interface BookmarkBounds {
	left: number;
	top: number;
	width: number;
	height: number;
}

interface BookmarkItem {
	bookmark: Bookmark;
	renderer: BookmarkProvider["renderBookmark"];
	button: HTMLButtonElement;
	content: HTMLSpanElement;
	click: (event: MouseEvent) => void;
}

const EDGES: readonly Edge[] = ["top", "right", "bottom", "left"];
const DEFAULT_DEPTH = 28;

function stopBookGesture(event: Event): void {
	event.stopPropagation();
}

/** An independent overlay: bookmark tabs never participate in page folding or buffering. */
export class BookmarkLayer {
	private readonly element: HTMLDivElement;
	private readonly depthMeasure: HTMLSpanElement;
	private readonly rails = new Map<Edge, HTMLDivElement>();
	private readonly items = new Map<string, BookmarkItem>();
	private provider: BookmarkProvider | undefined;
	private bounds: BookmarkBounds | undefined;
	private destroyed = false;

	constructor(
		private readonly host: HTMLElement,
		private readonly getContext: () => BookmarkContext,
		private readonly jump: (pageIndex: number) => void,
		private readonly pagesCount: number,
	) {
		const document = host.ownerDocument;
		this.element = document.createElement("div");
		this.element.className = "flipbook-bookmarks";
		this.element.setAttribute("data-flipbook-no-flip", "");
		this.element.setAttribute("aria-label", "Bookmarks");
		this.element.setAttribute("role", "navigation");
		this.element.style.setProperty("--flipbook-bookmark-layer-z", `${pagesCount * 4 + 1}`);
		this.element.hidden = true;
		for (const event of ["pointerdown", "mousedown", "touchstart", "click", "dragstart"]) {
			this.element.addEventListener(event, stopBookGesture);
		}
		this.depthMeasure = document.createElement("span");
		this.depthMeasure.className = "flipbook-bookmarks__measure";
		this.depthMeasure.setAttribute("aria-hidden", "true");
		this.element.append(this.depthMeasure);
		for (const edge of EDGES) {
			const rail = document.createElement("div");
			rail.className = `flipbook-bookmarks__rail flipbook-bookmarks__rail--${edge}`;
			rail.dataset.edge = edge;
			rail.hidden = true;
			this.rails.set(edge, rail);
			this.element.append(rail);
		}
		host.append(this.element);
	}

	setProvider(provider?: BookmarkProvider): void {
		if (this.destroyed) return;
		this.provider = provider;
		this.refresh();
	}

	/** Re-read provider data after navigation or a consumer configuration update. */
	refresh(): void {
		if (this.destroyed) return;
		const provider = this.provider;
		const context = this.getContext();
		const bookmarks = this.getValidBookmarks(context);
		const focused = this.element.querySelector<HTMLButtonElement>(".flipbook-bookmark:focus");
		this.element.className = `flipbook-bookmarks ${provider?.className ?? ""}`.trim();
		this.element.hidden = bookmarks.length === 0;
		this.removeRetiredBookmarks(bookmarks);
		for (const bookmark of bookmarks) this.placeItem(bookmark, context);
		for (const rail of this.rails.values()) rail.hidden = rail.childElementCount === 0;
		if (this.bounds) this.layout(this.bounds);
		if (focused?.isConnected) focused.focus({ preventScroll: true });
	}

	private removeRetiredBookmarks(bookmarks: readonly Bookmark[]): void {
		const retainedIds = new Set(bookmarks.map((bookmark) => bookmark.id));
		for (const [id, item] of this.items) {
			if (!retainedIds.has(id)) {
				item.button.removeEventListener("click", item.click);
				item.button.remove();
				this.items.delete(id);
			}
		}
	}

	private placeItem(bookmark: Bookmark, context: BookmarkContext): void {
		const item = this.getItem(bookmark, this.provider?.renderBookmark);
		item.button.className = `flipbook-bookmark ${bookmark.className ?? ""}`.trim();
		item.button.dataset.pageIndex = String(bookmark.pageIndex);
		item.button.setAttribute("aria-label", bookmark.label);
		item.button.dir = context.direction;
		const current =
			bookmark.pageIndex === context.currentPageIndex ||
			bookmark.pageIndex === context.currentPageIndex + 1;
		if (current) item.button.setAttribute("aria-current", "page");
		else item.button.removeAttribute("aria-current");
		this.rails.get(this.getEdge(bookmark, context))?.append(item.button);
	}

	/** Reserve both split rails so navigating never shifts the book's resting position. */
	getInsets(): BookmarkInsets {
		const insets: BookmarkInsets = { top: 0, right: 0, bottom: 0, left: 0 };
		if (this.destroyed || this.items.size === 0) return insets;
		const depth = this.getDepth();
		const placement = this.provider?.placement ?? "sides";
		if (placement === "sides") {
			insets.left = depth;
			insets.right = depth;
		} else if (placement === "top-bottom") {
			insets.top = depth;
			insets.bottom = depth;
		} else {
			insets[placement] = depth;
		}
		return insets;
	}

	/** Position tab rails just outside the resting page spread. */
	layout(bounds: BookmarkBounds): void {
		if (this.destroyed) return;
		this.bounds = bounds;
		const depth = this.getDepth();
		for (const [edge, rail] of this.rails) {
			const horizontal = edge === "top" || edge === "bottom";
			const left =
				edge === "left" ? bounds.left - depth : bounds.left + (edge === "right" ? bounds.width : 0);
			const top =
				edge === "top" ? bounds.top - depth : bounds.top + (edge === "bottom" ? bounds.height : 0);
			rail.style.left = `${left}px`;
			rail.style.top = `${top}px`;
			rail.style.width = `${Math.max(0, horizontal ? bounds.width : depth)}px`;
			rail.style.height = `${Math.max(0, horizontal ? depth : bounds.height)}px`;
		}
	}

	destroy(): void {
		for (const item of this.items.values()) {
			item.button.removeEventListener("click", item.click);
		}
		for (const event of ["pointerdown", "mousedown", "touchstart", "click", "dragstart"]) {
			this.element.removeEventListener(event, stopBookGesture);
		}
		this.items.clear();
		this.element.remove();
		this.provider = undefined;
		this.destroyed = true;
	}

	private getValidBookmarks(context: BookmarkContext): Bookmark[] {
		const seen = new Set<string>();
		const bookmarks = (this.provider?.getBookmarks(context) ?? []).filter((bookmark) => {
			const valid = this.isValidBookmark(bookmark) && !seen.has(bookmark.id);
			if (valid) seen.add(bookmark.id);
			return valid;
		});
		const order = this.provider?.order;
		if (typeof order === "function") return bookmarks.sort(order);
		const sign = order === "reverse-page" ? -1 : 1;
		return bookmarks.sort((a, b) => sign * (a.pageIndex - b.pageIndex));
	}

	private isValidBookmark(bookmark: Bookmark): boolean {
		return (
			typeof bookmark.id === "string" &&
			bookmark.id.length > 0 &&
			Number.isInteger(bookmark.pageIndex) &&
			bookmark.pageIndex >= 0 &&
			bookmark.pageIndex < this.pagesCount
		);
	}

	private getEdge(bookmark: Bookmark, context: BookmarkContext): Edge {
		const placement = this.provider?.placement ?? "sides";
		if (placement !== "sides" && placement !== "top-bottom") return placement;
		const lastTurnedLeaf = Math.floor((context.currentPageIndex - 1) / 2);
		const turned = Math.floor(bookmark.pageIndex / 2) <= lastTurnedLeaf;
		const left = turned === (context.direction === "ltr");
		if (placement === "top-bottom") return left ? "top" : "bottom";
		return left ? "left" : "right";
	}

	private getItem(bookmark: Bookmark, renderer: BookmarkProvider["renderBookmark"]): BookmarkItem {
		let item = this.items.get(bookmark.id);
		if (!item) {
			const button = this.host.ownerDocument.createElement("button");
			button.type = "button";
			button.dataset.bookmarkId = bookmark.id;
			const content = this.host.ownerDocument.createElement("span");
			content.className = "flipbook-bookmark__content";
			content.inert = true;
			content.setAttribute("aria-hidden", "true");
			button.append(content);
			const click = (event: MouseEvent) => {
				event.preventDefault();
				const current = this.items.get(bookmark.id);
				if (!current || this.destroyed) return;
				const action = this.provider?.onClick;
				if (action) action(this.getContext().currentLeafIndex, current.bookmark);
				else this.jump(current.bookmark.pageIndex);
			};
			button.addEventListener("click", click);
			item = { bookmark, renderer, button, content, click };
			this.items.set(bookmark.id, item);
			content.replaceChildren(renderer ? renderer(bookmark) : bookmark.label);
		} else if (item.bookmark !== bookmark || item.renderer !== renderer) {
			item.content.replaceChildren(renderer ? renderer(bookmark) : bookmark.label);
		}
		item.bookmark = bookmark;
		item.renderer = renderer;
		return item;
	}

	private getDepth(): number {
		const view = this.host.ownerDocument.defaultView;
		if (!view) return DEFAULT_DEPTH;
		const raw =
			view.getComputedStyle(this.element).getPropertyValue("--flipbook-bookmark-depth") ||
			view.getComputedStyle(this.host).getPropertyValue("--flipbook-bookmark-depth");
		if (/^\s*\d+(\.\d+)?(px)?\s*$/.test(raw)) return Number.parseFloat(raw);
		const resolved = Number.parseFloat(view.getComputedStyle(this.depthMeasure).width);
		return Number.isFinite(resolved) && resolved >= 0 ? resolved : DEFAULT_DEPTH;
	}
}
