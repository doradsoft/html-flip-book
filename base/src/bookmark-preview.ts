type Edge = "top" | "right" | "bottom" | "left";
type Bounds = { left: number; top: number; width: number; height: number };

/** The original tab grows outside page clipping while retaining its content, focus, and events. */
export class BookmarkPreview {
	private readonly element: HTMLDivElement;
	private source: HTMLButtonElement | undefined;
	private content: HTMLElement | undefined;
	private placeholder: HTMLSpanElement | undefined;
	private sourceStyle = "";
	private compact: Bounds | undefined;
	private animationFrame = 0;
	private hoverTimer: number | undefined;
	private closeTimer: number | undefined;
	private transferring = false;
	private readonly view: Window | null;

	constructor(
		private readonly host: HTMLElement,
		private readonly storage: HTMLElement,
	) {
		const document = host.ownerDocument;
		this.view = document.defaultView;
		this.element = document.createElement("div");
		this.element.className = "flipbook-bookmark-preview";
		this.element.hidden = true;
		this.element.addEventListener("pointerenter", this.resume);
		this.element.addEventListener("pointerleave", this.pointerLeave);
		document.body.append(this.element);
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
		this.placeholder = this.reserveSlot(source, rect);
		this.element.className = `flipbook-bookmark-preview ${className}`.trim();
		this.element.dataset.bookmarkId = source.dataset.bookmarkId;
		this.element.dataset.edge = edge;
		this.element.dataset.open = "false";
		this.setBounds(this.compact);
		this.element.hidden = false;
		this.copyAppearance(source);
		source.dataset.previewOpen = "true";
		source.classList.add("flipbook-bookmark--expanded");
		content.hidden = false;
		source.append(content);
		const focused = source === source.ownerDocument.activeElement;
		this.transferring = true;
		this.element.append(source);
		if (focused) source.focus({ preventScroll: true });
		this.transferring = false;
		const bounds = this.place(
			rect,
			edge,
			this.dimension("--flipbook-bookmark-expanded-width", 220),
			this.dimension("--flipbook-bookmark-expanded-height", 100),
		);
		// Animate dimensions rather than scaling text or creating a second tab.
		void this.element.offsetWidth;
		this.animationFrame =
			this.view?.requestAnimationFrame(() => {
				this.element.dataset.open = "true";
				this.setBounds(bounds);
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
		if (target instanceof Node && (this.element.contains(target) || this.source?.contains(target)))
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
			this.setBounds(this.compact);
			this.closeTimer = this.view?.setTimeout(() => this.restore(), 180);
			return;
		}
		this.restore();
	}

	destroy(): void {
		this.close();
		this.element.removeEventListener("pointerenter", this.resume);
		this.element.removeEventListener("pointerleave", this.pointerLeave);
		this.element.remove();
	}

	private resume = (): void => {
		if (this.closeTimer === undefined || !this.source || !this.compact) return;
		this.view?.clearTimeout(this.closeTimer);
		this.closeTimer = undefined;
		this.element.dataset.open = "true";
		this.setBounds(
			this.place(
				new DOMRect(this.compact.left, this.compact.top, this.compact.width, this.compact.height),
				this.element.dataset.edge as Edge,
				this.dimension("--flipbook-bookmark-expanded-width", 220),
				this.dimension("--flipbook-bookmark-expanded-height", 100),
			),
		);
	};
	private pointerLeave = (event: PointerEvent): void => this.leave(event.relatedTarget);

	private restore(): void {
		this.transferring = true;
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
		this.content = undefined;
		this.source = undefined;
		this.placeholder = undefined;
		this.compact = undefined;
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

	private dimension(name: string, fallback: number): number {
		const raw = this.view?.getComputedStyle(this.host).getPropertyValue(name) ?? "";
		const number = Number.parseFloat(raw);
		return Number.isFinite(number) && number > 0 ? number : fallback;
	}

	private place(
		rect: DOMRect,
		edge: Edge,
		requestedWidth: number,
		requestedHeight: number,
	): Bounds {
		const viewportWidth = this.view?.innerWidth ?? requestedWidth;
		const viewportHeight = this.view?.innerHeight ?? requestedHeight;
		const width = Math.max(rect.width, Math.min(requestedWidth, Math.max(1, viewportWidth - 16)));
		const height = Math.max(
			rect.height,
			Math.min(requestedHeight, Math.max(1, viewportHeight - 16)),
		);
		let left = rect.left + (rect.width - width) / 2;
		let top = rect.top + (rect.height - height) / 2;
		if (edge === "right") left = rect.left;
		if (edge === "left") left = rect.right - width;
		if (edge === "top") top = rect.bottom - height;
		if (edge === "bottom") top = rect.top;
		return {
			left: Math.max(8, Math.min(left, viewportWidth - width - 8)),
			top: Math.max(8, Math.min(top, viewportHeight - height - 8)),
			width,
			height,
		};
	}

	private copyAppearance(source: HTMLElement): void {
		const style = this.view?.getComputedStyle(source);
		if (!style) return;
		for (const property of [
			"font",
			"color",
			"background",
			"border",
			"border-radius",
			"box-shadow",
		]) {
			source.style.setProperty(property, style.getPropertyValue(property));
		}
	}
}
