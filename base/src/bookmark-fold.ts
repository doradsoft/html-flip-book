import type { PageFold, Point } from "./page-fold";

/** A leaf's current sheet pose, in the same coordinates used to render its pages. */
export interface BookmarkLeafFrame {
	width: number;
	height: number;
	isLTR: boolean;
	position: number;
	/** Actual turn progress; differs from position while a resting corner is previewed. */
	restingPosition: number;
	kind: "paper" | "rigid";
	fold?: PageFold;
	backwardPreview: boolean;
	zIndices: [number, number];
}

/** Material coordinates: x measures distance from the spine, y runs down the sheet. */
export interface BookmarkSheetRectangle {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface BookmarkFoldSurface {
	/** Clip polygon local to the requested rectangle, including protruding material. */
	polygon: Point[];
	/** Maps the bookmark's local origin to the untransformed origin of its leaf pages. */
	transform: string;
	transformOrigin: "0px 0px";
	face: 0 | 1;
	zIndex: number;
}

function rectanglePolygon(rectangle: BookmarkSheetRectangle): Point[] {
	return [
		{ x: rectangle.left, y: rectangle.top },
		{ x: rectangle.left + rectangle.width, y: rectangle.top },
		{ x: rectangle.left + rectangle.width, y: rectangle.top + rectangle.height },
		{ x: rectangle.left, y: rectangle.top + rectangle.height },
	];
}

function clipMaterial(polygon: Point[], fold: PageFold, sign: number): Point[] {
	const clipped: Point[] = [];
	const distance = (point: Point) =>
		sign *
		((point.x - fold.midpoint.x) * fold.normal.x + (point.y - fold.midpoint.y) * fold.normal.y);
	let previous = polygon[polygon.length - 1];
	let previousDistance = distance(previous);
	for (const current of polygon) {
		const currentDistance = distance(current);
		if (previousDistance < 0 !== currentDistance < 0) {
			const fraction = previousDistance / (previousDistance - currentDistance);
			clipped.push({
				x: previous.x + fraction * (current.x - previous.x),
				y: previous.y + fraction * (current.y - previous.y),
			});
		}
		if (currentDistance >= 0) clipped.push(current);
		previous = current;
		previousDistance = currentDistance;
	}
	const unique = clipped.filter((point, index) => {
		const next = clipped[(index + 1) % clipped.length];
		return point.x !== next.x || point.y !== next.y;
	});
	return unique.length < 3 ? [] : unique;
}

function rigidSurface(frame: BookmarkLeafFrame, polygon: Point[]): BookmarkFoldSurface {
	const direction = frame.isLTR ? 1 : -1;
	const face = frame.position < 0.5 ? 0 : 1;
	return {
		polygon,
		transform: `translateX(${frame.isLTR ? frame.width : 0}px) rotateY(${-direction * frame.position * 180}deg) scaleX(${direction})`,
		transformOrigin: "0px 0px",
		face,
		zIndex: frame.zIndices[face],
	};
}

function localizeSurface(
	surface: BookmarkFoldSurface,
	rectangle: BookmarkSheetRectangle,
): BookmarkFoldSurface {
	return {
		...surface,
		polygon: surface.polygon.map((point) => ({
			x: point.x - rectangle.left,
			y: point.y - rectangle.top,
		})),
		transform: `${surface.transform} translate(${rectangle.left}px, ${rectangle.top}px)`,
	};
}

/**
 * Split protruding bookmark material at the actual paper crease. A page's clip polygon
 * cannot be reused here: it deliberately excludes the area outside the paper rectangle.
 */
export function getBookmarkFoldSurfaces(
	frame: BookmarkLeafFrame,
	rectangle: BookmarkSheetRectangle,
): BookmarkFoldSurface[] {
	if (
		rectangle.width <= 0 ||
		rectangle.height <= 0 ||
		!Object.values(rectangle).every(Number.isFinite)
	) {
		return [];
	}
	const polygon = rectanglePolygon(rectangle);
	const fold = frame.fold;
	if (frame.kind !== "paper" || !fold) {
		return [localizeSurface(rigidSurface(frame, polygon), rectangle)];
	}
	const direction = (frame.backwardPreview ? !frame.isLTR : frame.isLTR) ? 1 : -1;
	const offset = frame.backwardPreview ? 0 : frame.isLTR ? frame.width : -frame.width;
	const translation = offset + (direction === -1 ? frame.width : 0);
	const [a, b, c, d, tx, ty] = fold.reflection;
	const frontFace = frame.backwardPreview ? 1 : 0;
	const surfaces: BookmarkFoldSurface[] = [
		{
			polygon: clipMaterial(polygon, fold, -1),
			transform: `matrix(${direction}, 0, 0, 1, ${translation}, 0)`,
			transformOrigin: "0px 0px",
			face: frontFace,
			zIndex: frame.zIndices[frontFace],
		},
		{
			polygon: clipMaterial(polygon, fold, 1),
			transform: `matrix(${direction * a}, ${b}, ${direction * c}, ${d}, ${translation + direction * tx}, ${ty})`,
			transformOrigin: "0px 0px",
			face: frontFace === 0 ? 1 : 0,
			zIndex: frame.zIndices[frontFace === 0 ? 1 : 0],
		},
	];
	return surfaces
		.filter((surface) => surface.polygon.length > 0)
		.map((surface) => localizeSurface(surface, rectangle));
}
