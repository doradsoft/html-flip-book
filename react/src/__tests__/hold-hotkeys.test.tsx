import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandProvider, type ToggleCommandDefinition } from "../commands";
import type { FlipBookHandle } from "../FlipBook";
import { ToggleButton } from "../toolbar";

function setupToggle(initial = true) {
	let active = initial;
	const command: ToggleCommandDefinition = {
		id: "toggleExample",
		kind: "toggle",
		enName: "Toggle Example",
		hotkeys: [{ key: "Control", mode: "hold", active: false }],
		isActive: () => active,
		setActive: vi.fn((_ctx, value) => {
			active = value;
			return undefined;
		}),
		execute: () => {
			active = !active;
			return undefined;
		},
	};
	const ref = { current: null as FlipBookHandle | null };
	const view = (disabled = false) => (
		<CommandProvider
			flipBookRef={ref}
			currentPage={0}
			totalPages={10}
			commands={[command]}
			disableHotkeys={disabled}
		>
			<ToggleButton command={command} ariaLabel="Example">
				Example
			</ToggleButton>
			<input aria-label="Editor" />
			<div contentEditable suppressContentEditableWarning>
				<span data-testid="editable-child">Editable</span>
			</div>
		</CommandProvider>
	);
	return { command, view };
}

describe("Hold hotkeys", () => {
	it("updates the toggle button immediately and restores the state on release in an input", () => {
		const { command, view } = setupToggle();
		const rendered = render(view());
		const button = screen.getByRole("button", { name: "Example" });
		expect(button.getAttribute("aria-pressed")).toBe("true");
		const event = new KeyboardEvent("keydown", {
			key: "Control",
			ctrlKey: true,
			bubbles: true,
			cancelable: true,
		});
		fireEvent(document, event);
		expect(event.defaultPrevented).toBe(false);
		expect(button.getAttribute("aria-pressed")).toBe("false");
		expect(button.hasAttribute("disabled")).toBe(true);
		fireEvent.keyDown(document, { key: "Control", ctrlKey: true, repeat: true });
		rendered.rerender(view());
		expect(command.setActive).toHaveBeenCalledTimes(1);
		expect(button.getAttribute("aria-pressed")).toBe("false");
		fireEvent.keyUp(screen.getByRole("textbox", { name: "Editor" }), { key: "Control" });
		expect(button.getAttribute("aria-pressed")).toBe("true");
		expect(button.hasAttribute("disabled")).toBe(false);
		fireEvent.click(button);
		expect(button.getAttribute("aria-pressed")).toBe("false");
	});

	it("ignores hold starts inside editors and nested editable content", () => {
		const { command, view } = setupToggle();
		render(view());
		fireEvent.keyDown(screen.getByRole("textbox", { name: "Editor" }), {
			key: "Control",
			ctrlKey: true,
		});
		fireEvent.keyDown(screen.getByTestId("editable-child"), { key: "Control", ctrlKey: true });
		expect(command.setActive).not.toHaveBeenCalled();
	});

	it.each([
		"blur",
		"hidden",
		"disabled",
		"unmount",
	])("restores the previous state on %s", (reason) => {
		const { command, view } = setupToggle();
		const rendered = render(view());
		fireEvent.keyDown(document, { key: "Control", ctrlKey: true });
		if (reason === "blur") fireEvent(window, new Event("blur"));
		if (reason === "hidden") {
			vi.spyOn(document, "hidden", "get").mockReturnValue(true);
			fireEvent(document, new Event("visibilitychange"));
			vi.restoreAllMocks();
		}
		if (reason === "disabled") rendered.rerender(view(true));
		if (reason === "unmount") rendered.unmount();
		expect(command.isActive({ handle: null })).toBe(true);
	});

	it("does not run ordinary actions configured with a hold binding", () => {
		const execute = vi.fn();
		render(
			<CommandProvider
				flipBookRef={{ current: null }}
				currentPage={0}
				totalPages={0}
				commands={[
					{ id: "action", enName: "Action", hotkeys: [{ key: "x", mode: "hold" }], execute },
				]}
			>
				<span>Content</span>
			</CommandProvider>,
		);
		fireEvent.keyDown(document, { key: "x" });
		fireEvent.keyUp(document, { key: "x" });
		expect(execute).not.toHaveBeenCalled();
	});
});
