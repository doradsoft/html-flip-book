interface PageBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Use the rendered sheet, since bookmark rails inset it from the book host.
 * The sheet element box can overhang the clipped host (pages are positioned
 * with a negative left offset), so the drag origin must clamp to the painted
 * intersection — a press on unpainted layout box hits only BODY.
 */
export function inputProbePath(bounds: PageBounds, clip: PageBounds, direction: "ltr" | "rtl") {
	const left = Math.max(bounds.x, clip.x);
	const right = Math.min(bounds.x + bounds.width, clip.x + clip.width);
	if (
		![left, right, bounds.y, bounds.height].every(Number.isFinite) ||
		right - left <= 25 ||
		bounds.height <= 0
	) {
		throw new Error("Input probe requires a visible page with room for a drag");
	}
	const sign = direction === "rtl" ? 1 : -1;
	const x = direction === "rtl" ? left + 10 : right - 10;
	const y = bounds.y + bounds.height / 2;
	return {
		start: { x, y },
		lift: { x: x + sign * 15, y },
		end: { x: direction === "rtl" ? bounds.x + bounds.width * 1.5 : bounds.x - bounds.width * 0.5, y },
	};
}
