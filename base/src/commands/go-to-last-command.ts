import type { HotkeyBinding, JumpNavCommand } from "./types";

const hotkeys: HotkeyBinding[] = [{ key: "End" }, { key: "ArrowRight", modifiers: { ctrl: true } }];

export const goToLastCommand: JumpNavCommand = {
	id: "goToLast",
	navKind: "jump",
	enName: "Last Page",
	enDescription: "Jump to the last page",
	nameKey: "command.jumpToLastPage",
	hotkeys,
	execute: (ctx) => {
		const total = ctx.handle?.getters.getTotalPages() ?? 0;
		ctx.handle?.commands.jumpToPage(total - 1);
		return undefined;
	},
	canExecute: (ctx) => {
		const current = ctx.handle?.getters.getCurrentPageIndex() ?? 0;
		const total = ctx.handle?.getters.getTotalPages() ?? 0;
		return current !== total - 1;
	},
};
