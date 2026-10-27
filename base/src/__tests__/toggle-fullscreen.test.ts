import { afterEach, describe, expect, it, vi } from "vitest";
import { canUseFullscreen, getFullscreenElement } from "../commands/fullscreen-utils";
import { toggleFullscreenCommand } from "../commands/toggle-fullscreen-command";
import type { CommandContext } from "../commands/types";

const doc = document as Document & {
	fullscreenEnabled?: boolean;
	fullscreenElement?: Element | null;
	exitFullscreen?: () => Promise<void>;
	webkitFullscreenEnabled?: boolean;
	webkitFullscreenElement?: Element | null;
	webkitExitFullscreen?: () => void;
};
type TestElement = HTMLElement & { webkitRequestFullscreen?: () => void };

function stubStandard() {
	const request = vi.fn().mockResolvedValue(undefined);
	const exit = vi.fn().mockResolvedValue(undefined);
	(HTMLElement.prototype as TestElement).requestFullscreen = request;
	doc.exitFullscreen = exit;
	doc.fullscreenEnabled = true;
	return { request, exit };
}

function stubWebkit() {
	const request = vi.fn();
	const exit = vi.fn();
	(HTMLElement.prototype as TestElement).webkitRequestFullscreen = request;
	doc.webkitFullscreenEnabled = true;
	doc.webkitExitFullscreen = exit;
	return { request, exit };
}

function cleanupDom() {
	delete (HTMLElement.prototype as TestElement).requestFullscreen;
	delete (HTMLElement.prototype as TestElement).webkitRequestFullscreen;
	delete doc.exitFullscreen;
	delete doc.webkitExitFullscreen;
	delete doc.fullscreenEnabled;
	delete doc.webkitFullscreenEnabled;
	delete doc.fullscreenElement;
	delete doc.webkitFullscreenElement;
}

afterEach(cleanupDom);

const ctx = (target?: HTMLElement | null): CommandContext => ({
	handle: null,
	data: { getFullscreenTarget: () => target ?? null },
});

describe("canUseFullscreen", () => {
	it("is false when no fullscreen API exists", () => {
		expect(canUseFullscreen()).toBe(false);
		expect(toggleFullscreenCommand.canExecute?.(ctx())).toBe(false);
	});

	it("is true when the standard API exists and is enabled", () => {
		stubStandard();
		expect(canUseFullscreen()).toBe(true);
	});

	it("is false when the document disables fullscreen despite the API", () => {
		stubStandard();
		doc.fullscreenEnabled = false;
		expect(canUseFullscreen()).toBe(false);
		expect(toggleFullscreenCommand.canExecute?.(ctx())).toBe(false);
	});

	it("is true via webkit-prefixed APIs", () => {
		stubWebkit();
		expect(canUseFullscreen()).toBe(true);
	});

	it("is false when the webkit flag disables it", () => {
		stubWebkit();
		doc.webkitFullscreenEnabled = false;
		expect(canUseFullscreen()).toBe(false);
	});

	it("is false without a DOM (SSR)", () => {
		vi.stubGlobal("document", undefined);
		expect(canUseFullscreen()).toBe(false);
		expect(getFullscreenElement()).toBeNull();
		vi.unstubAllGlobals();
	});
});

describe("getFullscreenElement", () => {
	it("reads the standard element, then the webkit fallback", () => {
		const el = document.createElement("div");
		doc.webkitFullscreenElement = el;
		expect(getFullscreenElement()).toBe(el);
		doc.fullscreenElement = document.createElement("div");
		expect(getFullscreenElement()).toBe(doc.fullscreenElement);
	});
});

describe("toggleFullscreenCommand", () => {
	it("is a toggle command bound to F11", () => {
		expect(toggleFullscreenCommand.kind).toBe("toggle");
		expect(toggleFullscreenCommand.hotkeys).toEqual([{ key: "F11" }]);
	});

	it("isActive reflects the current fullscreen element", () => {
		expect(toggleFullscreenCommand.isActive(ctx())).toBe(false);
		doc.fullscreenElement = document.createElement("div");
		expect(toggleFullscreenCommand.isActive(ctx())).toBe(true);
	});

	it("requests fullscreen on the command's target", () => {
		const { request } = stubStandard();
		const target = document.createElement("div");
		toggleFullscreenCommand.execute(ctx(target));
		expect(request).toHaveBeenCalledTimes(1);
		expect(request.mock.contexts[0]).toBe(target);
	});

	it("falls back to documentElement without a target", () => {
		const { request } = stubStandard();
		toggleFullscreenCommand.execute({ handle: null });
		expect(request.mock.contexts[0]).toBe(document.documentElement);
	});

	it("uses the webkit request when the standard one is missing", () => {
		const { request } = stubWebkit();
		const target = document.createElement("div");
		toggleFullscreenCommand.execute(ctx(target));
		expect(request).toHaveBeenCalledTimes(1);
		expect(request.mock.contexts[0]).toBe(target);
	});

	it("exits fullscreen when active", () => {
		const { exit } = stubStandard();
		doc.fullscreenElement = document.createElement("div");
		toggleFullscreenCommand.execute({ handle: null });
		expect(exit).toHaveBeenCalledTimes(1);
	});

	it("uses the webkit exit when the standard one is missing", () => {
		const { exit } = stubWebkit();
		doc.webkitFullscreenElement = document.createElement("div");
		toggleFullscreenCommand.execute({ handle: null });
		expect(exit).toHaveBeenCalledTimes(1);
	});

	it("setActive rejects entering fullscreen when unsupported", () => {
		expect(toggleFullscreenCommand.setActive(ctx(), true)).toBe(false);
	});

	it("setActive is a no-op success for the state that already holds", () => {
		stubStandard();
		expect(toggleFullscreenCommand.setActive(ctx(), false)).not.toBe(false);
		doc.fullscreenElement = document.createElement("div");
		expect(toggleFullscreenCommand.setActive(ctx(), true)).not.toBe(false);
	});
});
