import { describe, expect, it } from "vitest";
import { inputProbePath } from "./input-probe.mts";

describe("input probe sheet coordinates", () => {
	const page = { x: 240, y: 100, width: 320, height: 480 };
	it("drags inward from the LTR sheet edge instead of a bookmark rail", () => {
		expect(inputProbePath(page, "ltr")).toEqual({
			start: { x: 550, y: 340 },
			lift: { x: 535, y: 340 },
			end: { x: 80, y: 340 },
		});
	});
	it("drags inward from the RTL sheet's left edge", () => {
		expect(inputProbePath(page, "rtl")).toEqual({
			start: { x: 250, y: 340 },
			lift: { x: 265, y: 340 },
			end: { x: 720, y: 340 },
		});
	});
	it.each([
		{ ...page, height: 0 },
		{ ...page, width: 0 },
		{ ...page, width: 25 },
		{ ...page, x: Number.NaN },
	])("rejects a non-rendered or unusable sheet: %j", (bounds) => {
		expect(() => inputProbePath(bounds, "ltr")).toThrow(/visible page/);
	});
});
