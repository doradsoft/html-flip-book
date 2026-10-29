import "./bookmarks.scss";
import { writeAttribute, writeHidden, writeInert, writeStyle } from "./bookmark-dom";
import type { BookmarkLeafFrame } from "./bookmark-fold";
import { BookmarkMotion } from "./bookmark-motion";
import { BookmarkPreview } from "./bookmark-preview";
import { calculateBookmarkStack } from "./bookmark-stack";
import type { MouseMode } from "./flip-book-options";

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
	/** Full content revealed by an outward animation on hover or keyboard focus. */
	renderExpandedBookmark?: (bookmark: Bookmark) => Content;
	/** Long axis relative to the book edge. Default: perpendicular. */
	orientation?: "perpendicular" | "parallel";
	/** Follow the owning leaf through its fold or remain fixed around the book. Default: leaf. */
	attachment?: "leaf" | "pinned";
	placement?: BookmarkPlacement;
	/** Sort by page by default, reverse page order, or use a custom comparator. */
	order?: "page" | "reverse-page" | ((a: Bookmark, b: Bookmark) => number);
	className?: string;
	/** Replaces the default page jump. Receives the current leaf at activation time. */
	onClick?: (currentLeafIndex: number, bookmark: Bookmark) => void;
}

type Edge = "top" | "right" | "bottom" | "left";
type RailPlacementCursors = Map<HTMLElement, HTMLElement>;

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

interface BookmarkLeaf {
	id: string;
	front: Bookmark;
	back: Bookmark;
}

interface BookmarkItem {
	leaf: BookmarkLeaf;
	bookmark: Bookmark;
	reverseBookmark: Bookmark;
	renderer: BookmarkProvider["renderBookmark"];
	button: HTMLButtonElement;
	slot: HTMLDivElement;
	content: HTMLSpanElement;
	reverse: HTMLSpanElement;
	expanded: HTMLSpanElement;
	expandedRenderer: BookmarkProvider["renderExpandedBookmark"];
	edge: Edge;
	click: (event: MouseEvent) => void;
}

const EDGES: readonly Edge[] = ["top", "right", "bottom", "left"];
const DEFAULT_DEPTH = 28;

function stopBookGesture(event: Event): void {
	event.stopPropagation();
}

/** Independent rails keep tabs outside page clipping; attached tabs follow their leaf geometry. */
export class BookmarkLayer {
	private readonly element: HTMLDivElement;
	private readonly depthMeasure: HTMLSpanElement;
	private readonly rails = new Map<Edge, HTMLDivElement>();
	private readonly groups = new Map<string, HTMLDivElement>();
	private readonly items = new Map<string, BookmarkItem>();
	private orderedLeafIds: string[] = [];
	private pendingTabRestore: (() => void) | undefined;
	private tabRestoreTimer: number | undefined;
	private readonly storage: HTMLDivElement;
	private readonly preview: BookmarkPreview;
	private readonly motion: BookmarkMotion;
	private readonly leafFrames = new Map<number, { frame: BookmarkLeafFrame; page: HTMLElement }>();
	private provider: BookmarkProvider | undefined;
	private bounds: BookmarkBounds | undefined;
	private destroyed = false;
	private mouseMode: MouseMode = "turn";

	constructor(
		private readonly host: HTMLElement,
		private readonly getContext: () => BookmarkContext,
		private readonly jump: (pageIndex: number) => void,
		private readonly pagesCount: number,
		private readonly onPointerDown?: (event: PointerEvent) => void,
	) {
		const document = host.ownerDocument;
		this.element = document.createElement("div");
		this.element.className = "flipbook-bookmarks";
		this.element.setAttribute("data-flipbook-no-flip", "");
		this.element.setAttribute("aria-label", "Bookmarks");
		this.element.setAttribute("role", "navigation");
		this.element.hidden = true;
		this.element.dataset.orientation = "perpendicular";
		this.storage = document.createElement("div");
		this.storage.hidden = true;
		this.element.append(this.storage);
		this.preview = new BookmarkPreview(this.element, this.storage);
		this.motion = new BookmarkMotion(host);
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
		// Equal-depth bookmark material stays below its paper surface, including covers.
		const firstPage = Array.from(host.children).find((child) => child.matches(".page"));
		host.insertBefore(this.element, firstPage ?? null);
	}

	setProvider(provider?: BookmarkProvider): void {
		if (this.destroyed) return;
		this.provider = provider;
		this.refresh();
	}

	setMouseMode(mode: MouseMode): void {
		this.mouseMode = mode;
		for (const item of this.items.values()) this.applyMouseMode(item);
	}

	private applyMouseMode(item: BookmarkItem): void {
		writeAttribute(item.button, "data-mouse-mode", this.mouseMode);
		writeInert(item.content, this.mouseMode === "turn");
		writeInert(item.reverse, this.mouseMode === "turn");
		writeInert(item.expanded, this.mouseMode === "turn");
	}

	/** Re-read provider data after navigation or a consumer configuration update. */
	refresh(): void {
		if (this.destroyed) return;
		this.restoreTabStops();
		this.motion.restoreAll();
		this.preview.close();
		const provider = this.provider;
		const context = this.getContext();
		const bookmarks = this.getValidBookmarks(context);
		this.orderedLeafIds = bookmarks.map((leaf) => leaf.id);
		const focused = this.element.querySelector<HTMLButtonElement>(".flipbook-bookmark:focus");
		writeAttribute(this.element, "class", `flipbook-bookmarks ${provider?.className ?? ""}`.trim());
		writeAttribute(this.element, "data-orientation", provider?.orientation ?? "perpendicular");
		writeAttribute(this.element, "data-attachment", provider?.attachment ?? "leaf");
		writeStyle(this.element, "--bookmark-count", String(bookmarks.length));
		writeHidden(this.element, bookmarks.length === 0);
		this.removeRetiredBookmarks(bookmarks);
		const placements: RailPlacementCursors = new Map();
		bookmarks.forEach((bookmark, index) => {
			this.placeItem(bookmark, context, index, bookmarks.length, placements);
		});
		for (const group of this.groups.values()) {
			if (this.provider?.attachment === "pinned" && group.childElementCount === 0) group.remove();
		}
		for (const rail of this.rails.values())
			writeHidden(rail, rail.querySelector(".flipbook-bookmark:not([hidden])") === null);
		if (this.bounds) this.layout(this.bounds);
		if (focused?.isConnected) focused.focus({ preventScroll: true });
	}

	private removeRetiredBookmarks(bookmarks: readonly BookmarkLeaf[]): void {
		const retainedIds = new Set(bookmarks.map((bookmark) => bookmark.id));
		for (const [id, item] of this.items) {
			if (!retainedIds.has(id)) {
				this.motion.restore(id);
				item.button.removeEventListener("click", item.click);
				item.slot.remove();
				item.reverse.remove();
				item.expanded.remove();
				this.items.delete(id);
			}
		}
	}

	private placeItem(
		leaf: BookmarkLeaf,
		context: BookmarkContext,
		slot: number,
		count: number,
		placements: RailPlacementCursors,
	): void {
		const item = this.getItem(leaf, context, this.provider?.renderBookmark);
		const bookmark = item.bookmark;
		writeAttribute(item.button, "class", `flipbook-bookmark ${bookmark.className ?? ""}`.trim());
		writeAttribute(item.button, "data-page-index", String(bookmark.pageIndex));
		writeAttribute(item.button, "data-bookmark-id", bookmark.id);
		writeAttribute(
			item.button,
			"data-spread-index",
			String(Math.floor((bookmark.pageIndex + 1) / 2)),
		);
		writeAttribute(item.button, "data-face", this.isTurned(bookmark, context) ? "1" : "0");
		writeAttribute(item.button, "aria-label", bookmark.label);
		writeAttribute(item.button, "dir", context.direction);
		item.edge = this.getEdge(bookmark, context, slot, count);
		const fixedSide = item.edge === "left" || item.edge === "right";
		writeHidden(
			item.button,
			this.provider?.attachment !== "pinned" &&
				fixedSide &&
				item.edge !== this.getLeafSide(bookmark, context),
		);
		writeHidden(item.slot, Boolean(item.button.hidden));
		writeAttribute(item.button, "data-edge", item.edge);
		writeAttribute(item.button, "data-orientation", this.provider?.orientation ?? "perpendicular");
		writeAttribute(item.slot, "data-edge", item.edge);
		writeAttribute(item.slot, "data-orientation", this.provider?.orientation ?? "perpendicular");
		if (!fixedSide) this.clearStackSlot(item.slot);
		writeAttribute(item.button, "data-leaf-index", String(this.getLeafIndex(bookmark)));
		writeStyle(item.button, "--bookmark-slot", String(slot + 1));
		writeStyle(item.slot, "--bookmark-slot", String(slot + 1));
		const current =
			Math.floor((bookmark.pageIndex + 1) / 2) === Math.floor((context.currentPageIndex + 1) / 2);
		writeAttribute(item.button, "aria-current", current ? "page" : null);
		const rail = this.getItemRail(item.edge, bookmark, context);
		if (rail) {
			const previous = placements.get(rail);
			const next = previous ? previous.nextSibling : rail.firstChild;
			if (next !== item.slot) rail.insertBefore(item.slot, next);
			placements.set(rail, item.slot);
		}
	}

	private getItemRail(
		edge: Edge,
		bookmark: Bookmark,
		context: BookmarkContext,
	): HTMLElement | undefined {
		const rail = this.rails.get(edge);
		if (!rail || this.provider?.attachment === "pinned" || edge === "left" || edge === "right")
			return rail;
		const side = this.getLeafSide(bookmark, context);
		for (const leafSide of ["left", "right"]) {
			const key = `${edge}:${leafSide}`;
			let group = this.groups.get(key);
			if (!group) {
				group = this.host.ownerDocument.createElement("div");
				group.className = "flipbook-bookmarks__leaf-rail";
				group.dataset.leafSide = leafSide;
				this.groups.set(key, group);
			}
			if (group.parentElement !== rail) rail.append(group);
		}
		return this.groups.get(`${edge}:${side}`);
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
		this.motion.restoreAll();
		this.preview.close();
		this.bounds = bounds;
		const depth = this.getDepth();
		for (const [edge, rail] of this.rails) {
			const horizontal = edge === "top" || edge === "bottom";
			const left =
				edge === "left" ? bounds.left - depth : bounds.left + (edge === "right" ? bounds.width : 0);
			const top =
				edge === "top" ? bounds.top - depth : bounds.top + (edge === "bottom" ? bounds.height : 0);
			if (edge !== "left") writeStyle(rail, "left", `${left}px`);
			writeStyle(rail, "top", `${top}px`);
			if (horizontal) writeStyle(rail, "width", `${Math.max(0, bounds.width)}px`);
			writeStyle(rail, "height", `${Math.max(0, horizontal ? depth : bounds.height)}px`);
		}
		this.layoutSideStacks(bounds, depth);
		for (const [index, pose] of this.leafFrames) this.updateLeaf(index, pose.frame, pose.page);
	}

	private layoutSideStacks(bounds: BookmarkBounds, depth: number): void {
		const length = this.getSize(
			"--flipbook-bookmark-length",
			"height",
			this.provider?.orientation === "parallel" ? 72 : 24,
		);
		const preferredStep = this.getSize("--flipbook-bookmark-stack-step", "marginTop", depth * 0.3);
		const view = this.host.ownerDocument.defaultView;
		for (const edge of ["left", "right"] as const) {
			const rail = this.rails.get(edge);
			if (!rail) continue;
			const rawGap = Number.parseFloat(view?.getComputedStyle(rail).rowGap ?? "");
			const gap = Number.isFinite(rawGap) && rawGap >= 0 ? rawGap : 4;
			const stack = calculateBookmarkStack(
				this.orderedLeafIds.length,
				bounds.height,
				length,
				depth,
				gap,
				preferredStep,
				edge === "left" ? bounds.left : this.host.clientWidth - bounds.left - bounds.width,
				this.provider?.orientation === "parallel" ? 1 : 0,
			);
			writeAttribute(rail, "data-stack-capacity", String(stack.capacity));
			writeAttribute(rail, "data-stack-layers", String(stack.layers));
			writeAttribute(rail, "data-stack-pitch", String(stack.pitch));
			writeAttribute(rail, "data-stack-stagger", String(stack.stagger));
			writeStyle(rail, "width", `${stack.depth}px`);
			writeStyle(rail, "z-index", String(this.getRestingRailZIndex(edge)));
			if (edge === "left") writeStyle(rail, "left", `${bounds.left - stack.depth}px`);
			this.orderedLeafIds.forEach((id, rank) => {
				const item = this.items.get(id);
				if (!item || item.edge !== edge) return;
				const layer = Math.floor(rank / stack.capacity);
				const row = rank % stack.capacity;
				const width = stack.frontDepth + layer * stack.step;
				const slot = item.slot;
				writeAttribute(slot, "data-stack-layer", String(layer));
				writeAttribute(slot, "data-stack-row", String(row));
				writeAttribute(slot, "data-stack-peek", String(layer === 0 ? width : stack.step));
				writeStyle(slot, "--bookmark-exposed-depth", `${width}px`);
				writeStyle(slot, "--bookmark-exposed-length", `${stack.length}px`);
				writeStyle(slot, "top", `${row * stack.pitch + (layer % 2) * stack.stagger}px`);
				writeStyle(slot, "width", `${width}px`);
				writeStyle(slot, "height", `${stack.length}px`);
				writeStyle(slot, "z-index", String(stack.layers - layer));
			});
		}
	}

	private getRestingRailZIndex(edge: Edge): number {
		const context = this.getContext();
		let depth = 0;
		for (const item of this.items.values()) {
			if (item.edge !== edge || item.button.hidden) continue;
			const page = this.getLeafIndex(item.bookmark) * 2;
			depth = Math.max(
				depth,
				this.isTurned(item.bookmark, context) ? page + 1 : this.pagesCount - page,
			);
		}
		// The earlier root keeps equal-depth tabs beneath paper, above the backing board.
		return depth;
	}

	private clearStackSlot(slot: HTMLElement): void {
		for (const name of ["data-stack-layer", "data-stack-row", "data-stack-peek"])
			writeAttribute(slot, name, null);
		for (const property of [
			"--bookmark-exposed-depth",
			"--bookmark-exposed-length",
			"top",
			"width",
			"height",
			"z-index",
		])
			writeStyle(slot, property, "");
	}

	/** Receive the same geometry used to draw the leaf, including its live crease. */
	updateLeaf(index: number, frame: BookmarkLeafFrame, page: HTMLElement): void {
		this.leafFrames.set(index, { frame, page });
		for (const item of this.items.values()) {
			if (this.getLeafIndex(item.bookmark) !== index) continue;
			writeStyle(
				item.button,
				"z-index",
				String(frame.zIndices[this.isTurned(item.bookmark, this.getContext()) ? 1 : 0]),
			);
			if (this.provider?.attachment === "pinned") continue;
			if (item.button.hidden) continue;
			// A resting page's corner hover should not curl its bookmark material.
			if (frame.restingPosition === 0 || frame.restingPosition === 1) {
				this.motion.restore(item.leaf.id);
				continue;
			}
			this.preview.close();
			this.motion.sync(
				{ id: item.leaf.id, pageIndex: index * 2 },
				item.button,
				frame,
				page,
				this.provider?.className,
				{
					activeFace: this.isTurned(item.bookmark, this.getContext()) ? 1 : 0,
					reverse: item.leaf.front === item.leaf.back ? undefined : item.reverse,
					front: item.leaf.front,
					back: item.leaf.back,
				},
			);
		}
	}

	destroy(): void {
		this.restoreTabStops();
		this.preview.destroy();
		this.motion.destroy();
		for (const item of this.items.values()) {
			item.button.removeEventListener("click", item.click);
		}
		for (const event of ["pointerdown", "mousedown", "touchstart", "click", "dragstart"]) {
			this.element.removeEventListener(event, stopBookGesture);
		}
		this.items.clear();
		this.orderedLeafIds = [];
		this.leafFrames.clear();
		this.groups.clear();
		this.element.remove();
		this.provider = undefined;
		this.destroyed = true;
	}

	private getValidBookmarks(context: BookmarkContext): BookmarkLeaf[] {
		const seen = new Set<string>();
		const bookmarks = (this.provider?.getBookmarks(context) ?? []).filter((bookmark) => {
			const valid = this.isValidBookmark(bookmark) && !seen.has(bookmark.id);
			if (valid) seen.add(bookmark.id);
			return valid;
		});
		const order = this.provider?.order;
		if (typeof order === "function") bookmarks.sort(order);
		else {
			const sign = order === "reverse-page" ? -1 : 1;
			bookmarks.sort((a, b) => sign * (a.pageIndex - b.pageIndex));
		}
		const spreads = new Map<number, Bookmark>();
		for (const bookmark of bookmarks) {
			const index = Math.floor((bookmark.pageIndex + 1) / 2);
			if (!spreads.has(index)) spreads.set(index, bookmark);
		}
		return Array.from(spreads, ([index, bookmark]) => ({
			id: `spread-${index}`,
			front: bookmark,
			back: bookmark,
		}));
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

	private getEdge(bookmark: Bookmark, context: BookmarkContext, slot: number, count: number): Edge {
		const placement = this.provider?.placement ?? "sides";
		if (placement !== "sides" && placement !== "top-bottom") return placement;
		if (placement === "top-bottom" && this.provider?.attachment !== "pinned") {
			return slot < Math.ceil(count / 2) ? "top" : "bottom";
		}
		const side = this.getLeafSide(bookmark, context);
		if (placement === "top-bottom") return side === "left" ? "top" : "bottom";
		return side;
	}

	private getLeafSide(bookmark: Bookmark, context: BookmarkContext): "left" | "right" {
		const turned = this.isTurned(bookmark, context);
		return turned === (context.direction === "ltr") ? "left" : "right";
	}

	private isTurned(bookmark: Bookmark, context: BookmarkContext): boolean {
		return this.getLeafIndex(bookmark) <= Math.floor((context.currentPageIndex - 1) / 2);
	}

	private getLeafIndex(bookmark: Bookmark): number {
		return Math.max(0, Math.floor((bookmark.pageIndex - 1) / 2));
	}

	private getItem(
		leaf: BookmarkLeaf,
		context: BookmarkContext,
		renderer: BookmarkProvider["renderBookmark"],
	): BookmarkItem {
		const turned = this.isTurned(leaf.front, context);
		const bookmark = turned ? leaf.back : leaf.front;
		const reverseBookmark = turned ? leaf.front : leaf.back;
		let item = this.items.get(leaf.id);
		if (!item) {
			const slot = this.host.ownerDocument.createElement("div");
			slot.className = "flipbook-bookmark-slot";
			const button = this.host.ownerDocument.createElement("button");
			button.type = "button";
			slot.append(button);
			const content = this.host.ownerDocument.createElement("span");
			content.className = "flipbook-bookmark__content";
			content.inert = true;
			content.setAttribute("aria-hidden", "true");
			button.append(content);
			const reverse = content.cloneNode(false) as HTMLSpanElement;
			reverse.hidden = true;
			const expanded = this.host.ownerDocument.createElement("span");
			expanded.className = "flipbook-bookmark__expanded-content";
			expanded.inert = true;
			expanded.hidden = true;
			this.storage.append(reverse, expanded);
			const click = (event: MouseEvent) => {
				event.preventDefault();
				const selection = button.ownerDocument.getSelection();
				if (
					this.mouseMode === "select" &&
					selection &&
					!selection.isCollapsed &&
					(button.contains(selection.anchorNode) || button.contains(selection.focusNode))
				)
					return;
				if (button.dataset.bookmarkDragged === "true") {
					delete button.dataset.bookmarkDragged;
					event.stopPropagation();
					return;
				}
				const current = this.items.get(leaf.id);
				if (!current || this.destroyed) return;
				const selected =
					current.button.dataset.face === "1" ? current.leaf.back : current.leaf.front;
				const action = this.provider?.onClick;
				if (action) action(this.getContext().currentLeafIndex, selected);
				else this.jump(selected.pageIndex);
			};
			button.addEventListener("click", click);
			item = {
				leaf,
				bookmark,
				reverseBookmark,
				renderer,
				button,
				slot,
				content,
				reverse,
				click,
				expanded,
				expandedRenderer: undefined,
				edge: "right",
			};
			this.items.set(leaf.id, item);
			this.bindPreview(item);
			content.replaceChildren(renderer ? renderer(bookmark) : bookmark.label);
			if (reverseBookmark !== bookmark)
				reverse.replaceChildren(renderer ? renderer(reverseBookmark) : reverseBookmark.label);
		} else {
			if (item.bookmark !== bookmark || item.renderer !== renderer)
				item.content.replaceChildren(renderer ? renderer(bookmark) : bookmark.label);
			if (item.reverseBookmark !== reverseBookmark || item.renderer !== renderer)
				if (reverseBookmark === bookmark) item.reverse.replaceChildren();
				else
					item.reverse.replaceChildren(
						renderer ? renderer(reverseBookmark) : reverseBookmark.label,
					);
		}
		const bookmarkChanged = item.bookmark !== bookmark;
		item.leaf = leaf;
		item.bookmark = bookmark;
		item.reverseBookmark = reverseBookmark;
		item.renderer = renderer;
		const expandedRenderer = this.provider?.renderExpandedBookmark;
		if (
			expandedRenderer &&
			(bookmarkChanged ||
				item.expandedRenderer !== expandedRenderer ||
				item.expanded.dataset.label !== bookmark.label)
		) {
			item.expanded.replaceChildren(expandedRenderer(bookmark));
			item.expanded.dataset.label = bookmark.label;
		} else if (!expandedRenderer && item.expanded.hasChildNodes()) item.expanded.replaceChildren();
		item.expandedRenderer = expandedRenderer;
		this.applyMouseMode(item);
		return item;
	}

	private bindPreview(item: BookmarkItem): void {
		const open = () => {
			if (!item.expandedRenderer || item.button.dataset.bookmarkMotion === "true") return;
			this.preview.open(item.button, item.expanded, item.edge, this.provider?.className);
		};
		item.button.addEventListener("pointerenter", (event) => {
			if (
				event.pointerType !== "touch" &&
				item.expandedRenderer &&
				item.button.dataset.bookmarkMotion !== "true"
			) {
				this.preview.schedule(item.button, item.expanded, item.edge, this.provider?.className);
			}
		});
		item.button.addEventListener("pointerdown", (event) => {
			this.preview.cancelHover();
			this.preview.suppressUntilPointerMove();
			this.onPointerDown?.(event);
		});
		item.button.addEventListener("pointerleave", (event) =>
			this.preview.leave(event.relatedTarget),
		);
		item.button.addEventListener("focus", () => {
			if (item.button.matches(":focus-visible")) open();
		});
		item.button.addEventListener("blur", (event) => this.preview.leave(event.relatedTarget));
		item.button.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") delete item.button.dataset.bookmarkDragged;
			if (event.key === "Escape") this.preview.close(false);
			if (event.key === "Tab") this.traverseBookmarks(item, event);
		});
	}

	private traverseBookmarks(item: BookmarkItem, event: KeyboardEvent): void {
		if (
			event.defaultPrevented ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			event.target !== item.button
		)
			return;
		this.restoreTabStops();
		this.preview.close();
		const ordered = this.orderedLeafIds
			.map((id) => this.items.get(id))
			.filter((entry): entry is BookmarkItem => Boolean(entry && this.isTabAvailable(entry)));
		const index = ordered.indexOf(item);
		if (index < 0) return;
		const step = event.shiftKey ? -1 : 1;
		const next = ordered[index + step];
		if (next) {
			event.preventDefault();
			next.slot.scrollIntoView({ block: "nearest", inline: "nearest" });
			next.button.focus({ preventScroll: true });
			return;
		}
		const external = this.externalTabStop(step);
		if (external) {
			event.preventDefault();
			external.focus();
			return;
		}
		// Native Tab may leave the document for browser chrome. Exclude sibling tabs
		// for this one default action so physical rail order cannot wrap the navigation.
		this.releaseNativeTab();
	}

	private isTabAvailable(item: BookmarkItem): boolean {
		if (item.button.hidden || item.button.disabled || item.slot.closest("[hidden], [inert]"))
			return false;
		const style = this.host.ownerDocument.defaultView?.getComputedStyle(item.button);
		return style?.display !== "none" && style?.visibility !== "hidden";
	}

	private externalTabStop(step: 1 | -1): HTMLElement | undefined {
		const selector =
			'a[href], area[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable="true"]';
		const side = step === 1 ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING;
		const candidates = Array.from(this.host.ownerDocument.querySelectorAll<HTMLElement>(selector))
			.filter((element) => this.isExternalTabStop(element))
			.filter((element) => Boolean(this.element.compareDocumentPosition(element) & side));
		return step === 1 ? candidates[0] : candidates.at(-1);
	}

	private isExternalTabStop(element: HTMLElement): boolean {
		const tabbable =
			element.tabIndex >= 0 || (element.isContentEditable && !element.hasAttribute("tabindex"));
		if (
			!tabbable ||
			element.matches(":disabled") ||
			this.element.contains(element) ||
			element.closest("[hidden], [inert], .flipbook-bookmark-preview, .flipbook-bookmark-surface")
		)
			return false;
		const style = this.host.ownerDocument.defaultView?.getComputedStyle(element);
		return style?.visibility !== "hidden" && element.getClientRects().length > 0;
	}

	private releaseNativeTab(): void {
		const saved = Array.from(this.items.values(), ({ button }) => ({
			button,
			attribute: button.getAttribute("tabindex"),
		}));
		for (const { button } of saved) button.tabIndex = -1;
		this.pendingTabRestore = () => {
			for (const { button, attribute } of saved) {
				if (attribute === null) button.removeAttribute("tabindex");
				else button.setAttribute("tabindex", attribute);
			}
		};
		this.tabRestoreTimer = this.host.ownerDocument.defaultView?.setTimeout(
			() => this.restoreTabStops(),
			0,
		);
	}

	private restoreTabStops(): void {
		if (this.tabRestoreTimer !== undefined)
			this.host.ownerDocument.defaultView?.clearTimeout(this.tabRestoreTimer);
		this.tabRestoreTimer = undefined;
		this.pendingTabRestore?.();
		this.pendingTabRestore = undefined;
	}

	private getDepth(): number {
		return this.getSize(
			"--flipbook-bookmark-depth",
			"width",
			this.provider?.orientation === "parallel" ? DEFAULT_DEPTH : 52,
		);
	}

	private getSize(
		property: string,
		dimension: "width" | "height" | "marginTop",
		fallback: number,
	): number {
		const view = this.host.ownerDocument.defaultView;
		if (!view) return fallback;
		const raw =
			view.getComputedStyle(this.element).getPropertyValue(property) ||
			view.getComputedStyle(this.host).getPropertyValue(property);
		if (/^\s*\d+(\.\d+)?(px)?\s*$/.test(raw)) return Number.parseFloat(raw);
		const resolved = Number.parseFloat(view.getComputedStyle(this.depthMeasure)[dimension]);
		return Number.isFinite(resolved) && resolved >= 0 ? resolved : fallback;
	}
}
