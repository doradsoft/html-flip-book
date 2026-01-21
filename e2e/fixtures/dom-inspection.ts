import type { Page } from "@playwright/test";

/** Parsed transform values from a page element */
export interface PageTransform {
	rotateY: number; // degrees
	translateX: number; // pixels
	scaleX: number;
}

/** State of a single page element in the DOM */
export interface PageDOMState {
	index: number;
	zIndex: number;
	transform: PageTransform;
	isVisible: boolean;
	boundingBox: { x: number; y: number; width: number; height: number } | null;
}

/** State of all pages in the flipbook */
export interface FlipBookDOMState {
	pages: PageDOMState[];
	containerWidth: number;
	containerHeight: number;
}

/**
 * Parse CSS transform string to extract rotateY, translateX, scaleX values
 * Example: "translateX(100px) rotateY(-45deg) scaleX(0.8)"
 * Or: "matrix(-1, 0, 0, 1, 283.719, 0)" (2D matrix for flipped state)
 */
export function parseTransform(transformStr: string): PageTransform {
	const result: PageTransform = { rotateY: 0, translateX: 0, scaleX: 1 };

	if (!transformStr || transformStr === "none") {
		return result;
	}

	// Handle 2D matrix: matrix(a, b, c, d, tx, ty)
	// When a = -1 and d = 1, this represents a 180-degree Y rotation (horizontal flip)
	const matrix2dMatch = transformStr.match(/^matrix\(([^)]+)\)$/);
	if (matrix2dMatch) {
		const values = matrix2dMatch[1].split(",").map((v) => parseFloat(v.trim()));
		if (values.length >= 6) {
			const a = values[0]; // scaleX * cos(angle)
			const _b = values[1];
			const _c = values[2];
			const d = values[3]; // scaleY * cos(angle)
			const tx = values[4];
			const _ty = values[5];

			result.translateX = tx;

			// When a = -1, this is a Y-axis flip (180 degrees)
			// When a = 1, no rotation
			if (Math.abs(a + 1) < 0.001 && Math.abs(d - 1) < 0.001) {
				result.rotateY = 180;
			} else if (Math.abs(a - 1) < 0.001 && Math.abs(d - 1) < 0.001) {
				result.rotateY = 0;
			} else {
				// Partial rotation - extract from scale component
				result.scaleX = Math.abs(a);
				// If a is negative, we're past 90 degrees
				if (a < 0) {
					result.rotateY = 180 - Math.acos(Math.abs(a)) * (180 / Math.PI);
				} else {
					result.rotateY = Math.acos(a) * (180 / Math.PI);
				}
			}
		}
		return result;
	}

	// Handle matrix3d or matrix
	if (transformStr.includes("matrix3d")) {
		// For complex 3D transforms, we need to extract from matrix
		const matrixMatch = transformStr.match(/matrix3d\(([^)]+)\)/);
		if (matrixMatch) {
			const values = matrixMatch[1].split(",").map((v) => parseFloat(v.trim()));
			// matrix3d layout:
			// [0]=a1  [1]=b1  [2]=c1  [3]=d1
			// [4]=a2  [5]=b2  [6]=c2  [7]=d2
			// [8]=a3  [9]=b3  [10]=c3 [11]=d3
			// [12]=tx [13]=ty [14]=tz [15]=tw
			//
			// For rotateY(θ): a1=cos(θ), c1=0, a3=sin(θ), c3=cos(θ)
			// When combined with scaleX(-1): a1 gets multiplied by -1
			// So we should use c3 (index 10) as the reliable cos value
			if (values.length >= 16) {
				const a1 = values[0];
				const a3 = values[8]; // sin(θ) for rotateY
				const c3 = values[10]; // cos(θ) for rotateY

				// c3 = cos(rotateY), so rotateY = acos(c3)
				// But we need the sign, which comes from a3 = sin(θ)
				result.rotateY = Math.atan2(a3, c3) * (180 / Math.PI);
				result.translateX = values[12] || 0;

				// Detect scaleX by comparing a1 with cos
				// If a1 = -cos, then scaleX = -1
				if (Math.abs(a1 + c3) < 0.001) {
					result.scaleX = -1;
				} else {
					result.scaleX = 1;
				}
			}
		}
		return result;
	}

	// Parse individual transform functions
	const rotateMatch = transformStr.match(/rotateY\(([^)]+)\)/);
	if (rotateMatch) {
		result.rotateY = parseFloat(rotateMatch[1]);
	}

	const translateMatch = transformStr.match(/translateX\(([^)]+)\)/);
	if (translateMatch) {
		result.translateX = parseFloat(translateMatch[1]);
	}

	const scaleMatch = transformStr.match(/scaleX\(([^)]+)\)/);
	if (scaleMatch) {
		result.scaleX = parseFloat(scaleMatch[1]);
	}

	return result;
}

/**
 * Get the DOM state of a single page element
 */
export async function getPageDOMState(
	page: Page,
	pageIndex: number,
	containerSelector = ".en-book.flipbook",
): Promise<PageDOMState> {
	const pageEl = page.locator(`${containerSelector} .page[data-page-index="${pageIndex}"]`);
	const exists = (await pageEl.count()) > 0;

	if (!exists) {
		throw new Error(`Page with index ${pageIndex} not found`);
	}

	const [styles, box, isVisible] = await Promise.all([
		pageEl.evaluate((el) => {
			const computed = window.getComputedStyle(el);
			return {
				zIndex: computed.zIndex,
				transform: computed.transform,
			};
		}),
		pageEl.boundingBox(),
		pageEl.isVisible(),
	]);

	return {
		index: pageIndex,
		zIndex: parseInt(styles.zIndex, 10) || 0,
		transform: parseTransform(styles.transform),
		isVisible,
		boundingBox: box,
	};
}

/**
 * Get the complete DOM state of all pages in the flipbook
 */
export async function getFlipBookDOMState(
	page: Page,
	containerSelector = ".en-book.flipbook",
): Promise<FlipBookDOMState> {
	const container = page.locator(containerSelector);
	const [containerBox, pageCount] = await Promise.all([
		container.boundingBox(),
		container.locator(".page").count(),
	]);

	const pages: PageDOMState[] = [];
	for (let i = 0; i < pageCount; i++) {
		pages.push(await getPageDOMState(page, i, containerSelector));
	}

	return {
		pages,
		containerWidth: containerBox?.width ?? 0,
		containerHeight: containerBox?.height ?? 0,
	};
}

/**
 * Get the z-index of adjacent pages for a given leaf
 * Returns [previousLeaf, currentLeaf, nextLeaf] z-indices
 */
export async function getAdjacentZIndices(
	page: Page,
	leafIndex: number,
	leavesCount: number,
): Promise<{ prev: number | null; current: number; next: number | null }> {
	const oddPageIndex = leafIndex * 2;
	const currentState = await getPageDOMState(page, oddPageIndex);

	let prev: number | null = null;
	let next: number | null = null;

	if (leafIndex > 0) {
		const prevState = await getPageDOMState(page, (leafIndex - 1) * 2);
		prev = prevState.zIndex;
	}

	if (leafIndex < leavesCount - 1) {
		const nextState = await getPageDOMState(page, (leafIndex + 1) * 2);
		next = nextState.zIndex;
	}

	return { prev, current: currentState.zIndex, next };
}
