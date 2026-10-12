export interface Point {
	x: number;
	y: number;
}

export interface PageFold {
	destination: Point;
	front: Point[];
	folded: Point[];
	reflection: [number, number, number, number, number, number];
	normal: Point;
	midpoint: Point;
	strength: number;
}

function foldStrength(position: number): number {
	return position === 0 || position === 1 ? 0 : Math.sin(Math.PI * position);
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

function constrainDestination(
	width: number,
	height: number,
	target: Point,
	corner: "top" | "bottom",
): Point {
	const cornerY = corner === "top" ? 0 : height;
	const destination = {
		x: Number.isFinite(target.x) ? target.x : width,
		y: Number.isFinite(target.y) ? target.y : cornerY,
	};
	const anchors = [
		{ x: 0, y: cornerY, radius: width },
		{ x: 0, y: height - cornerY, radius: Math.hypot(width, height) },
	];
	const tolerance = Number.EPSILON * Math.max(width, height, 1) * 8;
	const inside = (point: Point, anchor: (typeof anchors)[number], allowedError = tolerance) =>
		Math.hypot(point.x - anchor.x, point.y - anchor.y) <= anchor.radius + allowedError;
	if (anchors.every((anchor) => inside(destination, anchor, 0))) return destination;

	// A closest point lies on an admissible circle arc or at one of their intersections.
	const candidates = [
		{ x: width, y: cornerY },
		{ x: -width, y: cornerY },
	];
	for (const anchor of anchors) {
		const dx = destination.x - anchor.x;
		const dy = destination.y - anchor.y;
		const scale = Math.max(Math.abs(dx), Math.abs(dy));
		if (scale === 0) continue;
		const length = Math.hypot(dx / scale, dy / scale);
		const candidate = {
			x: anchor.x + ((dx / scale) * anchor.radius) / length,
			y: anchor.y + ((dy / scale) * anchor.radius) / length,
		};
		if (anchors.every((other) => inside(candidate, other))) candidates.push(candidate);
	}
	const scale = Math.max(width, height, Math.abs(destination.x), Math.abs(destination.y), 1);
	// Remove the common target-distance term and scale before comparing large requests.
	const score = (point: Point) =>
		(point.x * point.x + point.y * point.y) / scale -
		2 * ((destination.x / scale) * point.x + (destination.y / scale) * point.y);
	return candidates.reduce((nearest, candidate) =>
		score(candidate) < score(nearest) ? candidate : nearest,
	);
}

/** Return the lifted corner's constrained position for an automatic turn. */
export function getPageFoldDestination(
	width: number,
	height: number,
	position: number,
	corner: "top" | "bottom",
	pointerOffset = 0,
): Point {
	const w = dimension(width);
	const h = dimension(height);
	const p = progress(position);
	const strength = foldStrength(p);
	const inward = corner === "top" ? 1 : -1;
	const cornerY = corner === "top" ? 0 : h;
	const offset = Number.isFinite(pointerOffset) ? pointerOffset : 0;
	const travel = clamp(
		strength * Math.min(h * 0.18, w * 0.28) + inward * offset * strength * h,
		0,
		h * 0.6,
	);
	return constrainDestination(w, h, { x: w * (1 - 2 * p), y: cornerY + inward * travel }, corner);
}

/** Reflect a lifted corner toward a real pointer destination, with the entire spine fixed. */
export function computePageFoldFromPoint(
	width: number,
	height: number,
	target: Point,
	corner: "top" | "bottom",
): PageFold {
	const w = dimension(width);
	const h = dimension(height);
	const cornerY = corner === "top" ? 0 : h;
	const destination = constrainDestination(w, h, target, corner);

	const deltaX = w - destination.x;
	const deltaY = cornerY - destination.y;
	const separation = Math.hypot(deltaX, deltaY);
	const normal =
		separation === 0 ? { x: 1, y: 0 } : { x: deltaX / separation, y: deltaY / separation };
	const midpoint = {
		x: (w + destination.x) / 2,
		y: (cornerY + destination.y) / 2,
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
		destination,
		front: clipAtCrease(sheet, normal, midpoint, -1),
		folded: clipAtCrease(sheet, normal, midpoint, 1),
		reflection,
		normal,
		midpoint,
		strength: foldStrength(progress((w - destination.x) / (2 * w))),
	};
}

/** Reflect the lifted region across a crease in coordinates with the spine at x = 0. */
export function computePageFold(
	width: number,
	height: number,
	position: number,
	corner: "top" | "bottom",
	pointerOffset = 0,
): PageFold {
	const destination = getPageFoldDestination(width, height, position, corner, pointerOffset);
	return {
		...computePageFoldFromPoint(width, height, destination, corner),
		strength: foldStrength(progress(position)),
	};
}

/** Match the resting speed at each end while maintaining an exact final position. */
export function easePageTurn(value: number): number {
	const p = progress(value);
	return p === 0 || p === 1 ? p : (1 - Math.cos(Math.PI * p)) / 2;
}
