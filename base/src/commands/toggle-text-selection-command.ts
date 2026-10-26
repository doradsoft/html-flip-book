import type { ToggleCommandDefinition } from "./types";

/** Select text normally; hold Ctrl to temporarily return to page turning. */
export const toggleTextSelectionCommand: ToggleCommandDefinition = {
	id: "toggleTextSelection",
	kind: "toggle",
	enName: "Select Text",
	enDescription: "Toggle text selection; hold Ctrl to temporarily turn pages instead",
	hotkeys: [{ key: "Control", mode: "hold", active: false }],
	canExecute: (ctx) => !!(ctx.handle?.getMouseMode && ctx.handle?.setMouseMode),
	isActive: (ctx) => ctx.handle?.getMouseMode?.() === "select",
	setActive: (ctx, active) => {
		if (!ctx.handle?.setMouseMode) return false;
		const mode = active ? "select" : "turn";
		if (ctx.transient) ctx.handle.setMouseMode(mode, { persist: false });
		else ctx.handle.setMouseMode(mode);
		return undefined;
	},
	execute: (ctx) => {
		const result = toggleTextSelectionCommand.setActive(
			ctx,
			!toggleTextSelectionCommand.isActive(ctx),
		);
		if (result !== false) window.getSelection()?.removeAllRanges();
		return result;
	},
};
