import { describe, expect, it } from "vitest";
import {
	calendarMonths,
	calendarSemantics,
	civilDateId,
	gregorianRangeLabel,
	monthPageIndex,
	shortYear,
} from "./calendar-model";
import { buildHebrewMonthPage, daysInMonth, hebrew2abs } from "./hebrewCalendar";

describe("calendar sheet sequence", () => {
	it("assigns one month to each front with an unnamed reverse, including both Adars and the year boundary", () => {
		expect(calendarMonths).toHaveLength(25);
		expect(calendarMonths.slice(5, 7).map((month) => month.name.en)).toEqual(["Adar I", "Adar II"]);
		expect(calendarMonths[12]).toMatchObject({ year: 5787, month: 6 });
		expect(calendarMonths[13]).toMatchObject({ year: 5788, month: 7 });
		calendarMonths.forEach((month, index) => {
			const front = monthPageIndex(index);
			const name = calendarSemantics.indexToSemanticName(front);
			expect(name).toMatch(/\D \d{2}$/);
			expect(calendarSemantics.semanticNameToIndex(name)).toBe(front);
			expect(calendarSemantics.indexToSemanticName(front - 1)).toBe("");
			if (index > 0) {
				const previous = calendarMonths[index - 1];
				expect(hebrew2abs(month.year, month.month, 1)).toBe(
					hebrew2abs(previous.year, previous.month, daysInMonth(previous.month, previous.year)) + 1,
				);
			}
		});
	});

	it("uses named Gregorian ranges with both years at the civil boundary", () => {
		expect(gregorianRangeLabel(buildHebrewMonthPage(5787, 10))).toBe("December 26 – January 27");
		expect(gregorianRangeLabel(buildHebrewMonthPage(5787, 8))).toBe("October–November 26");
		expect(shortYear(5800)).toBe("00");
		expect(shortYear(2007)).toBe("07");
		expect(civilDateId(new Date(2026, 10, 13))).toBe("2026-11-13");
	});

	it("matches the built-in Hebrew calendar for every demo day", () => {
		const hebrew = new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric", year: "numeric" });
		for (const { year, month } of calendarMonths) {
			const sheet = buildHebrewMonthPage(year, month);
			for (const day of sheet.days) {
				if (!day) continue;
				const parts = hebrew.formatToParts(day.gregorian);
				expect(Number(parts.find((part) => part.type === "day")?.value)).toBe(day.hebrewDay);
				expect(Number(parts.find((part) => part.type === "year")?.value)).toBe(year);
			}
		}
	});
});
