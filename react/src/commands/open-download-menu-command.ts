import type { CommandDefinition } from "html-flip-book-vanilla/commands";

/**
 * React-layer command: open the download dropdown (e.g. Ctrl+S).
 * Toolbar wires data.open to openDownloadMenuRef.current.
 */
export const openDownloadMenuCommand: CommandDefinition = {
	id: "openDownloadMenu",
	enName: "Open download menu",
	enDescription: "Open the download menu",
	nameKey: "toolbarItem.download",
	hotkeys: [{ key: "s", modifiers: { ctrl: true } }],
	execute: (ctx) => {
		(ctx.data?.open as (() => void) | undefined)?.();
		return undefined;
	},
	canExecute: (ctx) => typeof ctx.data?.open === "function",
};
