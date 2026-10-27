import { describe, expect, it, vi } from "vitest";
import { HoldHotkeyController, hotkeyMatches, type ToggleCommandDefinition } from "../commands";

function setup(initial = true) {
	let active = initial;
	const setActive = vi.fn((_ctx, next: boolean) => {
		active = next;
		return undefined;
	});
	const command: ToggleCommandDefinition = {
		id: "testToggle",
		kind: "toggle",
		enName: "Test Toggle",
		isActive: () => active,
		setActive,
		execute: () => undefined,
	};
	return { holds: new HoldHotkeyController(), command, setActive, isActive: () => active };
}

describe("HoldHotkeyController", () => {
	it.each([
		true,
		false,
	])("restores the previous state (%s), ignoring repeated presses", (initial) => {
		const { holds, command, setActive, isActive } = setup(initial);
		const binding = { key: "Control", mode: "hold" as const, active: false };
		expect(holds.press(command, binding, { handle: null })).toBe(true);
		expect(isActive()).toBe(false);
		expect(holds.press(command, binding, { handle: null })).toBe(false);
		expect(setActive).toHaveBeenCalledTimes(1);
		holds.release(new KeyboardEvent("keyup", { key: "Control" }), "ltr");
		expect(isActive()).toBe(initial);
		expect(setActive).toHaveBeenLastCalledWith({ handle: null, transient: true }, initial);
	});

	it("releases a chord when its modifier is released before the main key", () => {
		const { holds, command, isActive } = setup(false);
		holds.press(command, { key: "s", modifiers: { ctrl: true }, mode: "hold" }, { handle: null });
		expect(isActive()).toBe(true);
		holds.release(new KeyboardEvent("keyup", { key: "x", ctrlKey: true }), "ltr");
		expect(isActive()).toBe(true);
		holds.release(new KeyboardEvent("keyup", { key: "Control" }), "ltr");
		expect(isActive()).toBe(false);
	});

	it("retains overlapping bindings until each is released", () => {
		const { holds, command, isActive } = setup(false);
		holds.press(command, { key: "a", mode: "hold" }, { handle: null });
		holds.press(command, { key: "b", mode: "hold", active: false }, { handle: null });
		expect(isActive()).toBe(false);
		holds.release(new KeyboardEvent("keyup", { key: "b" }), "ltr");
		expect(isActive()).toBe(true);
		holds.clear();
		expect(isActive()).toBe(false);
	});

	it("preserves holds across equivalent options and restores disabled bindings", () => {
		const { holds, command, isActive } = setup();
		const binding = { key: "Control", mode: "hold" as const, active: false };
		holds.press(command, binding, { handle: null });
		const registry = { testToggle: { command, options: { hotkeys: [{ ...binding }] } } };
		expect(holds.reconcile(registry, false)).toBe(false);
		expect(isActive()).toBe(false);
		expect(holds.reconcile(registry, true)).toBe(true);
		expect(isActive()).toBe(true);
	});

	it("does not capture a state when the toggle rejects the override", () => {
		const { holds, command } = setup();
		command.setActive = () => false;
		expect(holds.press(command, { key: "s", mode: "hold" }, { handle: null })).toBe(false);
		expect(holds.has(command.id)).toBe(false);
	});
});

describe("hotkeyMatches", () => {
	it.each([
		["Control", { ctrlKey: true }],
		["Shift", { shiftKey: true }],
		["Alt", { altKey: true }],
		["Meta", { metaKey: true }],
	])("matches a modifier-only %s binding", (key, modifiers) => {
		expect(hotkeyMatches({ key }, new KeyboardEvent("keydown", { key, ...modifiers }), "ltr")).toBe(
			true,
		);
	});
	it("keeps ordinary modifier requirements exact and respects RTL arrows", () => {
		expect(
			hotkeyMatches({ key: "s" }, new KeyboardEvent("keydown", { key: "s", ctrlKey: true }), "ltr"),
		).toBe(false);
		expect(
			hotkeyMatches(
				{ key: "ArrowLeft" },
				new KeyboardEvent("keydown", { key: "ArrowRight" }),
				"rtl",
			),
		).toBe(true);
	});
});
