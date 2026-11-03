import { writeAttribute, writeHidden, writeStyle } from "./bookmark-dom";
import {
	type BookmarkFoldSurface,
	type BookmarkLeafFrame,
	type BookmarkSheetRectangle,
	getBookmarkFoldSurfaces,
} from "./bookmark-fold";

interface BookmarkTarget {
	id: string;
	pageIndex: number;
}

interface BookmarkFace extends BookmarkTarget {
	label: string;
}

interface BookmarkHostSpace {
	box: DOMRect;
	scaleX: number;
	scaleY: number;
	clientLeft: number;
	clientTop: number;
}

export interface BookmarkMotionFaces {
	activeFace: 0 | 1;
	reverse?: HTMLElement;
	front: BookmarkFace;
	back: BookmarkFace;
}

interface MovingFaces {
	data: BookmarkMotionFaces;
	brief: HTMLElement;
	briefHidden: HTMLElement["hidden"];
	reverseParent: Node | undefined;
	reverseNext: ChildNode | null;
	reverseHidden: HTMLElement["hidden"];
	attributes: Map<string, string | null>;
	visualFace: 0 | 1 | undefined;
	currentFace: 0 | 1 | undefined;
}

interface MovingBookmark {
	button: HTMLButtonElement;
	placeholder: HTMLSpanElement;
	rectangle: BookmarkSheetRectangle;
	exposed: BookmarkSheetRectangle;
	style: string;
	hidden: HTMLElement["hidden"];
	inert: boolean;
	surfaces: HTMLDivElement[];
	visual: HTMLButtonElement;
	storage: HTMLDivElement;
	appearance: [string, string][];
	surfaceLayouts: WeakMap<HTMLElement, string>;
	placedFaces: WeakMap<HTMLButtonElement, string>;
	faces?: MovingFaces;
	caption?: {
		bounds: BookmarkSheetRectangle;
		styles: Map<HTMLElement, string>;
	};
}

const FACE_ATTRIBUTES = ["data-face", "data-page-index", "data-bookmark-id", "aria-label"];

function moving(frame: BookmarkLeafFrame): boolean {
	return frame.fold !== undefined || (frame.position > 0 && frame.position < 1);
}

/** Companion surfaces keep protruding tab material outside the page's paint containment. */
export class BookmarkMotion {
	private readonly items = new Map<string, MovingBookmark>();
	private readonly prepared = new Map<string, MovingBookmark>();

	constructor(
		private readonly host: HTMLElement,
		private readonly getHostWidth: () => number = () => host.clientWidth,
	) {}

	/** Read resting geometry before page snapshot/fold styles invalidate layout. */
	prepare(
		bookmark: BookmarkTarget,
		button: HTMLButtonElement,
		frame: BookmarkLeafFrame,
		page0: HTMLElement,
		faces?: BookmarkMotionFaces,
	): void {
		if (this.items.has(bookmark.id)) return;
		this.prepared.set(bookmark.id, this.capture(button, frame, page0, faces));
	}

	sync(
		bookmark: BookmarkTarget,
		button: HTMLButtonElement,
		frame: BookmarkLeafFrame,
		page0: HTMLElement,
		className = "",
		faces?: BookmarkMotionFaces,
	): void {
		if (!moving(frame)) {
			this.restore(bookmark.id, true);
			return;
		}
		let item = this.items.get(bookmark.id);
		if (!item || item.button !== button) {
			const prepared = this.prepared.get(bookmark.id);
			this.restore(bookmark.id);
			item = prepared?.button === button ? prepared : this.capture(button, frame, page0, faces);
			button.before(item.placeholder);
			this.host.append(item.storage);
			this.items.set(bookmark.id, item);
		}
		const surfaces = getBookmarkFoldSurfaces(frame, item.exposed);
		this.renderSurfaces(bookmark, item, frame, page0, surfaces, className);
	}

	restore(id: string, preservePrepared = false): void {
		// An animation may first report its unchanged resting pose. Its prepared
		// geometry still belongs to the upcoming motion; consume it when the leaf moves.
		if (!preservePrepared) this.prepared.delete(id);
		const item = this.items.get(id);
		if (!item) return;
		item.placeholder.before(item.button);
		item.button.style.cssText = item.style;
		item.button.hidden = item.hidden;
		item.button.inert = item.inert;
		for (const [caption, style] of item.caption?.styles ?? []) caption.style.cssText = style;
		this.restoreFaces(item);
		delete item.button.dataset.bookmarkMotion;
		item.placeholder.remove();
		for (const surface of item.surfaces) surface.remove();
		item.storage.remove();
		this.items.delete(id);
	}

	restoreAll(): void {
		this.prepared.clear();
		for (const id of this.items.keys()) this.restore(id);
	}

	destroy(): void {
		this.restoreAll();
	}

	private baseLeft(page0: HTMLElement, width: number): number {
		if (page0.style.left) return Number.parseFloat(page0.style.left) || 0;
		return this.getHostWidth() - (Number.parseFloat(page0.style.right) || 0) - width;
	}

	private capture(
		button: HTMLButtonElement,
		frame: BookmarkLeafFrame,
		page0: HTMLElement,
		faces?: BookmarkMotionFaces,
	): MovingBookmark {
		// All tab parts share this resting coordinate system. No live DOM is
		// changed during capture, so measure the host only once for this turn.
		const space = this.captureHostSpace();
		const full = this.hostRectangle(button, space);
		const onRight = this.sourceOnRight(button, frame, faces);
		const rectangle = this.sheetRectangle(full, frame, page0, onRight);
		const visible = this.exposedRectangle(button, full, space);
		const exposed = this.sheetRectangle(visible, frame, page0, onRight);
		const caption = this.captureCaption(button, full, onRight, space, faces);
		const placeholder = this.makePlaceholder(button, rectangle);
		const visual = this.cloneVisual(button);
		const storage = this.host.ownerDocument.createElement("div");
		storage.hidden = true;
		storage.setAttribute("data-flipbook-no-flip", "");
		return {
			button,
			placeholder,
			rectangle,
			exposed,
			style: button.style.cssText,
			hidden: button.hidden,
			inert: button.inert,
			surfaces: [],
			visual,
			storage,
			appearance: this.captureAppearance(button),
			surfaceLayouts: new WeakMap(),
			placedFaces: new WeakMap(),
			faces: this.captureFaces(button, faces),
			caption,
		};
	}

	private exposedRectangle(
		button: HTMLButtonElement,
		full: BookmarkSheetRectangle,
		space: BookmarkHostSpace,
	): BookmarkSheetRectangle {
		const slot = button.closest<HTMLElement>(".flipbook-bookmark-slot");
		if (!slot) return full;
		const boxes = [full, this.hostRectangle(slot, space)];
		const group = slot.closest<HTMLElement>(".flipbook-bookmarks__leaf-rail");
		if (group) boxes.push(this.hostRectangle(group, space));
		const rail = slot.closest<HTMLElement>(".flipbook-bookmarks__rail");
		if (rail) boxes.push(this.hostRectangle(rail, space));
		const left = Math.max(...boxes.map((box) => box.left));
		const top = Math.max(...boxes.map((box) => box.top));
		const right = Math.min(...boxes.map((box) => box.left + box.width));
		const bottom = Math.min(...boxes.map((box) => box.top + box.height));
		return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
	}

	private sourceOnRight(
		button: HTMLButtonElement,
		frame: BookmarkLeafFrame,
		faces?: BookmarkMotionFaces,
	): boolean {
		if (faces) return frame.isLTR === (faces.activeFace === 0);
		const face = button.dataset.face;
		if (face === "0" || face === "1") return frame.isLTR === (face === "0");
		return frame.isLTR === frame.restingPosition <= 0.5;
	}

	private captureCaption(
		button: HTMLButtonElement,
		full: BookmarkSheetRectangle,
		onRight: boolean,
		space: BookmarkHostSpace,
		faces?: BookmarkMotionFaces,
	): MovingBookmark["caption"] {
		const brief = button.querySelector<HTMLElement>(".flipbook-bookmark__content");
		if (!brief) return undefined;
		const box = this.hostRectangle(brief, space);
		const visible = box.width > 0 && box.height > 0 ? box : full;
		const style = this.host.ownerDocument.defaultView?.getComputedStyle(button);
		const borderLeft = Number.parseFloat(style?.borderLeftWidth ?? "") || 0;
		const borderTop = Number.parseFloat(style?.borderTopWidth ?? "") || 0;
		const styles = new Map([[brief, brief.style.cssText]]);
		if (faces?.reverse) styles.set(faces.reverse, faces.reverse.style.cssText);
		return {
			bounds: {
				left:
					(onRight
						? visible.left - full.left
						: full.left + full.width - visible.left - visible.width) - borderLeft,
				top: visible.top - full.top - borderTop,
				width: visible.width,
				height: visible.height,
			},
			styles,
		};
	}

	private captureAppearance(button: HTMLButtonElement): [string, string][] {
		const style = this.host.ownerDocument.defaultView?.getComputedStyle(button);
		const names = [
			"--flipbook-bookmark-depth",
			"--flipbook-bookmark-length",
			"--flipbook-bookmark-full-length",
			"--bookmark-default-depth",
			"--bookmark-default-length",
			"--bookmark-exposed-depth",
			"--bookmark-exposed-length",
			"--bookmark-exposed-major",
		];
		return names.map((name) => [name, style?.getPropertyValue(name) ?? ""]);
	}

	private captureFaces(
		button: HTMLButtonElement,
		data?: BookmarkMotionFaces,
	): MovingFaces | undefined {
		const brief = button.querySelector<HTMLElement>(".flipbook-bookmark__content");
		if (!data || !brief) return undefined;
		return {
			data,
			brief,
			briefHidden: brief.hidden,
			reverseParent: data.reverse?.parentNode ?? (data.reverse ? this.host : undefined),
			reverseNext: data.reverse?.nextSibling ?? null,
			reverseHidden: data.reverse?.hidden ?? false,
			attributes: new Map(FACE_ATTRIBUTES.map((name) => [name, button.getAttribute(name)])),
			visualFace: undefined,
			currentFace: undefined,
		};
	}

	private returnReverse(faces: MovingFaces): void {
		const { reverse } = faces.data;
		if (!reverse || !faces.reverseParent) return;
		if (reverse.parentNode === faces.reverseParent) return;
		const next = faces.reverseNext;
		if (next?.parentNode === faces.reverseParent) faces.reverseParent.insertBefore(reverse, next);
		else faces.reverseParent.appendChild(reverse);
	}

	private restoreFaces(item: MovingBookmark): void {
		const faces = item.faces;
		if (!faces) return;
		faces.brief.hidden = faces.briefHidden;
		this.returnReverse(faces);
		if (faces.data.reverse) faces.data.reverse.hidden = faces.reverseHidden;
		for (const [name, value] of faces.attributes) {
			if (value === null) item.button.removeAttribute(name);
			else item.button.setAttribute(name, value);
		}
	}

	private showFace(item: MovingBookmark, face: 0 | 1): void {
		const faces = item.faces;
		if (!faces || faces.currentFace === face) return;
		faces.currentFace = face;
		const source = face === 0 ? faces.data.front : faces.data.back;
		writeAttribute(item.button, "data-face", String(face));
		writeAttribute(item.button, "data-page-index", String(source.pageIndex));
		writeAttribute(item.button, "data-bookmark-id", source.id);
		writeAttribute(item.button, "aria-label", source.label);
		const reverse = faces.data.reverse;
		const active = !reverse || face === faces.data.activeFace;
		if (faces.brief.hidden !== (!active || faces.briefHidden))
			faces.brief.hidden = !active || faces.briefHidden;
		if (!reverse) return;
		if (active) {
			this.returnReverse(faces);
			if (reverse.hidden !== faces.reverseHidden) reverse.hidden = faces.reverseHidden;
			return;
		}
		if (reverse.parentNode !== item.button) item.button.append(reverse);
		writeHidden(reverse, false);
	}

	private showVisualFace(item: MovingBookmark, face: 0 | 1): void {
		const faces = item.faces;
		if (!faces || faces.visualFace === face) return;
		const source =
			face === faces.data.activeFace || !faces.data.reverse ? faces.brief : faces.data.reverse;
		const copy = source.cloneNode(true) as HTMLElement;
		copy.hidden = false;
		copy.classList.add("flipbook-bookmark__content");
		item.visual.replaceChildren(copy);
		this.stripVisualIdentifiers(item.visual);
		faces.visualFace = face;
	}

	private captureHostSpace(): BookmarkHostSpace {
		const box = this.host.getBoundingClientRect();
		const width = this.host.clientWidth;
		const height = this.host.clientHeight;
		return {
			box,
			scaleX: width > 0 ? box.width / width || 1 : 1,
			scaleY: height > 0 ? box.height / height || 1 : 1,
			clientLeft: this.host.clientLeft,
			clientTop: this.host.clientTop,
		};
	}

	private hostRectangle(button: HTMLElement, space: BookmarkHostSpace): BookmarkSheetRectangle {
		const box = button.getBoundingClientRect();
		const { box: hostBox, scaleX, scaleY, clientLeft, clientTop } = space;
		return {
			width: box.width / scaleX,
			height: box.height / scaleY,
			left: (box.left - hostBox.left) / scaleX - clientLeft,
			top: (box.top - hostBox.top) / scaleY - clientTop,
		};
	}

	private sheetRectangle(
		rectangle: BookmarkSheetRectangle,
		frame: BookmarkLeafFrame,
		page0: HTMLElement,
		onRight: boolean,
	): BookmarkSheetRectangle {
		const spine = this.baseLeft(page0, frame.width) + (frame.isLTR ? frame.width : 0);
		return {
			...rectangle,
			left: onRight ? rectangle.left - spine : spine - rectangle.left - rectangle.width,
			top: rectangle.top - (Number.parseFloat(page0.style.top) || 0),
		};
	}

	private makePlaceholder(
		button: HTMLButtonElement,
		rectangle: BookmarkSheetRectangle,
	): HTMLSpanElement {
		const placeholder = this.host.ownerDocument.createElement("span");
		placeholder.className = "flipbook-bookmark-placeholder";
		placeholder.setAttribute("aria-hidden", "true");
		placeholder.inert = true;
		const railStyle = this.host.ownerDocument.defaultView?.getComputedStyle(
			button.parentElement ?? button,
		);
		const column = railStyle?.flexDirection.startsWith("column") ?? false;
		placeholder.style.cssText = `width:${rectangle.width}px;height:${rectangle.height}px;min-width:0;min-height:0;box-sizing:border-box;flex:0 0 ${column ? rectangle.height : rectangle.width}px;pointer-events:none;`;
		const buttonStyle = this.host.ownerDocument.defaultView?.getComputedStyle(button);
		if (buttonStyle?.gridRow) placeholder.style.gridRow = buttonStyle.gridRow;
		if (buttonStyle?.gridColumn) placeholder.style.gridColumn = buttonStyle.gridColumn;
		return placeholder;
	}

	private cloneVisual(button: HTMLButtonElement): HTMLButtonElement {
		const visual = button.cloneNode(true) as HTMLButtonElement;
		visual.classList.add("flipbook-bookmark--mirror");
		this.stripVisualIdentifiers(visual);
		visual.inert = true;
		visual.tabIndex = -1;
		visual.setAttribute("aria-hidden", "true");
		return visual;
	}

	private stripVisualIdentifiers(visual: HTMLElement): void {
		visual.removeAttribute("id");
		visual.removeAttribute("data-face");
		visual.removeAttribute("data-bookmark-id");
		visual.removeAttribute("data-page-index");
		for (const child of visual.querySelectorAll(
			"[id], [data-face], [data-bookmark-id], [data-page-index]",
		)) {
			child.removeAttribute("id");
			child.removeAttribute("data-face");
			child.removeAttribute("data-bookmark-id");
			child.removeAttribute("data-page-index");
		}
	}

	private renderSurfaces(
		bookmark: BookmarkTarget,
		item: MovingBookmark,
		frame: BookmarkLeafFrame,
		page0: HTMLElement,
		surfaces: BookmarkFoldSurface[],
		className: string,
	): void {
		const left = this.baseLeft(page0, frame.width);
		const top = Number.parseFloat(page0.style.top) || 0;
		if (surfaces.length === 0 && item.button.parentElement !== item.storage)
			item.storage.append(item.button);
		if (surfaces.length < 2 && item.visual.parentElement !== item.storage)
			item.storage.append(item.visual);
		for (let index = 0; index < surfaces.length; index++) {
			const surface = surfaces[index];
			let wrapper = item.surfaces[index];
			if (!wrapper) {
				wrapper = this.host.ownerDocument.createElement("div");
				wrapper.setAttribute("data-flipbook-no-flip", "");
				if (page0.parentElement === this.host) this.host.insertBefore(wrapper, page0);
				else this.host.append(wrapper);
				item.surfaces.push(wrapper);
			}
			writeHidden(wrapper, false);
			writeAttribute(wrapper, "data-bookmark-face", String(surface.face));
			// Appearance and material dimensions are captured once for this turn.
			// Only the crease pose changes on ordinary animation frames.
			const layout = JSON.stringify([left, top, bookmark.id, bookmark.pageIndex, className]);
			if (item.surfaceLayouts.get(wrapper) !== layout) {
				item.surfaceLayouts.set(wrapper, layout);
				writeAttribute(wrapper, "class", `flipbook-bookmark-surface ${className}`.trim());
				writeAttribute(wrapper, "data-bookmark-surface", bookmark.id);
				writeAttribute(wrapper, "data-leaf-index", String(Math.floor(bookmark.pageIndex / 2)));
				for (const [name, value] of Object.entries({
					position: "absolute",
					left: `${left}px`,
					top: `${top}px`,
					width: `${item.exposed.width}px`,
					height: `${item.exposed.height}px`,
					"pointer-events": "none",
					"transform-origin": "0px 0px",
					overflow: "visible",
				}))
					writeStyle(wrapper, name, value);
				for (const [name, value] of item.appearance) writeStyle(wrapper, name, value);
			}
			writeStyle(wrapper, "transform", surface.transform);
			writeStyle(wrapper, "z-index", String(surface.zIndex));
			writeStyle(
				wrapper,
				"clip-path",
				`polygon(${surface.polygon.map((point) => `${point.x}px ${point.y}px`).join(", ")})`,
			);
			const content = index === 0 ? item.button : item.visual;
			if (index === 0) this.showFace(item, surface.face);
			else this.showVisualFace(item, surface.face);
			this.placeContent(item, content, frame, surface.face);
			if (content.parentElement !== wrapper) wrapper.append(content);
		}
		for (const surface of item.surfaces.slice(surfaces.length)) {
			writeHidden(surface, true);
		}
	}

	private placeContent(
		item: MovingBookmark,
		button: HTMLButtonElement,
		frame: BookmarkLeafFrame,
		face: 0 | 1,
	): void {
		const placement = `${frame.isLTR}:${face}`;
		if (item.placedFaces.get(button) === placement) return;
		item.placedFaces.set(button, placement);
		writeHidden(button, false);
		writeAttribute(button, "data-bookmark-motion", "true");
		for (const [name, value] of Object.entries({
			position: "absolute",
			right: "auto",
			bottom: "auto",
			left: `${item.rectangle.left - item.exposed.left}px`,
			top: `${item.rectangle.top - item.exposed.top}px`,
			width: `${item.rectangle.width}px`,
			height: `${item.rectangle.height}px`,
			"max-width": "none",
			"max-height": "none",
			margin: "0px",
			flex: "0 0 auto",
			transform: "none",
		}))
			writeStyle(button, name, value);
		if (item.caption) {
			const scale = (frame.isLTR ? 1 : -1) * (face === 0 ? 1 : -1);
			for (const caption of button.querySelectorAll<HTMLElement>(
				":scope > .flipbook-bookmark__content",
			))
				this.placeCaption(caption, item.caption.bounds, scale);
		}
		writeStyle(
			button,
			"pointer-events",
			button.classList.contains("flipbook-bookmark--mirror") ? "none" : "auto",
		);
	}

	private placeCaption(caption: HTMLElement, bounds: BookmarkSheetRectangle, scale: number): void {
		for (const [name, value] of Object.entries({
			position: "absolute",
			right: "auto",
			bottom: "auto",
			left: `${bounds.left}px`,
			top: `${bounds.top}px`,
			width: `${bounds.width}px`,
			height: `${bounds.height}px`,
			"max-width": "none",
			"max-height": "none",
			margin: "0px",
			"box-sizing": "border-box",
			"transform-origin": "center center",
			transform: `scaleX(${scale})`,
		}))
			writeStyle(caption, name, value);
	}
}
