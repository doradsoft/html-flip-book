import type { CommandDefinition } from "./types";

/**
 * Download command: the dropdown (or other UI) can call it with nothing or with from/to.
 * Execute invokes data.onDownload(from, to); actual behavior is wired by the upper layer (e.g. React).
 * No hotkeys here; "open download menu" (e.g. Ctrl+S) is implemented in the upper layer.
 */
export const downloadCommand: CommandDefinition = {
	id: "download",
	enName: "Download",
	enDescription: "Download entire book or page range",
	nameKey: "toolbarItem.download",
	hotkeys: [],
	execute: (ctx) => {
		ctx.data?.onDownload?.(
			ctx.data?.from as number | undefined,
			ctx.data?.to as number | undefined,
		);
		return undefined;
	},
	canExecute: (ctx) => typeof ctx.data?.onDownload === "function",
};
