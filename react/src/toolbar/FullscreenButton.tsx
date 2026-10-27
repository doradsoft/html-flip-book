import type React from "react";
import { useEffect, useState } from "react";
import {
	canUseFullscreen,
	fullscreenStateEvents,
	getFullscreenElement,
	toggleFullscreenCommand,
	useCommands,
} from "../commands";
import { t } from "../i18n";
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
	/** ARIA label for entering fullscreen. Defaults to the locale's "Enter fullscreen" */
	ariaLabelEnter?: string;
	/** ARIA label for exiting fullscreen. Defaults to the locale's "Exit fullscreen" */
	ariaLabelExit?: string;
	/** Behavior when the browser can't use fullscreen (e.g. iOS Safari):
	 * "hide" renders nothing, "disable" shows a disabled button explaining why. Defaults to "hide". */
	unsupportedBehavior?: "hide" | "disable";
	/** Additional CSS class name */
	className?: string;
}

/**
 * Button to toggle fullscreen mode through the toggleFullscreen command,
 * so clicks, hotkeys (F11 by default), and holds stay in sync.
 * Same behavior in LTR and RTL — visual mirroring is handled by CSS
 * (dir="rtl" + icon flip); the default icons are symmetric.
 */
const FullscreenButton: React.FC<FullscreenButtonProps> = ({
	targetRef: targetRefProp,
	enterIcon,
	exitIcon,
	ariaLabelEnter,
	ariaLabelExit,
	unsupportedBehavior = "hide",
	className,
}) => {
	const toolbar = useToolbar();
	const { execute, canExecute } = useCommands();
	const targetRef = targetRefProp ?? toolbar.fullscreenTargetRef;

	// Initial false keeps SSR/first render matching; real values arrive on mount.
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [supported, setSupported] = useState(false);

	// Sync on any transition: button clicks, hotkeys, Escape, browser UI,
	// and rejected requests — standard and vendor-prefixed events alike.
	useEffect(() => {
		const update = () => {
			setIsFullscreen(getFullscreenElement() !== null);
			setSupported(canUseFullscreen(targetRef?.current));
		};
		update();
		for (const type of fullscreenStateEvents) {
			document.addEventListener(type, update);
		}
		return () => {
			for (const type of fullscreenStateEvents) {
				document.removeEventListener(type, update);
			}
		};
	}, [targetRef]);

	const handleClick = () => {
		if (targetRefProp) {
			execute(toggleFullscreenCommand, {
				getFullscreenTarget: () => targetRefProp.current ?? null,
			});
		} else {
			execute(toggleFullscreenCommand);
		}
	};

	if (!supported && unsupportedBehavior === "hide") return null;

	const label = isFullscreen
		? (ariaLabelExit ?? t("toolbarItem.exitFullscreen", toolbar.locale))
		: (ariaLabelEnter ?? t("toolbarItem.enterFullscreen", toolbar.locale));
	const icon = isFullscreen
		? (exitIcon ?? <MinimizeIcon size={18} />)
		: (enterIcon ?? <MaximizeIcon size={18} />);

	return (
		<ToolbarButton
			onClick={handleClick}
			ariaLabel={label}
			ariaPressed={isFullscreen}
			disabled={!supported || !canExecute(toggleFullscreenCommand)}
			title={supported ? label : t("toolbarItem.fullscreenUnsupported", toolbar.locale)}
			className={`flipbook-toolbar-fullscreen ${isFullscreen ? "flipbook-toolbar-fullscreen--active" : ""} ${className ?? ""}`.trim()}
		>
			{icon}
		</ToolbarButton>
	);
};

export { FullscreenButton };
export type { FullscreenButtonProps };
