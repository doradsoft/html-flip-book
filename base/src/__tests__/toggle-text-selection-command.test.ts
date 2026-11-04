import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type FlipBookHandleLike,
	HoldHotkeyController,
	toggleTextSelectionCommand,
} from "../commands";

function setup() {
	let mode = "select";
	const setMouseMode = vi.fn((next: string) => {
		mode = next;
	});
	const handle = {
		getMouseMode: () => mode,
		setMouseMode,
	} as unknown as FlipBookHandleLike;
	return { context: { handle }, setMouseMode, holds: new HoldHotkeyController() };
}

function selectText() {
	const paragraph = document.createElement("p");
	paragraph.textContent = "Text to copy";
	document.body.append(paragraph);
	const range = document.createRange();
	range.selectNodeContents(paragraph);
	window.getSelection()?.addRange(range);
}

afterEach(() => {
	window.getSelection()?.removeAllRanges();
	document.body.replaceChildren();
});

describe("toggleTextSelectionCommand", () => {
	it("preserves an existing selection without capturing the Control hold", () => {
		const { context, setMouseMode, holds } = setup();
		selectText();
		expect(window.getSelection()?.toString()).toBe("Text to copy");
		expect(
			holds.press(
				toggleTextSelectionCommand,
				{ key: "Control", mode: "hold", active: false },
				context,
			),
		).toBe(false);
		expect(setMouseMode).not.toHaveBeenCalled();
		expect(holds.has(toggleTextSelectionCommand.id)).toBe(false);
		expect(window.getSelection()?.toString()).toBe("Text to copy");
	});

	it("temporarily turns pages once the selection is collapsed", () => {
		const { context, setMouseMode, holds } = setup();
		selectText();
		window.getSelection()?.collapseToEnd();
		expect(
			holds.press(
				toggleTextSelectionCommand,
				{ key: "Control", mode: "hold", active: false },
				context,
			),
		).toBe(true);
		expect(setMouseMode).toHaveBeenLastCalledWith("turn", { persist: false });
		holds.release(new KeyboardEvent("keyup", { key: "Control" }), "ltr");
		expect(setMouseMode).toHaveBeenLastCalledWith("select", { persist: false });
	});

	it("still allows an explicit toggle to clear a selection and turn pages", () => {
		const { context, setMouseMode } = setup();
		selectText();
		toggleTextSelectionCommand.execute(context);
		expect(setMouseMode).toHaveBeenCalledWith("turn");
		expect(window.getSelection()?.rangeCount).toBe(0);
	});
});
