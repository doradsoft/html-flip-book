import { describe, expect, it } from "vitest";
import type { BookmarkLeafFrame } from "../bookmark-fold";
import { BookmarkMotion, type BookmarkMotionFaces } from "../bookmark-motion";
import { computePageFoldFromPoint } from "../page-fold";

function box(left: number, top: number, width: number, height: number): DOMRect {
	return new DOMRect(left, top, width, height);
}

function setup(isLTR = true) {
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

function dualFaces(host: HTMLElement, button: HTMLButtonElement): BookmarkMotionFaces {
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

describe("bookmark motion surfaces", () => {
	it.each([true, false])(
		"does not mutate an unchanged fold frame but still updates geometry (LTR=%s)",
		(isLTR) => {
			const { host, page, button, motion, frame } = setup(isLTR);
			const faces = dualFaces(host, button);
			const bookmark = { id: "chapter", pageIndex: 2 };
			motion.sync(bookmark, button, frame, page, "", faces);
			const surface = host.querySelector<HTMLElement>(".flipbook-bookmark-surface");
			const before = surface?.style.transform;
			const observer = new MutationObserver(() => {});
			observer.observe(host, {
				attributes: true,
				childList: true,
				characterData: true,
				subtree: true,
			});
			motion.sync(bookmark, button, frame, page, "", faces);
			expect(observer.takeRecords()).toHaveLength(0);
			page.style.top = "12px";
			observer.takeRecords();
			motion.sync(bookmark, button, frame, page, "updated-theme", faces);
			expect(observer.takeRecords().length).toBeGreaterThan(0);
			expect(surface?.style.top).toBe("12px");
			expect(surface?.classList.contains("updated-theme")).toBe(true);
			expect(surface?.style.transform).toBe(before);
			observer.disconnect();
			motion.destroy();
			host.remove();
		},
	);

	it("does not reattach fully concealed material on an unchanged frame", () => {
		const { host, page, button, motion, frame } = setup();
		button.getBoundingClientRect = () => box(800, 100, 0, 28);
		const bookmark = { id: "chapter", pageIndex: 2 };
		motion.sync(bookmark, button, frame, page);
		const observer = new MutationObserver(() => {});
		observer.observe(host, { attributes: true, childList: true, subtree: true });
		motion.sync(bookmark, button, frame, page);
		expect(observer.takeRecords()).toHaveLength(0);
		observer.disconnect();
		motion.destroy();
		host.remove();
	});

	it.each([true, false])(
		"moves a tab with its actual folded material and restores its slot (LTR=%s)",
		(isLTR) => {
			const { host, page, rail, button, motion, frame } = setup(isLTR);
			button.style.setProperty("--bookmark-exposed-major", "92px");
			const originalStyle = button.style.cssText;
			motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page, "consumer-layer");
			const surface = host.querySelector<HTMLElement>(".flipbook-bookmark-surface");
			expect(surface?.parentElement).toBe(host);
			expect(surface?.classList.contains("consumer-layer")).toBe(true);
			expect(surface?.dataset.leafIndex).toBe("1");
			expect(surface?.dataset.bookmarkFace).toBe("1");
			expect(surface?.style.zIndex).toBe("21");
			expect(surface?.style.clipPath).toContain("polygon(");
			expect(surface?.style.getPropertyValue("--bookmark-exposed-major")).toBe("92px");
			expect(surface?.compareDocumentPosition(page)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
			expect(surface?.style.transform).toContain("matrix(");
			expect(button.parentElement).toBe(surface);
			expect(button.style.transform).toBe("none");
			expect(
				button.querySelector<HTMLElement>(".flipbook-bookmark__content")?.style.transform,
			).toBe(isLTR ? "scaleX(-1)" : "scaleX(1)");
			expect(
				rail.querySelector<HTMLElement>(".flipbook-bookmark-placeholder")?.style.flexBasis,
			).toBe("28px");
			motion.sync(
				{ id: "chapter", pageIndex: 2 },
				button,
				{ ...frame, position: 1, fold: undefined },
				page,
			);
			expect(button.parentElement).toBe(rail);
			expect(button.style.cssText).toBe(originalStyle);
			expect(button.hidden).toBe(false);
			expect(button.inert).toBe(false);
			expect(button.dataset.bookmarkMotion).toBeUndefined();
			expect(host.querySelector(".flipbook-bookmark-surface")).toBeNull();
			expect(rail.querySelector(".flipbook-bookmark-placeholder")).toBeNull();
			motion.destroy();
			host.remove();
		},
	);

	it("derives backward drag coordinates from the original physical side before settlement", () => {
		const { host, page, button, motion, frame } = setup();
		button.getBoundingClientRect = () => box(-36, 100, 36, 28);
		motion.sync(
			{ id: "chapter", pageIndex: 2 },
			button,
			{ ...frame, position: 0.95, restingPosition: 0.95 },
			page,
		);
		const surface = host.querySelector<HTMLElement>(".flipbook-bookmark-surface");
		expect(surface?.style.transform).toContain("translate(400px, 100px)");
		motion.destroy();
		host.remove();
	});

	it("uses an inert visual copy when a tab straddles the crease", () => {
		const { host, page, button, motion, frame } = setup();
		button.getBoundingClientRect = () => box(580, -36, 40, 36);
		motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page);
		expect(host.querySelectorAll(".flipbook-bookmark-surface")).toHaveLength(2);
		const mirror = host.querySelector<HTMLButtonElement>(".flipbook-bookmark--mirror");
		expect(mirror?.inert).toBe(true);
		expect(mirror?.tabIndex).toBe(-1);
		expect(mirror?.getAttribute("aria-hidden")).toBe("true");
		expect(mirror?.style.pointerEvents).toBe("none");
		expect(mirror?.hasAttribute("data-bookmark-id")).toBe(false);
		expect(mirror?.hasAttribute("data-page-index")).toBe(false);
		expect(mirror?.querySelector("[id]")).toBeNull();
		expect(host.querySelectorAll("#consumer-caption")).toHaveLength(1);
		const originalParent = button.parentElement;
		motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page);
		expect(button.parentElement).toBe(originalParent);
		motion.destroy();
		expect(button.isConnected).toBe(true);
		host.remove();
	});

	it("restores original inline styles, hidden and inert flags even after replacement", () => {
		const { host, page, rail, button, motion, frame } = setup();
		button.inert = true;
		button.hidden = true;
		const originalStyle = button.style.cssText;
		motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page);
		motion.restoreAll();
		expect(button.parentElement).toBe(rail);
		expect(button.style.cssText).toBe(originalStyle);
		expect(button.inert).toBe(true);
		expect(button.hidden).toBe(true);
		motion.restore("chapter");
		motion.destroy();
		host.remove();
	});

	it("keeps zero-area content connected until it can return to its rail", () => {
		const { host, page, rail, button, motion, frame } = setup();
		button.getBoundingClientRect = () => box(800, 100, 0, 28);
		motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page);
		expect(button.isConnected).toBe(true);
		expect(button.closest("[hidden]")).not.toBeNull();
		expect(host.querySelector(".flipbook-bookmark-surface")).toBeNull();
		motion.restore("chapter");
		expect(button.parentElement).toBe(rail);
		expect(button.closest("[hidden]")).toBeNull();
		host.remove();
	});

	it("converts a scaled book's physical tab rectangle back into page coordinates", () => {
		const { host, page, button, motion, frame } = setup();
		host.getBoundingClientRect = () => box(100, 50, 1600, 1200);
		button.getBoundingClientRect = () => box(1700, 250, 72, 56);
		motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page);
		const surface = host.querySelector<HTMLElement>(".flipbook-bookmark-surface");
		expect(surface?.style.width).toBe("36px");
		expect(surface?.style.height).toBe("28px");
		expect(surface?.style.transform).toContain("translate(400px, 100px)");
		motion.destroy();
		host.remove();
	});

	it.each([true, false])(
		"shows the actual back-face caption and click metadata (LTR=%s)",
		(isLTR) => {
			const { host, page, rail, button, motion, frame } = setup(isLTR);
			const faces = dualFaces(host, button);
			const brief = button.querySelector<HTMLElement>(".flipbook-bookmark__content");
			const reverse = faces.reverse;
			if (!brief || !reverse) throw new Error("Expected both real captions");
			const reverseParent = reverse.parentElement;
			const reverseNext = reverse.nextSibling;
			motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page, "", faces);
			expect(button.dataset.face).toBe("1");
			expect(button.dataset.pageIndex).toBe("3");
			expect(button.dataset.bookmarkId).toBe("back");
			expect(button.getAttribute("aria-label")).toBe("Back chapter");
			expect(brief.hidden).toBe(true);
			expect(reverse.hidden).toBe(false);
			expect(reverse.parentElement).toBe(button);
			expect(brief.isConnected).toBe(true);
			expect(reverse.isConnected).toBe(true);
			motion.restore("chapter");
			expect(button.parentElement).toBe(rail);
			expect(button.dataset.face).toBe("0");
			expect(button.dataset.pageIndex).toBe("2");
			expect(button.dataset.bookmarkId).toBe("front");
			expect(button.getAttribute("aria-label")).toBe("Front chapter");
			expect(brief.hidden).toBe(false);
			expect(reverse.hidden).toBe(true);
			expect(reverse.parentElement).toBe(reverseParent);
			expect(reverse.nextSibling).toBe(reverseNext);
			expect(brief.isConnected).toBe(true);
			expect(reverse.isConnected).toBe(true);
			host.remove();
		},
	);

	it("uses different face content on both sides of a crease while real nodes stay connected", () => {
		const { host, page, button, motion, frame } = setup();
		button.getBoundingClientRect = () => box(580, -36, 40, 36);
		const faces = dualFaces(host, button);
		const brief = button.querySelector<HTMLElement>(".flipbook-bookmark__content");
		const reverse = faces.reverse;
		if (!brief || !reverse) throw new Error("Expected both real captions");
		const reverseParent = reverse.parentElement;
		motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page, "", faces);
		expect(button.dataset.face).toBe("0");
		expect(brief.hidden).toBe(false);
		expect(reverse.parentElement).toBe(reverseParent);
		expect(reverse.isConnected).toBe(true);
		const reflected = host.querySelector<HTMLElement>('[data-bookmark-face="1"]');
		expect(reflected?.textContent).toBe("Back chapter");
		expect(reflected?.querySelector("[id]")).toBeNull();
		expect(
			reflected?.querySelector(".flipbook-bookmark--mirror")?.getAttribute("aria-hidden"),
		).toBe("true");
		motion.destroy();
		expect(brief.isConnected).toBe(true);
		expect(reverse.isConnected).toBe(true);
		host.remove();
	});

	it("returns live reverse content when a drag moves back across the same crease", () => {
		const { host, page, button, motion, frame } = setup();
		const faces = dualFaces(host, button);
		const brief = button.querySelector<HTMLElement>(".flipbook-bookmark__content");
		const reverse = faces.reverse;
		if (!brief || !reverse) throw new Error("Expected both real captions");
		const reverseParent = reverse.parentElement;
		const liveChild = document.createElement("span");
		liveChild.dataset.consumerState = "retained";
		reverse.append(liveChild);
		motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page, "", faces);
		expect(reverse.parentElement).toBe(button);
		motion.sync(
			{ id: "chapter", pageIndex: 2 },
			button,
			{ ...frame, fold: computePageFoldFromPoint(400, 600, { x: 399, y: 30 }, "top") },
			page,
			"",
			faces,
		);
		expect(button.dataset.face).toBe("0");
		expect(brief.hidden).toBe(false);
		expect(reverse.parentElement).toBe(reverseParent);
		expect(reverse.isConnected).toBe(true);
		expect(liveChild.isConnected).toBe(true);
		expect(liveChild.dataset.consumerState).toBe("retained");
		motion.destroy();
		host.remove();
	});

	it("reveals the front caption while turning a resting back face backward", () => {
		const { host, page, button, motion, frame } = setup();
		button.getBoundingClientRect = () => box(-36, 100, 36, 28);
		const faces = dualFaces(host, button);
		const brief = button.querySelector<HTMLElement>(".flipbook-bookmark__content");
		const reverse = faces.reverse;
		if (!brief || !reverse) throw new Error("Expected both real captions");
		brief.textContent = "Back chapter";
		reverse.textContent = "Front chapter";
		button.dataset.face = "1";
		button.dataset.pageIndex = "3";
		button.dataset.bookmarkId = "back";
		faces.activeFace = 1;
		motion.sync(
			{ id: "chapter", pageIndex: 2 },
			button,
			{ ...frame, backwardPreview: true, restingPosition: 1 },
			page,
			"",
			faces,
		);
		expect(button.dataset.face).toBe("0");
		expect(button.dataset.pageIndex).toBe("2");
		expect(button.getAttribute("aria-label")).toBe("Front chapter");
		expect(brief.hidden).toBe(true);
		expect(reverse.hidden).toBe(false);
		expect(reverse.parentElement).toBe(button);
		motion.destroy();
		expect(button.dataset.face).toBe("1");
		expect(brief.hidden).toBe(false);
		expect(brief.isConnected).toBe(true);
		expect(reverse.isConnected).toBe(true);
		host.remove();
	});

	it("keeps a single live caption on both faces when no reverse node is supplied", () => {
		const { host, page, button, motion, frame } = setup();
		const brief = button.querySelector<HTMLElement>("span");
		if (!brief) throw new Error("Expected a live caption");
		brief.className = "flipbook-bookmark__content";
		brief.textContent = "Rendered React caption";
		const source = { id: "single", pageIndex: 2, label: "Single caption" };
		const faces: BookmarkMotionFaces = { activeFace: 0, front: source, back: source };
		motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page, "", faces);
		expect(button.dataset.face).toBe("1");
		expect(brief.hidden).toBe(false);
		expect(brief.isConnected).toBe(true);
		expect(button.textContent).toBe("Rendered React caption");
		motion.destroy();
		button.getBoundingClientRect = () => box(580, -36, 40, 36);
		motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page, "", faces);
		const mirror = host.querySelector<HTMLButtonElement>(".flipbook-bookmark--mirror");
		expect(mirror?.textContent).toBe("Rendered React caption");
		expect(brief.isConnected).toBe(true);
		motion.destroy();
		host.remove();
	});

	it.each([
		{ isLTR: true, activeFace: 0 as const },
		{ isLTR: true, activeFace: 1 as const },
		{ isLTR: false, activeFace: 0 as const },
		{ isLTR: false, activeFace: 1 as const },
	])(
		"keeps a 92px caption on the exposed end of 320px material (LTR=$isLTR, face=$activeFace)",
		({ isLTR, activeFace }) => {
			const { host, page, rail, button, motion, frame } = setup(isLTR);
			page.style[isLTR ? "left" : "right"] = "340px";
			button.style.border = "0";
			const faces = dualFaces(host, button);
			faces.activeFace = activeFace;
			const brief = button.querySelector<HTMLElement>(".flipbook-bookmark__content");
			const reverse = faces.reverse;
			if (!brief || !reverse) throw new Error("Expected both captions");
			brief.style.letterSpacing = "1px";
			reverse.style.textDecoration = "underline";
			const briefStyle = brief.style.cssText;
			const reverseStyle = reverse.style.cssText;
			const onRight = isLTR === (activeFace === 0);
			const fullLeft = onRight ? 232 : 248;
			const exposedLeft = onRight ? 460 : 248;
			button.getBoundingClientRect = () => box(fullLeft, 100, 320, 28);
			brief.getBoundingClientRect = () => box(exposedLeft, 100, 92, 28);
			const slot = document.createElement("div");
			slot.className = "flipbook-bookmark-slot";
			slot.getBoundingClientRect = () => box(exposedLeft, 100, 92, 28);
			rail.append(slot);
			slot.append(button);
			// The concealed strip's center is deliberately across the spine from its tip.
			expect(fullLeft + 160 > 400).toBe(!onRight);
			const pose: BookmarkLeafFrame = {
				...frame,
				width: 60,
				restingPosition: activeFace === 0 ? 0.75 : 0.25,
				backwardPreview: activeFace === 1,
				fold: computePageFoldFromPoint(60, 600, { x: 0, y: 0 }, "top"),
			};
			motion.sync({ id: "chapter", pageIndex: 2 }, button, pose, page, "", faces);
			const reflectedFace = activeFace === 0 ? 1 : 0;
			const surface = host.querySelector<HTMLElement>(`[data-bookmark-face="${reflectedFace}"]`);
			const caption = surface?.querySelector<HTMLElement>(
				".flipbook-bookmark__content:not([hidden])",
			);
			expect(surface?.style.width).toBe("92px");
			expect(surface?.style.height).toBe("28px");
			expect(button.style.width).toBe("320px");
			expect(button.style.left).toBe("-228px");
			expect(button.style.transform).toBe("none");
			expect(caption?.style.left).toBe("228px");
			expect(caption?.style.width).toBe("92px");
			expect(caption?.style.transform).toBe(
				`scaleX(${(isLTR ? 1 : -1) * (reflectedFace === 0 ? 1 : -1)})`,
			);
			const center =
				Number.parseFloat(button.style.left) +
				Number.parseFloat(caption?.style.left ?? "NaN") +
				Number.parseFloat(caption?.style.width ?? "NaN") / 2;
			expect(center).toBe(46);
			expect(surface?.style.clipPath).toContain("92px");
			motion.destroy();
			expect(brief.style.cssText).toBe(briefStyle);
			expect(reverse.style.cssText).toBe(reverseStyle);
			expect(brief.isConnected).toBe(true);
			expect(reverse.isConnected).toBe(true);
			host.remove();
		},
	);

	it.each([true, false])(
		"keeps the concealed length of parallel strips clipped during folding (LTR=%s)",
		(isLTR) => {
			const { host, page, rail, button, motion, frame } = setup(isLTR);
			button.style.border = "0";
			button.dataset.orientation = "parallel";
			button.dataset.face = "0";
			const left = isLTR ? 800 : -28;
			const top = isLTR ? -128 : 100;
			button.getBoundingClientRect = () => box(left, top, 28, 320);
			const brief = button.querySelector<HTMLElement>(".flipbook-bookmark__content");
			if (!brief) throw new Error("Expected a caption");
			brief.getBoundingClientRect = () => box(left, 100, 28, 92);
			const slot = document.createElement("div");
			slot.className = "flipbook-bookmark-slot";
			slot.getBoundingClientRect = () => box(left, 100, 28, 92);
			rail.append(slot);
			slot.append(button);
			motion.sync({ id: "chapter", pageIndex: 2 }, button, frame, page);
			const surface = host.querySelector<HTMLElement>(".flipbook-bookmark-surface");
			expect(surface?.style.height).toBe("92px");
			expect(surface?.style.width).toBe("28px");
			expect(surface?.style.clipPath).toContain("92px");
			expect(button.style.height).toBe("320px");
			expect(button.style.top).toBe(isLTR ? "-228px" : "0px");
			expect(brief.style.top).toBe(isLTR ? "228px" : "0px");
			expect(Number.parseFloat(button.style.top) + Number.parseFloat(brief.style.top)).toBe(0);
			motion.destroy();
			host.remove();
		},
	);
});
