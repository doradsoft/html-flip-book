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

export interface BookmarkMotionFaces {
	activeFace: 0 | 1;
	reverse?: HTMLElement;
	front: BookmarkFace;
	back: BookmarkFace;
}

interface MovingFaces {
	data: BookmarkMotionFaces;
	brief: HTMLElement;
	briefHidden: boolean;
	reverseParent: Node | undefined;
	reverseNext: ChildNode | null;
	reverseHidden: boolean;
	attributes: Map<string, string | null>;
	visualFace: 0 | 1 | undefined;
}

interface MovingBookmark {
	button: HTMLButtonElement;
	placeholder: HTMLSpanElement;
	rectangle: BookmarkSheetRectangle;
	style: string;
	hidden: boolean;
	inert: boolean;
	surfaces: HTMLDivElement[];
	visual: HTMLButtonElement;
	storage: HTMLDivElement;
	faces?: MovingFaces;
}

const FACE_ATTRIBUTES = ["data-face", "data-page-index", "data-bookmark-id", "aria-label"];

function moving(frame: BookmarkLeafFrame): boolean {
	return frame.fold !== undefined || (frame.position > 0 && frame.position < 1);
}

/** Companion surfaces keep protruding tab material outside the page's paint containment. */
export class BookmarkMotion {
	private readonly items = new Map<string, MovingBookmark>();

	constructor(private readonly host: HTMLElement) {}

	sync(
		bookmark: BookmarkTarget,
		button: HTMLButtonElement,
		frame: BookmarkLeafFrame,
		page0: HTMLElement,
		className = "",
		faces?: BookmarkMotionFaces,
	): void {
		if (!moving(frame)) {
			this.restore(bookmark.id);
			return;
		}
		let item = this.items.get(bookmark.id);
		if (!item || item.button !== button) {
			this.restore(bookmark.id);
			item = this.capture(button, frame, page0, faces);
			this.items.set(bookmark.id, item);
		}
		const surfaces = getBookmarkFoldSurfaces(frame, item.rectangle);
		this.renderSurfaces(bookmark, item, frame, page0, surfaces, className);
	}

	restore(id: string): void {
		const item = this.items.get(id);
		if (!item) return;
		item.placeholder.before(item.button);
		item.button.style.cssText = item.style;
		item.button.hidden = item.hidden;
		item.button.inert = item.inert;
		this.restoreFaces(item);
		delete item.button.dataset.bookmarkMotion;
		item.placeholder.remove();
		for (const surface of item.surfaces) surface.remove();
		item.storage.remove();
		this.items.delete(id);
	}

	restoreAll(): void {
		for (const id of this.items.keys()) this.restore(id);
	}

	destroy(): void {
		this.restoreAll();
	}

	private baseLeft(page0: HTMLElement, width: number): number {
		if (page0.style.left) return Number.parseFloat(page0.style.left) || 0;
		return this.host.clientWidth - (Number.parseFloat(page0.style.right) || 0) - width;
	}

	private capture(
		button: HTMLButtonElement,
		frame: BookmarkLeafFrame,
		page0: HTMLElement,
		faces?: BookmarkMotionFaces,
	): MovingBookmark {
		const rectangle = this.sheetRectangle(button, frame, page0);
		const placeholder = this.makePlaceholder(button, rectangle);
		button.before(placeholder);
		const visual = this.cloneVisual(button);
		const storage = this.host.ownerDocument.createElement("div");
		storage.hidden = true;
		storage.setAttribute("data-flipbook-no-flip", "");
		this.host.append(storage);
		return {
			button,
			placeholder,
			rectangle,
			style: button.style.cssText,
			hidden: button.hidden,
			inert: button.inert,
			surfaces: [],
			visual,
			storage,
			faces: this.captureFaces(button, faces),
		};
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
		if (!faces) return;
		const source = face === 0 ? faces.data.front : faces.data.back;
		item.button.dataset.face = String(face);
		item.button.dataset.pageIndex = String(source.pageIndex);
		item.button.dataset.bookmarkId = source.id;
		item.button.setAttribute("aria-label", source.label);
		const reverse = faces.data.reverse;
		const active = !reverse || face === faces.data.activeFace;
		faces.brief.hidden = !active || faces.briefHidden;
		if (!reverse) return;
		if (active) {
			this.returnReverse(faces);
			reverse.hidden = faces.reverseHidden;
			return;
		}
		if (reverse.parentNode !== item.button) item.button.append(reverse);
		reverse.hidden = false;
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

	private hostRectangle(button: HTMLButtonElement): BookmarkSheetRectangle {
		const hostBox = this.host.getBoundingClientRect();
		const box = button.getBoundingClientRect();
		const scaleX = this.host.clientWidth > 0 ? hostBox.width / this.host.clientWidth || 1 : 1;
		const scaleY = this.host.clientHeight > 0 ? hostBox.height / this.host.clientHeight || 1 : 1;
		return {
			width: box.width / scaleX,
			height: box.height / scaleY,
			left: (box.left - hostBox.left) / scaleX - this.host.clientLeft,
			top: (box.top - hostBox.top) / scaleY - this.host.clientTop,
		};
	}

	private sheetRectangle(
		button: HTMLButtonElement,
		frame: BookmarkLeafFrame,
		page0: HTMLElement,
	): BookmarkSheetRectangle {
		const rectangle = this.hostRectangle(button);
		const spine = this.baseLeft(page0, frame.width) + (frame.isLTR ? frame.width : 0);
		const center = rectangle.left + rectangle.width / 2;
		const onRight =
			center === spine ? frame.isLTR === frame.restingPosition <= 0.5 : center > spine;
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
		if (surfaces.length === 0) item.storage.append(item.button);
		if (surfaces.length < 2) item.storage.append(item.visual);
		for (let index = 0; index < surfaces.length; index++) {
			const surface = surfaces[index];
			let wrapper = item.surfaces[index];
			if (!wrapper) {
				wrapper = this.host.ownerDocument.createElement("div");
				wrapper.setAttribute("data-flipbook-no-flip", "");
				this.host.append(wrapper);
				item.surfaces.push(wrapper);
			}
			wrapper.hidden = false;
			wrapper.className = `flipbook-bookmark-surface ${className}`.trim();
			wrapper.dataset.bookmarkSurface = bookmark.id;
			wrapper.dataset.leafIndex = String(Math.floor(bookmark.pageIndex / 2));
			wrapper.dataset.bookmarkFace = String(surface.face);
			wrapper.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${item.rectangle.width}px;height:${item.rectangle.height}px;pointer-events:none;transform-origin:0px 0px;overflow:visible;`;
			wrapper.style.transform = surface.transform;
			wrapper.style.zIndex = String(surface.zIndex);
			wrapper.style.clipPath = `polygon(${surface.polygon.map((point) => `${point.x}px ${point.y}px`).join(", ")})`;
			const content = index === 0 ? item.button : item.visual;
			if (index === 0) this.showFace(item, surface.face);
			else this.showVisualFace(item, surface.face);
			this.placeContent(content, frame, surface.face);
			if (content.parentElement !== wrapper) wrapper.append(content);
		}
		for (let index = surfaces.length; index < item.surfaces.length; index++) {
			item.surfaces[index].hidden = true;
		}
	}

	private placeContent(button: HTMLButtonElement, frame: BookmarkLeafFrame, face: 0 | 1): void {
		button.hidden = false;
		button.dataset.bookmarkMotion = "true";
		button.style.position = "absolute";
		button.style.inset = "0";
		button.style.width = "100%";
		button.style.height = "100%";
		button.style.maxWidth = "none";
		button.style.maxHeight = "none";
		button.style.margin = "0";
		button.style.flex = "none";
		button.style.transformOrigin = "center center";
		button.style.transform = `scaleX(${(frame.isLTR ? 1 : -1) * (face === 0 ? 1 : -1)})`;
		button.style.pointerEvents = button.classList.contains("flipbook-bookmark--mirror")
			? "none"
			: "auto";
	}
}
