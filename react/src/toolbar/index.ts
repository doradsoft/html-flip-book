// Toolbar components barrel export

export type { Command, CommandOptions, HotkeyBinding } from "../commands";
// Commands
export { DEFAULT_HOTKEYS, defaultCommands, useCommands } from "../commands";
export type {
	DownloadResult,
	PageRangesDownloadContext,
	PageRangesDownloadHandler,
	SeferDownloadHandler,
	SemanticPageInfo,
} from "../download/types";
export type { IconProps } from "../icons";
// Icons
export {
	BookshelfIcon,
	ChevronFirstIcon,
	ChevronLastIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	DownloadIcon,
	MaximizeIcon,
	MinimizeIcon,
	TableOfContentsIcon,
} from "../icons";
export type { ActionButtonProps } from "./ActionButton";
export { ActionButton } from "./ActionButton";
export type { DownloadDropdownProps } from "./DownloadDropdown";
export { DownloadDropdown } from "./DownloadDropdown";
export type { FirstPageButtonProps } from "./FirstPageButton";
export { FirstPageButton } from "./FirstPageButton";
export type { FullscreenButtonProps } from "./FullscreenButton";
export { FullscreenButton } from "./FullscreenButton";
export type { LastPageButtonProps } from "./LastPageButton";
export { LastPageButton } from "./LastPageButton";
export type { NextButtonProps } from "./NextButton";
export { NextButton } from "./NextButton";
/** @deprecated Use PageIndicatorProps instead */
export type {
	PageIndicatorMode,
	PageIndicatorProps,
	PageIndicatorProps as SemanticPageIndicatorProps,
} from "./PageIndicator";
// Deprecated: use PageIndicator with mode="semantic" instead
/** @deprecated Use PageIndicator with mode="semantic" instead */
export { PageIndicator, PageIndicator as SemanticPageIndicator } from "./PageIndicator";
export type { PrevButtonProps } from "./PrevButton";
export { PrevButton } from "./PrevButton";
export type { TocButtonProps } from "./TocButton";
export { TocButton } from "./TocButton";
export type { ToolbarProps } from "./Toolbar";
export { Toolbar } from "./Toolbar";
export type { ToolbarButtonProps } from "./ToolbarButton";
export { ToolbarButton } from "./ToolbarButton";
export type { ToolbarContextValue } from "./ToolbarContext";
export { useToolbar } from "./ToolbarContext";
