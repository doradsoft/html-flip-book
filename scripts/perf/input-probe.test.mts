import { describe, expect, it } from "vitest";
import { inputProbePath } from "./input-probe.mts";

describe("input probe sheet coordinates", () => {
	const page = { x: 240, y: 100, width: 320, height: 480 };
	const clip = { x: 200, y: 80, width: 400, height: 520 };
	it("drags inward from the LTR sheet edge instead of a bookmark rail", () => {
		expect(inputProbePath(page, clip, "ltr")).toEqual({
			start: { x: 550, y: 340 },
			lift: { x: 535, y: 340 },
			end: { x: 80, y: 340 },
		});
	});
	it("drags inward from the RTL sheet's left edge", () => {
		expect(inputProbePath(page, clip, "rtl")).toEqual({
			start: { x: 250, y: 340 },
			lift: { x: 265, y: 340 },
			end: { x: 720, y: 340 },
		});
	});
	it("clamps the LTR origin to the painted edge when the sheet overhangs the host", () => {
		// Pages are positioned with a negative left offset: their box can extend
		// past the overflow:hidden host, where only BODY answers elementFromPoint.
		const overhung = { x: 328, y: 84, width: 400, height: 267 };
		const host = { x: 8, y: 8, width: 640, height: 420 };
		expect(inputProbePath(overhung, host, "ltr").start).toEqual({ x: 638, y: 217.5 });
	});
	it("clamps the RTL origin to the painted edge when the sheet overhangs the host", () => {
		const overhung = { x: -72, y: 84, width: 400, height: 267 };
		const host = { x: 8, y: 8, width: 640, height: 420 };
		expect(inputProbePath(overhung, host, "rtl").start).toEqual({ x: 18, y: 217.5 });
	});
	it.each([
		{ ...page, height: 0 },
		{ ...page, width: 0 },
		{ ...page, width: 25 },
		{ ...page, x: Number.NaN },
	])("rejects a non-rendered or unusable sheet: %j", (bounds) => {
		expect(() => inputProbePath(bounds, clip, "ltr")).toThrow(/visible page/);
	});
	it("rejects a clip that leaves no painted strip", () => {
		const narrowClip = { x: 240, y: 0, width: 20, height: 600 };
		expect(() => inputProbePath(page, narrowClip, "ltr")).toThrow(/visible page/);
	});
});
