import { describe, expect, it } from "vitest";
import {
	abs2greg,
	abs2hebrew,
	buildHebrewMonthPage,
	daysInMonth,
	greg2abs,
	HEBREW_MONTH,
	hebrew2abs,
	isLeapYear,
	monthDisplayName,
	tishreiFirstMonths,
} from "./hebrewCalendar";

describe("hebrewCalendar", () => {
	it("matches the @hebcal/hdate reference value for 15 Cheshvan 5769", () => {
		// Documented example from @hebcal/hdate: hebrew2abs(5769, CHESHVAN, 15) === 733359
		expect(hebrew2abs(5769, HEBREW_MONTH.CHESHVAN, 15)).toBe(733359);
		expect(abs2greg(733359)).toEqual(new Date(2008, 10, 13)); // 13 Nov 2008
	});

	it("converts known modern dates", () => {
		// 1 Tishrei 5785 = 3 Oct 2024 (Rosh Hashanah 5785)
		expect(abs2greg(hebrew2abs(5785, HEBREW_MONTH.TISHREI, 1))).toEqual(new Date(2024, 9, 3));
		// 1 Tishrei 5784 = 16 Sep 2023 (Rosh Hashanah 5784)
		expect(abs2greg(hebrew2abs(5784, HEBREW_MONTH.TISHREI, 1))).toEqual(new Date(2023, 8, 16));
		// 15 Nisan 5784 = 23 Apr 2024 (Pesach)
		expect(abs2greg(hebrew2abs(5784, HEBREW_MONTH.NISAN, 15))).toEqual(new Date(2024, 3, 23));
		// 1 Nisan 5784 = 9 Apr 2024
		expect(abs2greg(hebrew2abs(5784, HEBREW_MONTH.NISAN, 1))).toEqual(new Date(2024, 3, 9));
	});

	it("round-trips hebrew<->gregorian for a range of dates", () => {
		const start = greg2abs(new Date(5780, 0, 1));
		for (let i = 0; i < 4000; i += 37) {
			const abs = start + i;
			const h = abs2hebrew(abs);
			expect(hebrew2abs(h.yy, h.mm, h.dd)).toBe(abs);
		}
	});

	it("detects leap years", () => {
		expect(isLeapYear(5784)).toBe(true);
		expect(isLeapYear(5782)).toBe(true);
		expect(isLeapYear(5783)).toBe(false);
		expect(isLeapYear(5785)).toBe(false);
		expect(isLeapYear(5781)).toBe(false);
	});

	it("orders months Tishrei-first with Adar I/II in leap years", () => {
		expect(tishreiFirstMonths(5783)).toEqual([7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]);
		expect(tishreiFirstMonths(5784)).toEqual([7, 8, 9, 10, 11, 12, 13, 1, 2, 3, 4, 5, 6]);
	});

	it("names Adar correctly in common vs leap years", () => {
		expect(monthDisplayName(HEBREW_MONTH.ADAR_I, 5783).en).toBe("Adar");
		expect(monthDisplayName(HEBREW_MONTH.ADAR_I, 5784).en).toBe("Adar I");
		expect(monthDisplayName(HEBREW_MONTH.ADAR_II, 5784).en).toBe("Adar II");
	});

	it("builds a month grid with correct day count and Sunday-first offset", () => {
		const page = buildHebrewMonthPage(5785, HEBREW_MONTH.TISHREI);
		expect(page.days.filter(Boolean)).toHaveLength(daysInMonth(HEBREW_MONTH.TISHREI, 5785));
		// Tishrei 1 5785 = Thursday Oct 3 2024 -> getDay()=4 leading blanks
		expect(page.leadingBlanks).toBe(4);
		const first = page.days.find(Boolean);
		expect(first?.hebrewDay).toBe(1);
		expect(first?.gregorian).toEqual(new Date(2024, 9, 3));
	});

	it("grid cells carry both Hebrew and Gregorian dates", () => {
		const page = buildHebrewMonthPage(5784, HEBREW_MONTH.NISAN);
		const pesach = page.days.find((d) => d?.hebrewDay === 15);
		expect(pesach?.gregorian).toEqual(new Date(2024, 3, 23));
	});
});
