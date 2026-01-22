import { FlipBook as FlipBookBase, type PageSemantics } from "html-flip-book-vanilla";
import type React from "react";
import { Children, useEffect, useRef } from "react";

interface FlipBookWrapperProps {
	pages: React.ReactNode[];
	className: string;
	pageSemantics?: PageSemantics;
	debug?: boolean;
	direction?: "rtl" | "ltr";
	/** Indices of leaves that should start in the turned (flipped) state */
	initialTurnedLeaves?: number[];
	/** Velocity threshold (px/s) for fast swipe to complete flip. Default: 500 */
	fastDeltaThreshold?: number;
	/**
	 * Number of leaves to keep rendered before and after the current position.
	 * When set, only leaves within the buffer range are visible for performance.
	 * Default: undefined (all leaves are always rendered)
	 */
	leavesBuffer?: number;
}

const FlipBookReact: React.FC<FlipBookWrapperProps> = ({
	pages,
	className,
	debug = false,
	direction = "ltr",
	pageSemantics = undefined,
	initialTurnedLeaves = [],
	fastDeltaThreshold,
	leavesBuffer,
}) => {
	const flipBook = useRef(
		new FlipBookBase({
			pageSemantics: pageSemantics,
			pagesCount: pages.length,
			direction: direction,
			initialTurnedLeaves: initialTurnedLeaves,
			fastDeltaThreshold: fastDeltaThreshold,
			leavesBuffer: leavesBuffer,
		}),
	);

	useEffect(() => {
		const currentFlipBook = flipBook.current;
		currentFlipBook.render(`.${className}`, debug);

		// Cleanup function to destroy Hammer instance and event listeners
		return () => {
			currentFlipBook.destroy();
		};
	}, [className, debug]);

	// Use Children.toArray to get stable keys for each page element
	const pagesWithKeys = Children.toArray(pages);

	return (
		<div className={className}>
			{pagesWithKeys.map((page) => (
				<div key={(page as React.ReactElement).key} className="page">
					{page}
				</div>
			))}
		</div>
	);
};

export { FlipBookReact as FlipBook };
export type { PageSemantics };
