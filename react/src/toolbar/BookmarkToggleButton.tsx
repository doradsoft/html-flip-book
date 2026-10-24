import { ToolbarButton } from "./ToolbarButton";

export interface BookmarkToggleButtonProps {
	/** Current consumer-controlled bookmark visibility. */
	enabled: boolean;
	/** Update the book's enableBookmarks prop without changing its navigation state. */
	onChange: (enabled: boolean) => void;
	ariaLabel?: string;
	className?: string;
}

/** An opt-in bookmark visibility control for a consumer's toolbar. */
export const BookmarkToggleButton = ({
	enabled,
	onChange,
	ariaLabel,
	className,
}: BookmarkToggleButtonProps) => (
	<ToolbarButton
		onClick={() => onChange(!enabled)}
		ariaLabel={ariaLabel ?? (enabled ? "Hide bookmarks" : "Show bookmarks")}
		ariaPressed={enabled}
		className={`flipbook-toolbar-bookmarks ${className ?? ""}`.trim()}
	>
		<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
			<path
				d="M5 2.5h10v15l-5-3-5 3z"
				fill={enabled ? "currentColor" : "none"}
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
		</svg>
	</ToolbarButton>
);
