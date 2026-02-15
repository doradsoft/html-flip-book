import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CommandDefinition } from "../commands";
import {
	CommandProvider,
	defaultCommands,
	flipNextCommand,
	flipPrevCommand,
	goToFirstCommand,
	goToLastCommand,
	goToTocCommand,
	useCommands,
} from "../commands";
import type { FlipBookHandle } from "../FlipBook";

// Mock flipbook ref
const createMockFlipBookRef = (overrides: Partial<FlipBookHandle> = {}) => ({
	current: {
		flipNext: vi.fn().mockResolvedValue(undefined),
		flipPrev: vi.fn().mockResolvedValue(undefined),
		flipToPage: vi.fn().mockResolvedValue(undefined),
		jumpToPage: vi.fn(),
		toggleDebugBar: vi.fn(),
		getCurrentPageIndex: vi.fn().mockReturnValue(2),
		getTotalPages: vi.fn().mockReturnValue(10),
		getOf: vi.fn().mockReturnValue(10),
		isFirstPage: vi.fn().mockReturnValue(false),
		isLastPage: vi.fn().mockReturnValue(false),
		getDownloadConfig: vi.fn().mockReturnValue(undefined),
		getTocPageIndex: vi.fn().mockReturnValue(4),
		...overrides,
	} as FlipBookHandle,
});

// Test component that uses the commands hook with a command object
const TestCommandConsumer: React.FC<{
	command: CommandDefinition;
	onResult?: (canExecute: boolean) => void;
}> = ({ command, onResult }) => {
	const { execute, canExecute } = useCommands();
	const canExec = canExecute(command);

	if (onResult) {
		onResult(canExec);
	}

	return (
		<div>
			<button type="button" onClick={() => execute(command)} data-testid="exec-btn">
				Execute {command.name ?? command.enName}
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
		expect(commandIds).toContain("download");
	});
});

describe("Default Hotkeys (1:1 with command)", () => {
	it("should have hotkeys for navigation commands", () => {
		expect(flipNextCommand.hotkeys).toBeDefined();
		expect(flipPrevCommand.hotkeys).toBeDefined();
		expect(goToFirstCommand.hotkeys).toBeDefined();
		expect(goToLastCommand.hotkeys).toBeDefined();
	});

	it("should include arrow keys for navigation", () => {
		const flipNextKeys = flipNextCommand.hotkeys?.map((h) => h.key) ?? [];
		const flipPrevKeys = flipPrevCommand.hotkeys?.map((h) => h.key) ?? [];
		expect(flipNextKeys).toContain("ArrowRight");
		expect(flipPrevKeys).toContain("ArrowLeft");
	});
});

describe("CommandProvider", () => {
	it("should execute flipNext command", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={2} totalPages={10} direction="ltr">
				<TestCommandConsumer command={flipNextCommand} />
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
					command={flipNextCommand}
					onResult={(r) => {
						result = r;
					}}
				/>
			</CommandProvider>,
		);

		expect(result).toBe(true);
	});

	it("should indicate canExecute=false when at last page for flipNext", () => {
		const mockRef = createMockFlipBookRef({
			getCurrentPageIndex: vi.fn().mockReturnValue(9),
			getTotalPages: vi.fn().mockReturnValue(10),
			getOf: vi.fn().mockReturnValue(10),
			isFirstPage: vi.fn().mockReturnValue(false),
			isLastPage: vi.fn().mockReturnValue(true),
		});
		let result = true;
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={9} totalPages={10} direction="ltr">
				<TestCommandConsumer
					command={flipNextCommand}
					onResult={(r) => {
						result = r;
					}}
				/>
			</CommandProvider>,
		);

		expect(result).toBe(false);
	});

	it("should indicate canExecute=false when at first page for flipPrev", () => {
		const mockRef = createMockFlipBookRef({
			getCurrentPageIndex: vi.fn().mockReturnValue(0),
			getTotalPages: vi.fn().mockReturnValue(10),
			getOf: vi.fn().mockReturnValue(10),
			isFirstPage: vi.fn().mockReturnValue(true),
			isLastPage: vi.fn().mockReturnValue(false),
		});
		let result = true;
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={0} totalPages={10} direction="ltr">
				<TestCommandConsumer
					command={flipPrevCommand}
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
				<TestCommandConsumer command={goToFirstCommand} />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(0);
	});

	it("should execute goToLast command", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={5} totalPages={10} direction="ltr">
				<TestCommandConsumer command={goToLastCommand} />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(9);
	});

	it("should execute goToFirst in RTL (same as LTR — always page 0)", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={5} totalPages={10} direction="rtl">
				<TestCommandConsumer command={goToFirstCommand} />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(0);
	});

	it("should execute goToLast in RTL (same as LTR — always last page index)", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={5} totalPages={10} direction="rtl">
				<TestCommandConsumer command={goToLastCommand} />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(9);
	});

	it("should execute goToToc command with default index 4", () => {
		const mockRef = createMockFlipBookRef();
		render(
			<CommandProvider flipBookRef={mockRef} currentPage={5} totalPages={10} direction="ltr">
				<TestCommandConsumer command={goToTocCommand} />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(mockRef.current.jumpToPage).toHaveBeenCalledWith(4);
	});

	it("should support custom commands", () => {
		const mockRef = createMockFlipBookRef();
		const customAction = vi.fn();
		const customCommand: CommandDefinition = {
			id: "customCmd",
			enName: "Custom Command",
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
				<TestCommandConsumer command={customCommand} />
			</CommandProvider>,
		);

		fireEvent.click(screen.getByTestId("exec-btn"));
		expect(customAction).toHaveBeenCalled();
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
