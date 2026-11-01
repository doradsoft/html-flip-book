import type { BookmarkLeafFrame } from "../bookmark-fold";
import { BookmarkMotion, type BookmarkMotionFaces } from "../bookmark-motion";
import { computePageFoldFromPoint } from "../page-fold";

export function box(left: number, top: number, width: number, height: number): DOMRect {
	return new DOMRect(left, top, width, height);
}

export function setup(isLTR = true) {
	const host = document.createElement("div");
	Object.defineProperty(host, "clientWidth", { value: 800 });
	Object.defineProperty(host, "clientHeight", { value: 600 });
	host.getBoundingClientRect = () => box(0, 0, 800, 600);
	const page = document.createElement("div");
	page.style[isLTR ? "left" : "right"] = "0px";
	page.style.top = "0px";
	const rail = document.createElement("div");
	rail.style.display = "flex";
	rail.style.flexDirection = "column";
	const button = document.createElement("button");
	button.className = "flipbook-bookmark consumer-bookmark";
	button.dataset.bookmarkId = "chapter";
	button.dataset.pageIndex = "2";
	button.style.color = "red";
	button.innerHTML =
		'<span class="flipbook-bookmark__content" id="consumer-caption">Chapter</span>';
	button.getBoundingClientRect = () => box(isLTR ? 800 : -36, 100, 36, 28);
	rail.append(button);
	host.append(page, rail);
	document.body.append(host);
	const motion = new BookmarkMotion(host);
	const frame: BookmarkLeafFrame = {
		width: 400,
		height: 600,
		isLTR,
		position: 0.5,
		restingPosition: 0.5,
		kind: "paper",
		fold: computePageFoldFromPoint(400, 600, { x: 0, y: 0 }, "top"),
		backwardPreview: false,
		zIndices: [20, 21],
	};
	return { host, page, rail, button, motion, frame };
}

export function dualFaces(host: HTMLElement, button: HTMLButtonElement): BookmarkMotionFaces {
	const brief = button.querySelector<HTMLElement>("span");
	if (!brief) throw new Error("Expected a source caption");
	brief.className = "flipbook-bookmark__content";
	brief.textContent = "Front chapter";
	button.dataset.face = "0";
	button.dataset.bookmarkId = "front";
	button.setAttribute("aria-label", "Front chapter");
	const reverse = document.createElement("span");
	reverse.className = "flipbook-bookmark__content";
	reverse.id = "reverse-caption";
	reverse.textContent = "Back chapter";
	reverse.hidden = true;
	const storage = document.createElement("div");
	storage.hidden = true;
	storage.append(reverse, document.createElement("span"));
	host.append(storage);
	return {
		activeFace: 0,
		reverse,
		front: { id: "front", pageIndex: 2, label: "Front chapter" },
		back: { id: "back", pageIndex: 3, label: "Back chapter" },
	};
}
