interface PageBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Use the rendered sheet, since bookmark rails inset it from the book host. */
export function inputProbePath(bounds: PageBounds, direction: "ltr" | "rtl") {
	if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
		bounds.width <= 25 || bounds.height <= 0) {
		throw new Error("Input probe requires a visible page with room for a drag");
	}
	const sign = direction === "rtl" ? 1 : -1;
	const x = direction === "rtl" ? bounds.x + 10 : bounds.x + bounds.width - 10;
	const y = bounds.y + bounds.height / 2;
	return {
		start: { x, y },
		lift: { x: x + sign * 15, y },
		end: { x: direction === "rtl" ? bounds.x + bounds.width * 1.5 : bounds.x - bounds.width * 0.5, y },
	};
}
