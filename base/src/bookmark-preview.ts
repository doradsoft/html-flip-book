type Edge = "top" | "right" | "bottom" | "left";
type Bounds = { left: number; top: number; width: number; height: number };

/** Reveal the same fixed-size strip outside its resting slot without changing its material size. */
export class BookmarkPreview {
	private readonly element: HTMLDivElement;
	private readonly clipBoundary: HTMLDivElement;
	private source: HTMLButtonElement | undefined;
	private content: HTMLElement | undefined;
	private placeholder: HTMLSpanElement | undefined;
	private anchor: HTMLElement | undefined;
	private sourceStyle = "";
	private compact: Bounds | undefined;
	private revealed: Bounds | undefined;
	private compactClip = "inset(0px)";
	private animationFrame = 0;
	private hoverTimer: number | undefined;
	private closeTimer: number | undefined;
	private transferring = false;
	private readonly view: Window | null;

	constructor(
		host: HTMLElement,
		private readonly storage: HTMLElement,
	) {
		const document = host.ownerDocument;
		this.view = document.defaultView;
		this.element = document.createElement("div");
		this.element.className = "flipbook-bookmark-preview";
		this.element.setAttribute("data-flipbook-no-flip", "");
		this.element.hidden = true;
		this.element.addEventListener("pointerenter", this.resume);
		this.element.addEventListener("pointerleave", this.pointerLeave);
		this.clipBoundary = document.createElement("div");
		this.clipBoundary.className = "flipbook-bookmark-preview-boundary";
		// Keep the page protected independently of animated position and clipping.
		// Inline geometry also works with consumers that supply their own stylesheets.
		this.clipBoundary.style.cssText = "position:fixed;inset:0;pointer-events:none;transition:none";
		this.clipBoundary.hidden = true;
		this.clipBoundary.append(this.element);
		document.body.append(this.clipBoundary);
		// Escape dismisses the preview even when focus has moved off the bookmark button.
		document.addEventListener("keydown", this.escapeKey);
	}

	open(source: HTMLButtonElement, content: HTMLElement, edge: Edge, className = ""): void {
		this.cancelHover();
		if (this.source === source && !this.element.hidden) {
			this.resume();
			return;
		}
		this.close();
		const rect = source.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return;
		this.source = source;
		this.content = content;
		this.sourceStyle = source.style.cssText;
		this.compact = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
		const slot = source.closest<HTMLElement>(".flipbook-bookmark-slot");
		this.anchor = slot ?? undefined;
		this.anchor?.addEventListener("pointerenter", this.resume);
		this.anchor?.addEventListener("pointerleave", this.pointerLeave);
		const exposed = slot?.getBoundingClientRect() ?? rect;
		this.compactClip = this.clip(rect, exposed);
		this.revealed = this.place(rect, exposed, edge, source);
		this.placeholder = this.reserveSlot(source, rect);
		this.element.style.transition = "none";
		this.element.className = `flipbook-bookmark-preview ${className}`.trim();
		this.element.dataset.bookmarkId = source.dataset.bookmarkId;
		this.element.dataset.edge = edge;
		this.element.dataset.open = "false";
		this.setBounds(this.compact);
		this.element.style.clipPath = this.compactClip;
		this.protectPage(edge, exposed, this.revealed);
		this.clipBoundary.hidden = false;
		this.element.hidden = false;
		this.clipBoundary.style.zIndex = this.view?.getComputedStyle(this.element).zIndex || "auto";
		this.copyAppearance(source);
		source.style.position = "absolute";
		source.style.inset = "0px";
		source.style.width = "100%";
		source.style.height = "100%";
		source.style.transform = "none";
		source.dataset.previewOpen = "true";
		source.classList.add("flipbook-bookmark--expanded");
		content.hidden = false;
		source.append(content);
		const focused = source === source.ownerDocument.activeElement;
		this.transferring = true;
		this.element.append(source);
		if (focused) source.focus({ preventScroll: true });
		this.transferring = false;
		// Material size is fixed before hover; only its position and concealed portion change.
		void this.element.offsetWidth;
		this.element.style.removeProperty("transition");
		this.animationFrame =
			this.view?.requestAnimationFrame(() => {
				this.element.dataset.open = "true";
				this.element.style.clipPath = "inset(0px)";
				if (this.revealed) this.setPosition(this.revealed);
			}) ?? 0;
	}

	schedule(source: HTMLButtonElement, content: HTMLElement, edge: Edge, className?: string): void {
		this.cancelHover();
		this.hoverTimer = this.view?.setTimeout(() => this.open(source, content, edge, className), 120);
	}

	cancelHover(): void {
		if (this.hoverTimer !== undefined) this.view?.clearTimeout(this.hoverTimer);
		this.hoverTimer = undefined;
	}

	leave(target: EventTarget | null): void {
		if (this.transferring) return;
		if (
			target instanceof Node &&
			(this.element.contains(target) ||
				this.source?.contains(target) ||
				this.anchor?.contains(target))
		)
			return;
		this.close(false);
	}

	/** Immediate cleanup is used for navigation, folding, and provider changes. */
	close(immediate = true): void {
		this.cancelHover();
		if (this.animationFrame) this.view?.cancelAnimationFrame(this.animationFrame);
		this.animationFrame = 0;
		if (this.closeTimer !== undefined) this.view?.clearTimeout(this.closeTimer);
		this.closeTimer = undefined;
		this.element.dataset.open = "false";
		if (
			!immediate &&
			this.source &&
			this.compact &&
			!this.view?.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			this.setPosition(this.compact);
			this.element.style.clipPath = this.compactClip;
			this.closeTimer = this.view?.setTimeout(() => this.restore(), 180);
			return;
		}
		this.restore();
	}

	destroy(): void {
		this.close();
		this.element.removeEventListener("pointerenter", this.resume);
		this.element.removeEventListener("pointerleave", this.pointerLeave);
		this.element.ownerDocument.removeEventListener("keydown", this.escapeKey);
		this.clipBoundary.remove();
	}

	private readonly escapeKey = (event: KeyboardEvent): void => {
		if (event.key === "Escape" && !this.element.hidden) this.close(false);
	};

	private resume = (): void => {
		if (this.closeTimer === undefined || !this.source || !this.compact) return;
		this.view?.clearTimeout(this.closeTimer);
		this.closeTimer = undefined;
		this.element.dataset.open = "true";
		this.element.style.clipPath = "inset(0px)";
		if (this.revealed) this.setPosition(this.revealed);
	};
	private pointerLeave = (event: PointerEvent): void => this.leave(event.relatedTarget);

	private restore(): void {
		this.transferring = true;
		this.anchor?.removeEventListener("pointerenter", this.resume);
		this.anchor?.removeEventListener("pointerleave", this.pointerLeave);
		this.anchor = undefined;
		if (this.source) {
			const focused = this.source === this.source.ownerDocument.activeElement;
			delete this.source.dataset.previewOpen;
			this.source.classList.remove("flipbook-bookmark--expanded");
			this.source.style.cssText = this.sourceStyle;
			if (this.content) {
				this.content.hidden = true;
				this.storage.append(this.content);
			}
			this.placeholder?.replaceWith(this.source);
			if (focused) this.source.focus({ preventScroll: true });
		}
		this.element.hidden = true;
		this.clipBoundary.hidden = true;
		this.content = undefined;
		this.source = undefined;
		this.placeholder = undefined;
		this.compact = undefined;
		this.revealed = undefined;
		this.closeTimer = undefined;
		this.transferring = false;
	}

	private reserveSlot(source: HTMLButtonElement, rect: DOMRect): HTMLSpanElement {
		const placeholder = source.ownerDocument.createElement("span");
		placeholder.className = "flipbook-bookmark-placeholder";
		placeholder.setAttribute("aria-hidden", "true");
		placeholder.inert = true;
		const style = this.view?.getComputedStyle(source);
		placeholder.style.width = style?.width || `${rect.width}px`;
		placeholder.style.height = style?.height || `${rect.height}px`;
		placeholder.style.flex = style?.flex || "none";
		placeholder.style.gridRow = style?.gridRow || "auto";
		placeholder.style.gridColumn = style?.gridColumn || "auto";
		placeholder.style.pointerEvents = "none";
		source.before(placeholder);
		return placeholder;
	}

	private setBounds(bounds: Bounds): void {
		for (const key of ["left", "top", "width", "height"] as const)
			this.element.style[key] = `${bounds[key]}px`;
	}

	private setPosition(bounds: Bounds): void {
		this.element.style.left = `${bounds.left}px`;
		this.element.style.top = `${bounds.top}px`;
	}

	private protectPage(edge: Edge, exposed: DOMRect, target: Bounds): void {
		const inset = this.edgeInset(edge, exposed, target);
		const top = edge === "bottom" ? inset : 0;
		const left = edge === "right" ? inset : 0;
		const right = edge === "left" ? inset : 0;
		const bottom = edge === "top" ? inset : 0;
		this.clipBoundary.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
	}

	private edgeInset(edge: Edge, exposed: DOMRect, target: Bounds): number {
		if (edge === "bottom") return Math.max(0, Math.min(exposed.top, target.top));
		if (edge === "right") return Math.max(0, Math.min(exposed.left, target.left));
		if (edge === "left")
			return Math.max(
				0,
				(this.view?.innerWidth ?? exposed.right) -
					Math.max(exposed.right, target.left + target.width),
			);
		return Math.max(
			0,
			(this.view?.innerHeight ?? exposed.bottom) -
				Math.max(exposed.bottom, target.top + target.height),
		);
	}

	private clip(rect: DOMRect, exposed: DOMRect): string {
		const top = Math.max(0, exposed.top - rect.top);
		const right = Math.max(0, rect.right - exposed.right);
		const bottom = Math.max(0, rect.bottom - exposed.bottom);
		const left = Math.max(0, exposed.left - rect.left);
		return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
	}

	private place(rect: DOMRect, exposed: DOMRect, edge: Edge, source: HTMLButtonElement): Bounds {
		const bounds = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
		const horizontal = rect.width >= rect.height;
		const axis = horizontal ? "left" : "top";
		const extent = horizontal ? rect.width : rect.height;
		const visible = horizontal ? exposed.width : exposed.height;
		const distance = Math.max(0, extent - visible) || extent;
		const sign = edge === "left" || edge === "top" ? -1 : 1;
		const viewport = horizontal ? this.view?.innerWidth : this.view?.innerHeight;
		const limit = (viewport ?? extent + 16) - extent - 8;
		const outside =
			source.dataset.orientation === "parallel"
				? this.outsideFriends(source, horizontal, extent, sign, limit)
				: undefined;
		bounds[axis] = outside ?? Math.max(8, Math.min(rect[axis] + sign * distance, limit));
		return bounds;
	}

	private outsideFriends(
		source: HTMLButtonElement,
		horizontal: boolean,
		extent: number,
		sign: number,
		limit: number,
	): number | undefined {
		const rail = source.closest<HTMLElement>(".flipbook-bookmarks__rail");
		if (!rail) return undefined;
		const slot = source.closest(".flipbook-bookmark-slot");
		const railBox = rail.getBoundingClientRect();
		const start = horizontal ? "left" : "top";
		const end = horizontal ? "right" : "bottom";
		const visible = Array.from(rail.querySelectorAll<HTMLElement>(".flipbook-bookmark-slot"))
			.filter((friend) => friend !== slot)
			.map((friend) => friend.getBoundingClientRect())
			.filter(
				(box) =>
					box.width > 0 && box.height > 0 && box[end] > railBox[start] && box[start] < railBox[end],
			);
		if (visible.length === 0) return undefined;
		const before =
			Math.max(railBox[start], Math.min(...visible.map((box) => box[start]))) - extent - 4;
		const after = Math.min(railBox[end], Math.max(...visible.map((box) => box[end]))) + 4;
		const candidates = sign < 0 ? [before, after] : [after, before];
		return candidates.find((position) => position >= 8 && position <= limit);
	}

	private copyAppearance(source: HTMLElement): void {
		const style = this.view?.getComputedStyle(source);
		if (!style) return;
		// A font shorthand can be empty even when its resolved family is available.
		// Capture the longhand before writing styles, then retain it across reparenting.
		const fontFamily = style.getPropertyValue("font-family");
		for (const property of [
			"font",
			"color",
			"background",
			"border",
			"border-radius",
			"box-shadow",
			"--flipbook-bookmark-depth",
			"--flipbook-bookmark-length",
			"--flipbook-bookmark-full-length",
			"--bookmark-default-depth",
			"--bookmark-default-length",
			"--bookmark-exposed-depth",
			"--bookmark-exposed-length",
			"--bookmark-exposed-major",
		]) {
			source.style.setProperty(property, style.getPropertyValue(property));
		}
		source.style.setProperty("font-family", fontFamily);
	}
}
