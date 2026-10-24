interface BookmarkStack {
	capacity: number;
	layers: number;
	length: number;
	pitch: number;
	stagger: number;
	step: number;
	frontDepth: number;
	depth: number;
}

/** Fit ordered ranges into one rail, leaving an outward strip of every deeper range exposed. */
export function calculateBookmarkStack(
	count: number,
	height: number,
	length: number,
	depth: number,
	gap: number,
	preferredStep: number,
	availableDepth = depth,
	minimumStep = 0,
): BookmarkStack {
	const available = Math.max(0, height);
	const rowLength = Math.min(Math.max(1, length), available);
	let pitch = rowLength + gap;
	let capacity = Math.max(1, Math.floor((available + gap) / pitch) || 1);
	let stagger = 0;
	if (count > capacity) {
		// Leave room for the alternating half row without making neighbours overlap.
		const staggeredCapacity = Math.floor((available - rowLength) / (rowLength + gap / 2) + 0.5);
		capacity = Math.max(1, Math.min(capacity, staggeredCapacity || 1));
		if (capacity > 1) pitch = Math.min(pitch, (available - rowLength) / (capacity - 0.5));
		stagger = Math.min(pitch / 2, available - rowLength);
	}
	const layers = Math.max(1, Math.ceil(count / capacity));
	// Spare gutter can expose wider steps without feeding back into book sizing.
	const stackDepth = Math.min(
		Math.max(depth, availableDepth),
		depth + (layers - 1) * preferredStep,
	);
	const minimumFront = Math.min(depth * 0.75, Math.max(20, depth * 0.6));
	const step = layers > 1 ? Math.min(preferredStep, (stackDepth - minimumFront) / (layers - 1)) : 0;
	if (layers > 1 && step < minimumStep && preferredStep >= minimumStep) {
		const maxLayers = Math.max(1, 1 + Math.floor((stackDepth - minimumFront) / minimumStep));
		const requiredCapacity = Math.ceil(count / maxLayers);
		const compactLength = (available - (requiredCapacity - 0.5) * gap) / (requiredCapacity + 0.5);
		return calculateBookmarkStack(
			count,
			height,
			Math.min(rowLength, Math.max(1, compactLength)),
			depth,
			gap,
			preferredStep,
			availableDepth,
		);
	}
	return {
		capacity,
		layers,
		length: rowLength,
		pitch,
		stagger,
		step,
		frontDepth: stackDepth - (layers - 1) * step,
		depth: stackDepth,
	};
}
