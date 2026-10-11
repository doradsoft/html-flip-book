export interface Point {
	x: number;
	y: number;
}

export interface PageFold {
	front: Point[];
	folded: Point[];
	reflection: [number, number, number, number, number, number];
	normal: Point;
	midpoint: Point;
	strength: number;
}

function clamp(value: number, lower: number, upper: number): number {
	return Math.max(lower, Math.min(upper, value));
}

function progress(value: number): number {
	return Number.isNaN(value) ? 0 : clamp(value, 0, 1);
}

function dimension(value: number): number {
	return Number.isFinite(value) && value > 0 ? Math.min(value, Number.MAX_SAFE_INTEGER) : 1;
}

function clipAtCrease(polygon: Point[], normal: Point, midpoint: Point, side: number): Point[] {
	const clipped: Point[] = [];
	const distance = (point: Point) =>
		side * ((point.x - midpoint.x) * normal.x + (point.y - midpoint.y) * normal.y);
	let previous = polygon[polygon.length - 1];
	let previousDistance = distance(previous);

	for (const current of polygon) {
		const currentDistance = distance(current);
		const previousInside = previousDistance >= 0;
		const currentInside = currentDistance >= 0;
		if (previousInside !== currentInside) {
			const fraction = previousDistance / (previousDistance - currentDistance);
			clipped.push({
				x: previous.x + (current.x - previous.x) * fraction,
				y: previous.y + (current.y - previous.y) * fraction,
			});
		}
		if (currentInside) clipped.push(current);
		previous = current;
		previousDistance = currentDistance;
	}

	const unique = clipped.filter((point, index) => {
		const next = clipped[(index + 1) % clipped.length];
		return point.x !== next.x || point.y !== next.y;
	});
	return unique.length < 3 ? [] : unique;
}

/** Reflect the lifted region across a crease in coordinates with the spine at x = 0. */
export function computePageFold(
	width: number,
	height: number,
	position: number,
	corner: "top" | "bottom",
	pointerOffset = 0,
): PageFold {
	const w = dimension(width);
	const h = dimension(height);
	const p = progress(position);
	const strength = p === 0 || p === 1 ? 0 : Math.sin(Math.PI * p);
	const inward = corner === "top" ? 1 : -1;
	const cornerY = corner === "top" ? 0 : h;
	const offset = Number.isFinite(pointerOffset) ? pointerOffset : 0;
	const travel = clamp(
		strength * Math.min(h * 0.18, w * 0.28) + inward * offset * strength * h,
		0,
		h * 0.6,
	);
	let destinationX = w * (1 - 2 * p);
	let destinationY = inward * travel;
	const reach = Math.hypot(destinationX, destinationY);
	if (reach > w) {
		const ratio = w / reach;
		destinationX *= ratio;
		destinationY *= ratio;
	}
	destinationY += cornerY;

	const deltaX = w - destinationX;
	const deltaY = cornerY - destinationY;
	const separation = Math.hypot(deltaX, deltaY);
	const normal =
		separation === 0 ? { x: 1, y: 0 } : { x: deltaX / separation, y: deltaY / separation };
	const midpoint = {
		x: (w + destinationX) / 2,
		y: (cornerY + destinationY) / 2,
	};
	const projection = midpoint.x * normal.x + midpoint.y * normal.y;
	const reflection: PageFold["reflection"] = [
		1 - 2 * normal.x * normal.x,
		-2 * normal.x * normal.y,
		-2 * normal.x * normal.y,
		1 - 2 * normal.y * normal.y,
		2 * normal.x * projection,
		2 * normal.y * projection,
	];
	const sheet = [
		{ x: 0, y: 0 },
		{ x: w, y: 0 },
		{ x: w, y: h },
		{ x: 0, y: h },
	];
	return {
		front: clipAtCrease(sheet, normal, midpoint, -1),
		folded: clipAtCrease(sheet, normal, midpoint, 1),
		reflection,
		normal,
		midpoint,
		strength,
	};
}

/** Match the resting speed at each end while maintaining an exact final position. */
export function easePageTurn(value: number): number {
	const p = progress(value);
	return p === 0 || p === 1 ? p : (1 - Math.cos(Math.PI * p)) / 2;
}
