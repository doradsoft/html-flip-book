import { describe, expect, it } from "vitest";
import { FlipDirection } from "../flip-direction";

describe("FlipDirection", () => {
	it("should have Forward direction", () => {
		expect(FlipDirection.Forward).toBe("Forward");
	});

	it("should have Backward direction", () => {
		expect(FlipDirection.Backward).toBe("Backward");
	});

	it("should have None direction", () => {
		expect(FlipDirection.None).toBe("None");
	});

	it("should have exactly 3 directions", () => {
		const directions = Object.values(FlipDirection);
		expect(directions).toHaveLength(3);
		expect(directions).toContain("Forward");
		expect(directions).toContain("Backward");
		expect(directions).toContain("None");
	});
});
