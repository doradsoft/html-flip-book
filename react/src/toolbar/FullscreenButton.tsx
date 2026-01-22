import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { ToolbarButton } from "./ToolbarButton";

interface FullscreenButtonProps {
	/** Target element to make fullscreen. If not provided, uses document.documentElement */
	targetRef?: React.RefObject<HTMLElement | null>;
	/** Custom content for enter fullscreen. Defaults to "⛶" */
	enterIcon?: React.ReactNode;
	/** Custom content for exit fullscreen. Defaults to "⛶" */
	exitIcon?: React.ReactNode;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button to toggle fullscreen mode.
 */
const FullscreenButton: React.FC<FullscreenButtonProps> = ({
	targetRef,
	enterIcon,
	exitIcon,
	className,
}) => {
	const [isFullscreen, setIsFullscreen] = useState(false);

	// Check fullscreen state
	const updateFullscreenState = useCallback(() => {
		setIsFullscreen(!!document.fullscreenElement);
	}, []);

	useEffect(() => {
		document.addEventListener("fullscreenchange", updateFullscreenState);
		return () => {
			document.removeEventListener("fullscreenchange", updateFullscreenState);
		};
	}, [updateFullscreenState]);

	const handleClick = async () => {
		try {
			if (isFullscreen) {
				await document.exitFullscreen();
			} else {
				const target = targetRef?.current ?? document.documentElement;
				await target.requestFullscreen();
			}
		} catch (error) {
			console.warn("Fullscreen request failed:", error);
		}
	};

	const label = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";
	const icon = isFullscreen ? (exitIcon ?? "⛶") : (enterIcon ?? "⛶");

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={label}
			className={`flipbook-toolbar-fullscreen ${isFullscreen ? "flipbook-toolbar-fullscreen--active" : ""} ${className ?? ""}`.trim()}
		>
			{icon}
		</ToolbarButton>
	);
};

export { FullscreenButton };
export type { FullscreenButtonProps };
