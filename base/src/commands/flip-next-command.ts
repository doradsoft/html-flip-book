import type { FlipNavCommand, HotkeyBinding } from "./types";

const hotkeys: HotkeyBinding[] = [
	{ key: "ArrowRight" },
	{ key: "PageDown" },
	{ key: " " }, // Space
];

export const flipNextCommand: FlipNavCommand = {
	id: "flipNext",
	navKind: "flip",
	enName: "Next Page",
	enDescription: "Flip to the next page",
	nameKey: "command.jumpToNextPage",
	hotkeys,
	execute: (ctx) => {
		ctx.handle?.flipNext();
		return undefined;
	},
	canExecute: (ctx) =>
		(ctx.handle?.getCurrentPageIndex() ?? 0) < (ctx.handle?.getTotalPages() ?? 0) - 1,
};
