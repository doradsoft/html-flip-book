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
		ctx.handle?.commands.flipNext();
		return undefined;
	},
	canExecute: (ctx) =>
		(ctx.handle?.getters.getCurrentPageIndex() ?? 0) <
		(ctx.handle?.getters.getTotalPages() ?? 0) - 1,
};
