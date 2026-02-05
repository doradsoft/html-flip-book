import type { Command, HotkeyBinding } from "./types";

/**
 * Default hotkey bindings for built-in commands.
 */
export const DEFAULT_HOTKEYS: Record<string, HotkeyBinding[]> = {
	flipNext: [
		{ key: "ArrowRight" },
		{ key: "PageDown" },
		{ key: " " }, // Space
	],
	flipPrev: [{ key: "ArrowLeft" }, { key: "PageUp" }],
	goToFirst: [{ key: "Home" }],
	goToLast: [{ key: "End" }],
	goToToc: [{ key: "t" }],
	toggleFullscreen: [{ key: "f" }],
};

/**
 * Built-in commands for flipbook navigation.
 */
export const defaultCommands: Command[] = [
	{
		id: "flipNext",
		name: "Next Page",
		description: "Flip to the next page",
		execute: ({ flipBookRef }) => {
			flipBookRef.current?.flipNext();
			return undefined;
		},
		canExecute: ({ currentPage, totalPages }) => currentPage < totalPages - 1,
	},
	{
		id: "flipPrev",
		name: "Previous Page",
		description: "Flip to the previous page",
		execute: ({ flipBookRef }) => {
			flipBookRef.current?.flipPrev();
			return undefined;
		},
		canExecute: ({ currentPage }) => currentPage > 0,
	},
	{
		id: "goToFirst",
		name: "First Page",
		description: "Jump to the first page",
		execute: ({ flipBookRef }) => {
			flipBookRef.current?.jumpToPage(0);
			return undefined;
		},
		canExecute: ({ currentPage }) => currentPage > 0,
	},
	{
		id: "goToLast",
		name: "Last Page",
		description: "Jump to the last page",
		execute: ({ flipBookRef, totalPages }) => {
			flipBookRef.current?.jumpToPage(totalPages - 1);
			return undefined;
		},
		canExecute: ({ currentPage, totalPages }) => currentPage < totalPages - 1,
	},
	{
		id: "goToToc",
		name: "Table of Contents",
		description: "Jump to the table of contents",
		execute: ({ flipBookRef, data }) => {
			const tocIndex = (data?.tocPageIndex as number) ?? 4;
			flipBookRef.current?.jumpToPage(tocIndex);
			return undefined;
		},
		canExecute: ({ currentPage, data }) => {
			const tocIndex = (data?.tocPageIndex as number) ?? 4;
			return currentPage !== tocIndex;
		},
	},
	{
		id: "toggleFullscreen",
		name: "Toggle Fullscreen",
		description: "Enter or exit fullscreen mode",
		execute: ({ data }) => {
			const targetRef = data?.fullscreenTargetRef as
				| React.RefObject<HTMLElement | null>
				| undefined;
			if (document.fullscreenElement) {
				document.exitFullscreen().catch(console.warn);
			} else {
				const target = targetRef?.current ?? document.documentElement;
				target.requestFullscreen().catch(console.warn);
			}
			return undefined;
		},
	},
];
