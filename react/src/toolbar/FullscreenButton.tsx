import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { MaximizeIcon, MinimizeIcon } from "../icons";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

interface FullscreenButtonProps {
	/** Target element to make fullscreen. If not provided, uses Toolbar's fullscreenTargetRef or document.documentElement */
	targetRef?: React.RefObject<HTMLElement | null>;
	/** Custom content for enter fullscreen. Defaults to MaximizeIcon */
	enterIcon?: React.ReactNode;
	/** Custom content for exit fullscreen. Defaults to MinimizeIcon */
	exitIcon?: React.ReactNode;
	/** ARIA label for entering fullscreen. Defaults to "Enter fullscreen" */
	ariaLabelEnter?: string;
	/** ARIA label for exiting fullscreen. Defaults to "Exit fullscreen" */
	ariaLabelExit?: string;
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button to toggle fullscreen mode.
 */
const FullscreenButton: React.FC<FullscreenButtonProps> = ({
	targetRef: targetRefProp,
	enterIcon,
	exitIcon,
	ariaLabelEnter = "Enter fullscreen",
	ariaLabelExit = "Exit fullscreen",
	className,
}) => {
	const [isFullscreen, setIsFullscreen] = useState(false);
	const toolbar = useToolbar();
	const targetRef = targetRefProp ?? toolbar.fullscreenTargetRef;

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

	const label = isFullscreen ? ariaLabelExit : ariaLabelEnter;
	const icon = isFullscreen
		? (exitIcon ?? <MinimizeIcon size={18} />)
		: (enterIcon ?? <MaximizeIcon size={18} />);

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
