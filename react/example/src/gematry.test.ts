import { describe, expect, it } from "vitest";
import { toLetters, toNumber } from "./gematry";

describe("gematry", () => {
	describe("toLetters", () => {
		it("converts numbers to Hebrew letters", () => {
			expect(toLetters(929, { addQuotes: true })).toBe('תתקכ"ט');
			expect(toLetters(3)).toBe("ג");
			expect(toLetters(12, { addQuotes: true })).toBe('י"ב');
		});

		it("masks Hashem spellings for 15 and 16", () => {
			expect(toLetters(15)).toBe("טו");
			expect(toLetters(16)).toBe("טז");
			expect(toLetters(15, { maskHashem: false })).toBe("יה");
		});
	});

	describe("toNumber", () => {
		it("sums letter values and ignores non-letters", () => {
			expect(toNumber("תתקכט")).toBe(929);
			expect(toNumber('כ"ב')).toBe(22);
			expect(toNumber('פרק כ"ב')).toBe(402); // every Hebrew letter counts
			expect(toNumber("")).toBe(0);
		});
	});
});
