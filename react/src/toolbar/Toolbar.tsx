import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CommandDefinition, CommandOptions } from "../commands";
import { CommandProvider } from "../commands/CommandContext";
import { openDownloadMenuCommand } from "../commands/open-download-menu-command";
import type { FlipBookHandle, PageSemantics } from "../FlipBook";
import { defaultLocale, directionFromLocale, type Locale } from "../i18n";
import { ToolbarContext } from "./ToolbarContext";
import "./Toolbar.css";

interface ToolbarProps {
	/** Ref to the FlipBook component for programmatic control */
	flipBookRef: React.RefObject<FlipBookHandle | null>;
	/** Text direction. Defaults from intl locale (en-US → ltr). */
	direction?: "ltr" | "rtl";
	/** Locale for UI strings. Defaults to en-US. */
	locale?: Locale;
	/** Optional page semantics for semantic indicator (e.g. perek/chapter) */
	pageSemantics?: PageSemantics;
	/** Additional CSS class name */
	className?: string;
	/** Toolbar children in reading order: First, Prev, Indicator, Next, Last */
	children: React.ReactNode;
	/** Enable keyboard hotkeys for commands. Defaults to true */
	enableHotkeys?: boolean;
	/** Custom commands to register (merged with defaults) */
	commands?: CommandDefinition[];
	/** Options for specific commands (e.g., custom hotkeys, data) */
	commandOptions?: Record<string, CommandOptions>;
	/** When set, fullscreen (keyboard or button) targets this container only (e.g. sefer + toolbar wrapper). */
	fullscreenTargetRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Container component for FlipBook toolbar controls.
 * Provides context to child components for accessing FlipBook methods.
 * Includes command system with configurable keyboard hotkeys.
 */
const Toolbar: React.FC<ToolbarProps> = ({
	flipBookRef,
	direction: directionProp,
	locale: localeProp,
	pageSemantics,
	className = "",
	children,
	enableHotkeys = true,
	commands,
	commandOptions,
	fullscreenTargetRef,
}) => {
	const direction = directionProp ?? directionFromLocale(localeProp ?? defaultLocale);
	const locale = localeProp ?? (direction === "rtl" ? "he-IL" : "en-US");
	const openDownloadMenuRef = useRef<(() => void) | null>(null);
	const downloadExecutorRef = useRef<((from?: number, to?: number) => void) | null>(null);
	const [currentPage, setCurrentPage] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [of, setOf] = useState<string | number>(0);
	const [isFirstPage, setIsFirstPage] = useState(true);
	const [isLastPage, setIsLastPage] = useState(false);

	const mergedCommandOptions: Record<string, CommandOptions> = {
		...(fullscreenTargetRef
			? {
					toggleFullscreen: {
						data: {
							getFullscreenTarget: () => fullscreenTargetRef.current ?? null,
						},
					},
				}
			: {}),
		openDownloadMenu: {
			data: { open: () => openDownloadMenuRef.current?.() },
		},
		download: {
			data: {
				onDownload: (from?: number, to?: number) => downloadExecutorRef.current?.(from, to),
			},
		},
		...commandOptions,
	};

	// Update state from FlipBook ref (book is source of truth for current, total, of)
	const updateState = useCallback(() => {
		const fb = flipBookRef.current;
		if (fb) {
			setCurrentPage(fb.getCurrentPageIndex());
			setTotalPages(fb.getTotalPages());
			setOf(fb.getOf());
			setIsFirstPage(fb.isFirstPage());
			setIsLastPage(fb.isLastPage());
		}
	}, [flipBookRef]);

	// Initial state update and periodic polling (throttled to reduce flicker)
	// TODO: Replace with event-based updates when FlipBook emits page change events
	useEffect(() => {
		updateState();
		const interval = setInterval(updateState, 200);
		return () => clearInterval(interval);
	}, [updateState]);

	const toolbarContent = (
		<ToolbarContext.Provider
			value={{
				flipBookRef,
				direction,
				locale,
				pageSemantics,
				currentPage,
				totalPages,
				of,
				isFirstPage,
				isLastPage,
				openDownloadMenuRef,
				downloadExecutorRef,
				fullscreenTargetRef,
			}}
		>
			<div
				className={`flipbook-toolbar ${direction === "rtl" ? "flipbook-toolbar--rtl" : ""} ${className}`.trim()}
				role="toolbar"
				aria-label="FlipBook navigation"
				dir={direction}
			>
				{children}
			</div>
		</ToolbarContext.Provider>
	);

	const allCommands: CommandDefinition[] = [openDownloadMenuCommand, ...(commands ?? [])];

	return (
		<CommandProvider
			flipBookRef={flipBookRef}
			currentPage={currentPage}
			totalPages={totalPages}
			direction={direction}
			commands={allCommands}
			commandOptions={mergedCommandOptions}
			disableHotkeys={!enableHotkeys}
		>
			{toolbarContent}
		</CommandProvider>
	);
};

export { Toolbar };
export type { ToolbarProps };
