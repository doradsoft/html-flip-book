import { afterEach, describe, expect, it, vi } from "vitest";
import { FlipBook } from "../flipbook";
import { createMockContainer } from "./test-utils";

vi.mock("hammerjs", () => {
	function MockHammer() {
		return { on: vi.fn(), off: vi.fn(), destroy: vi.fn(), get: () => ({ set: vi.fn() }) };
	}
	MockHammer.DIRECTION_HORIZONTAL = 6;
	MockHammer.DIRECTION_ALL = 30;
	return { default: MockHammer };
});

describe("retained page visibility work", () => {
	const readers: FlipBook[] = [];
	const containers: HTMLElement[] = [];

	afterEach(() => {
		for (const reader of readers) reader.destroy();
		for (const container of containers) container.remove();
		readers.length = 0;
		containers.length = 0;
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	function open(pagesCount: number, leavesBuffer = 0) {
		const { container, pages } = createMockContainer(pagesCount);
		containers.push(container);
		for (const page of pages) {
			page.innerHTML =
				'<div class="flipbook-page-scrollport"><div class="flipbook-page-content">Chapter</div></div>';
		}
		const reader = new FlipBook({
			pagesCount,
			initialTurnedLeaves: [0, 1, 2, 3, 4, 5, 6],
			leavesBuffer,
			keepPageContentLayout: true,
			coverPageIndices: "auto",
			enableHistory: false,
		});
		readers.push(reader);
		reader.render(container);
		return { reader, pages };
	}

	function measureRefresh(pagesCount: number) {
		const { reader, pages } = open(pagesCount);
		const touched = new Set<number>();
		const originals = pages.map((page, index) => {
			const descriptor = Object.getOwnPropertyDescriptor(page, "style");
			const style = page.style;
			Object.defineProperty(page, "style", {
				configurable: true,
				get() {
					touched.add(index);
					return style;
				},
			});
			return descriptor;
		});
		try {
			reader.refreshPageContent([13]);
			return touched.size;
		} finally {
			for (const [index, page] of pages.entries()) {
				const descriptor = originals[index];
				if (descriptor) Object.defineProperty(page, "style", descriptor);
				else Reflect.deleteProperty(page, "style");
			}
		}
	}

	it("keeps current-chapter refresh DOM work independent of the total book size", () => {
		const small = measureRefresh(128);
		const large = measureRefresh(1_000);
		expect(
			large,
			"Unchanged distant pages must not be inspected during a current-page refresh",
		).toBe(small);
		expect(large).toBeLessThan(64);
	});

	it.each([0, 1, 4])(
		"matches complete reconciliation through distant forward and backward jumps (buffer=%s)",
		(buffer) => {
			// Settle layout synchronously so the comparison observes final visibility,
			// accessibility and paper masks rather than the preparation queue.
			vi.stubGlobal("requestAnimationFrame", undefined);
			const { reader, pages } = open(199, buffer);
			function appearance() {
				return pages.map((page) => {
					const port = page.firstElementChild as HTMLElement;
					return [page, port].map((element) => ({
						display: element.style.display,
						visibility: element.style.contentVisibility,
						dormant: element.classList.contains("flipbook-layout-dormant"),
						inert: element.getAttribute("inert"),
						hidden: element.getAttribute("aria-hidden"),
					}));
				});
			}
			for (const destination of [71, 195, 7, 143, 1, 13]) {
				reader.jumpToPage(destination);
				const incremental = appearance();
				reader.refreshPageContent(pages.map((_, index) => index));
				expect(appearance(), `page ${destination}`).toEqual(incremental);
			}
		},
	);

	it.each([true, false])(
		"reconciles explicitly replaced distant content (scrollport=%s)",
		(port) => {
			const { reader, pages } = open(199);
			const page = pages[150];
			page.style.display = "";
			page.style.contentVisibility = "";
			page.innerHTML = port
				? '<div class="flipbook-page-scrollport"><div class="flipbook-page-content">Replacement</div></div>'
				: "Replacement without a scrollport";
			reader.refreshPageContent([150]);
			expect(page.style.display).toBe("none");
			expect(page.style.contentVisibility).toBe("hidden");
			if (port)
				expect((page.firstElementChild as HTMLElement).style.contentVisibility).toBe("hidden");
		},
	);

	it("initializes every new page holder when the reader is rendered again", () => {
		const { reader } = open(199);
		const replacement = createMockContainer(199);
		containers.push(replacement.container);
		reader.render(replacement.container);
		expect(replacement.pages[150].style.display).toBe("none");
		expect(replacement.pages[150].style.contentVisibility).toBe("hidden");
		expect(replacement.pages[198].style.display).toBe("");
	});
});
