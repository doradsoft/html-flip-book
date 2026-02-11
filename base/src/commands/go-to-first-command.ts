import type { HotkeyBinding, JumpNavCommand } from "./types";

const hotkeys: HotkeyBinding[] = [{ key: "Home" }, { key: "ArrowLeft", modifiers: { ctrl: true } }];

export const goToFirstCommand: JumpNavCommand = {
	id: "goToFirst",
	navKind: "jump",
	enName: "First Page",
	enDescription: "Jump to the first page",
	nameKey: "command.jumpToFirstPage",
	hotkeys,
	execute: (ctx) => {
		ctx.handle?.jumpToPage(0);
		return undefined;
	},
	canExecute: (ctx) => ctx.handle?.getCurrentPageIndex() !== 0,
};
