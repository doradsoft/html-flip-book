import {
	abs2greg,
	type HebrewMonthPage,
	hebrew2abs,
	monthDisplayName,
	tishreiFirstMonths,
} from "./hebrewCalendar";

export const calendarMonths = [5787, 5788].flatMap((year) =>
	tishreiFirstMonths(year).map((month) => ({ year, month, name: monthDisplayName(month, year) })),
);

export const shortYear = (year: number) => String(year % 100).padStart(2, "0");
export const monthPageIndex = (index: number) => (index + 1) * 2;
export const monthLabel = (index: number) => {
	const month = calendarMonths[index];
	return `${month.name.he} ${shortYear(month.year)}`;
};

/** Stable local civil date; UTC serialization would shift dates in Jerusalem. */
export const civilDateId = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const gregorianMonth = new Intl.DateTimeFormat("en", { month: "long" });
export function gregorianRangeLabel(page: HebrewMonthPage): string {
	const first = abs2greg(hebrew2abs(page.hebrewYear, page.month, 1));
	const last = abs2greg(hebrew2abs(page.hebrewYear, page.month, page.days.filter(Boolean).length));
	const startMonth = gregorianMonth.format(first);
	const endMonth = gregorianMonth.format(last);
	if (first.getFullYear() !== last.getFullYear()) {
		return `${startMonth} ${shortYear(first.getFullYear())} – ${endMonth} ${shortYear(last.getFullYear())}`;
	}
	return `${startMonth === endMonth ? startMonth : `${startMonth}–${endMonth}`} ${shortYear(first.getFullYear())}`;
}

// Blank reverse faces have no indicator name; the following front supplies the month.
export const calendarSemantics = {
	indexToSemanticName: (index: number) => {
		if (index === 0) return "כריכה";
		if (index === calendarMonths.length * 2 + 1) return "סיום";
		const month = index / 2 - 1;
		return index % 2 === 0 && month < calendarMonths.length ? monthLabel(month) : "";
	},
	semanticNameToIndex: (name: string) => {
		const index = calendarMonths.findIndex((_, index) => monthLabel(index) === name);
		return index < 0 ? null : monthPageIndex(index);
	},
	indexToTitle: (index: number) => {
		const month = calendarMonths[index / 2 - 1];
		return month ? `${month.name.en} ${month.year}` : "";
	},
};
