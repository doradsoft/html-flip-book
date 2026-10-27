import type React from "react";
import { toggleTextSelectionCommand } from "../commands";
import { t } from "../i18n";
import { ToggleButton } from "./ToggleButton";
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
	const { locale } = useToolbar();
	const label = ariaLabel ?? t("toolbarItem.selectText", locale);
	return (
		<ToggleButton
			command={toggleTextSelectionCommand}
			ariaLabel={label}
			className={`flipbook-toolbar-mouse-mode ${className ?? ""}`.trim()}
		>
			<span className="flipbook-toolbar-mouse-mode-icon" aria-hidden="true">
				<span className="flipbook-toolbar-mouse-mode-caret" />
				<span>{letters ?? t("toolbarItem.selectionLetters", locale)}</span>
			</span>
		</ToggleButton>
	);
};
