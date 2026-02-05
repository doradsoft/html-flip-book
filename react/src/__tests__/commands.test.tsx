import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Command } from "../commands";
import { CommandProvider, DEFAULT_HOTKEYS, defaultCommands, useCommands } from "../commands";
import type { FlipBookHandle } from "../FlipBook";

// Mock flipbook ref
const createMockFlipBookRef = (overrides: Partial<FlipBookHandle> = {}) => ({
	current: {
		flipNext: vi.fn().mockResolvedValue(undefined),
		flipPrev: vi.fn().mockResolvedValue(undefined),
		goToPage: vi.fn().mockResolvedValue(undefined),
		jumpToPage: vi.fn(),
		getCurrentPageIndex: vi.fn().mockReturnValue(2),
		getTotalPages: vi.fn().mockReturnValue(10),
		isFirstPage: vi.fn().mockReturnValue(false),
		isLastPage: vi.fn().mockReturnValue(false),
		...overrides,
	} as FlipBookHandle,
});

// Test component that uses the commands hook
const TestCommandConsumer: React.FC<{
	commandId: string;
	onResult?: (canExecute: boolean) => void;
}> = ({ commandId, onResult }) => {
	const { executeCommand, canExecute, getCommand } = useCommands();
	const command = getCommand(commandId);
	const canExec = canExecute(commandId);

	if (onResult) {
		onResult(canExec);
	}

	return (
		<div>
			<button type="button" onClick={() => executeCommand(commandId)} data-testid="exec-btn">
				Execute {command?.name ?? commandId}
			</button>
			<span data-testid="can-execute">{canExec ? "yes" : "no"}</span>
		</div>
	);
};

describe("Default Commands", () => {
	it("should have all predefined commands", () => {
		const commandIds = defaultCommands.map((c) => c.id);
		expect(commandIds).toContain("flipNext");
		expect(commandIds).toContain("flipPrev");
		expect(commandIds).toContain("goToFirst");
		expect(commandIds).toContain("goToLast");
		expect(commandIds).toContain("goToToc");
		expect(commandIds).toContain("toggleFullscreen");
	});
});

describe("Default Hotkeys", () => {
	it("should have hotkeys for navigation commands", () => {
		expect(DEFAULT_HOTKEYS.flipNext).toBeDefined();
		expect(DEFAULT_HOTKEYS.flipPrev).toBeDefined();
		expect(DEFAULT_HOTKEYS.goToFirst).toBeDefined();
		expect(DEFAULT_HOTKEYS.goToLast).toBeDefined();
	});

	it("should include arrow keys for navigation", () => {
		const flipNextKeys = DEFAULT_HOTKEYS.flipNext.map((h) => h.key);
		const flipPrevKeys = DEFAULT_HOTKEYS.flipPrev.map((h) => h.key);
		expect(flipNextKeys).toContain("ArrowRight");
		expect(flipPrevKeys).toContain("ArrowLeft");
	});
});

describe("CommandProvider", () => {
	it("should provide executeCommand function", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={2} totalPages={10} direction="ltr">
				<TestCommandConsumer commandId="flipNext" />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(mockRef.current.flipNext).toHaveBeenCalled();
	});

	it("should provide canExecute function", () => {
		const mockRef = createMockFlipBookRef();
		let result = false;
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={2} totalPages={10} direction="ltr">
				<TestCommandConsumer
					commandId="flipNext"
					onResult={(r) => {
						result = r;
					}}
				/>
			</CommandProvider>,
		);

		expect(result).toBe(true);
	});

	it("should indicate canExecute=false when at last page for flipNext", () => {
		const mockRef = createMockFlipBookRef();
		let result = true;
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={9} totalPages={10} direction="ltr">
				<TestCommandConsumer
					commandId="flipNext"
					onResult={(r) => {
						result = r;
					}}
				/>
			</CommandProvider>,
		);

		expect(result).toBe(false);
	});

	it("should indicate canExecute=false when at first page for flipPrev", () => {
		const mockRef = createMockFlipBookRef();
		let result = true;
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={0} totalPages={10} direction="ltr">
				<TestCommandConsumer
					commandId="flipPrev"
					onResult={(r) => {
						result = r;
					}}
				/>
			</CommandProvider>,
		);

		expect(result).toBe(false);
	});

	it("should execute goToFirst command", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={5} totalPages={10} direction="ltr">
				<TestCommandConsumer commandId="goToFirst" />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(0);
	});

	it("should execute goToLast command", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={5} totalPages={10} direction="ltr">
				<TestCommandConsumer commandId="goToLast" />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(9);
	});

	it("should execute goToToc command with default index 4", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={5} totalPages={10} direction="ltr">
				<TestCommandConsumer commandId="goToToc" />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(4);
	});

	it("should support custom commands", () => {
		const mockRef = createMockFlipBookRef();
		const customAction = vi.fn();
		const customCommand: Command = {
			id: "customCmd",
			name: "Custom Command",
			execute: customAction,
		};

		render(
			<CommandProvider
				flipBookRef={mockRef}
				currentPage={0}
				totalPages={10}
				direction="ltr"
				commands={[customCommand]}
			>
				<TestCommandConsumer commandId="customCmd" />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(customAction).toHaveBeenCalled();
	});

	it("should not execute command when not found", () => {
		const mockRef = createMockFlipBookRef();
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		render(
			<CommandProvider flipBookRef={mockRef} currentPage={0} totalPages={10} direction="ltr">
				<TestCommandConsumer commandId="nonexistent" />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(consoleSpy).toHaveBeenCalledWith('Command "nonexistent" not found');
		consoleSpy.mockRestore();
	});
});

describe("Hotkey handling", () => {
	it("should execute flipNext on ArrowRight", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={2} totalPages={10} direction="ltr">
				<div>Content</div>
			</CommandProvider>,
		);

		fireEvent.keyDown(document, { key: "ArrowRight" });
		expect(mockRef.current.flipNext).toHaveBeenCalled();
	});

	it("should execute flipPrev on ArrowLeft", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={2} totalPages={10} direction="ltr">
				<div>Content</div>
			</CommandProvider>,
		);

		fireEvent.keyDown(document, { key: "ArrowLeft" });
		expect(mockRef.current.flipPrev).toHaveBeenCalled();
	});

	it("should execute goToFirst on Home", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={2} totalPages={10} direction="ltr">
				<div>Content</div>
			</CommandProvider>,
		);

		fireEvent.keyDown(document, { key: "Home" });
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(0);
	});

	it("should execute goToLast on End", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={2} totalPages={10} direction="ltr">
				<div>Content</div>
			</CommandProvider>,
		);

		fireEvent.keyDown(document, { key: "End" });
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(9);
	});

	it("should not execute hotkeys when disableHotkeys is true", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider
				flipBookRef={mockRef}
				currentPage={2}
				totalPages={10}
				direction="ltr"
				disableHotkeys
			>
				<div>Content</div>
			</CommandProvider>,
		);

		fireEvent.keyDown(document, { key: "ArrowRight" });
		expect(mockRef.current.flipNext).not.toHaveBeenCalled();
	});

	it("should not execute hotkeys when typing in input", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={2} totalPages={10} direction="ltr">
				<input type="text" data-testid="test-input" />
			</CommandProvider>,
		);

		const input = screen.getByTestId("test-input");
		fireEvent.keyDown(input, { key: "ArrowRight" });
		expect(mockRef.current.flipNext).not.toHaveBeenCalled();
	});
});
