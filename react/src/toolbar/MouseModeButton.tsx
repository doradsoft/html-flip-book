import type React from "react";
import { t } from "../i18n";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbar } from "./ToolbarContext";

export interface MouseModeButtonProps {
	/** Override the locale's letters shown beside the text caret. */
	letters?: string;
	/** Override the localized accessible label. */
	ariaLabel?: string;
	className?: string;
}

/** Switch mouse dragging between native page turning and text selection. */
export const MouseModeButton: React.FC<MouseModeButtonProps> = ({
	letters,
	ariaLabel,
	className,
}) => {
	const { flipBookRef, locale, mouseMode } = useToolbar();
	const label = ariaLabel ?? t("toolbarItem.selectText", locale);
	return (
		<ToolbarButton
			onClick={() => {
				flipBookRef.current?.setMouseMode(mouseMode === "turn" ? "select" : "turn");
				window.getSelection()?.removeAllRanges();
			}}
			ariaLabel={label}
			ariaPressed={mouseMode === "select"}
			className={`flipbook-toolbar-mouse-mode ${className ?? ""}`.trim()}
		>
			<span className="flipbook-toolbar-mouse-mode-icon" aria-hidden="true">
				<span className="flipbook-toolbar-mouse-mode-caret" />
				<span>{letters ?? t("toolbarItem.selectionLetters", locale)}</span>
			</span>
		</ToolbarButton>
	);
};
