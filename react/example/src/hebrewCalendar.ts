// Calendar conversion is provided by the host's Intl/ICU Hebrew calendar.
// This module indexes its civil days and supplies the demo's presentation data;
// it does not vendor a third-party calendar algorithm or contact a date service.

export const HEBREW_MONTH = {
	NISAN: 1,
	IYYAR: 2,
	SIVAN: 3,
	TAMUZ: 4,
	AV: 5,
	ELUL: 6,
	TISHREI: 7,
	CHESHVAN: 8,
	KISLEV: 9,
	TEVET: 10,
	SHVAT: 11,
	ADAR_I: 12,
	ADAR_II: 13,
} as const;

const names: Record<number, { he: string; en: string }> = {
	1: { he: "ניסן", en: "Nisan" },
	2: { he: "אייר", en: "Iyar" },
	3: { he: "סיון", en: "Sivan" },
	4: { he: "תמוז", en: "Tamuz" },
	5: { he: "אב", en: "Av" },
	6: { he: "אלול", en: "Elul" },
	7: { he: "תשרי", en: "Tishrei" },
	8: { he: "חשון", en: "Cheshvan" },
	9: { he: "כסלו", en: "Kislev" },
	10: { he: "טבת", en: "Tevet" },
	11: { he: "שבט", en: "Shvat" },
	12: { he: "אדר", en: "Adar" },
	13: { he: "אדר ב׳", en: "Adar II" },
};

const DAY_MS = 86_400_000;
// Gregorian 1970-01-01 is civil day 719163 when 0001-01-01 is day 1.
const UNIX_CIVIL_DAY = 719163;
const hebrewFormatter = new Intl.DateTimeFormat("en-u-ca-hebrew-nu-latn", {
	timeZone: "UTC",
	year: "numeric",
	month: "long",
	day: "numeric",
});

function utcDate(year: number, month: number, day: number): Date {
	const date = new Date(0);
	date.setUTCFullYear(year, month, day);
	return date;
}

function nativeDate(timestamp: number) {
	const parts = hebrewFormatter.formatToParts(new Date(timestamp));
	return {
		year: Number(parts.find((part) => part.type === "year")?.value),
		day: Number(parts.find((part) => part.type === "day")?.value),
		month: parts.find((part) => part.type === "month")?.value ?? "",
	};
}

interface NativeMonth {
	number: number;
	name: string;
	first: number;
	days: number;
}
const years = new Map<number, readonly NativeMonth[]>();

/** Discover actual month boundaries from Intl, including leap-month insertion. */
function discoverNativeMonths(year: number): NativeMonth[] {
	const months: NativeMonth[] = [];
	// Two Gregorian years cover the requested autumn-to-autumn Hebrew year.
	const start = utcDate(year - 3761, 0, 1).getTime();
	const end = utcDate(year - 3759, 0, 1).getTime();
	for (let timestamp = start; timestamp < end; timestamp += DAY_MS) {
		const current = nativeDate(timestamp);
		if (current.year !== year) continue;
		if (current.day === 1)
			months.push({
				number: 0,
				name: current.month,
				first: timestamp / DAY_MS + UNIX_CIVIL_DAY,
				days: 0,
			});
		const month = months.at(-1);
		if (month) month.days++;
	}
	return months;
}

function nativeYear(year: number): readonly NativeMonth[] {
	if (!Number.isInteger(year) || year < 1) throw new RangeError("Invalid Hebrew year");
	const cached = years.get(year);
	if (cached) return cached;
	if (hebrewFormatter.resolvedOptions().calendar !== "hebrew") {
		throw new Error("This calendar demo requires Intl Hebrew-calendar support");
	}
	const months = discoverNativeMonths(year);
	if (months.length !== 12 && months.length !== 13)
		throw new RangeError("Hebrew year outside the supported Intl range");
	const order = [7, 8, 9, 10, 11, 12, ...(months.length === 13 ? [13] : []), 1, 2, 3, 4, 5, 6];
	months.forEach((month, index) => {
		month.number = order[index];
	});
	years.set(year, months);
	return months;
}

function nativeMonth(year: number, month: number): NativeMonth {
	const found = nativeYear(year).find((record) => record.number === month);
	if (!found) throw new RangeError("Month does not exist in this Hebrew year");
	return found;
}

export const tishreiFirstMonths = (year: number): readonly number[] =>
	nativeYear(year).map((month) => month.number);
export const monthsInYear = (year: number): number => nativeYear(year).length;
export const isLeapYear = (year: number): boolean => monthsInYear(year) === 13;
export const daysInMonth = (month: number, year: number): number => nativeMonth(year, month).days;
export const daysInYear = (year: number): number =>
	nativeYear(year).reduce((total, month) => total + month.days, 0);
export const longCheshvan = (year: number): boolean => daysInMonth(8, year) === 30;
export const shortKislev = (year: number): boolean => daysInMonth(9, year) === 29;

export function monthDisplayName(month: number, year: number): { he: string; en: string } {
	nativeMonth(year, month);
	if (month === HEBREW_MONTH.ADAR_I && isLeapYear(year)) return { he: "אדר א׳", en: "Adar I" };
	return names[month];
}

export function hebrew2abs(year: number, month: number, day: number): number {
	const record = nativeMonth(year, month);
	if (!Number.isInteger(day) || day < 1 || day > record.days)
		throw new RangeError("Invalid Hebrew day");
	return record.first + day - 1;
}

export function abs2hebrew(abs: number): { yy: number; mm: number; dd: number } {
	const parts = nativeDate((Math.trunc(abs) - UNIX_CIVIL_DAY) * DAY_MS);
	const month = nativeYear(parts.year).find((record) => record.name === parts.month);
	if (!month) throw new RangeError("Date outside the supported Hebrew calendar range");
	return { yy: parts.year, mm: month.number, dd: parts.day };
}

/** Local civil dates are converted through UTC fields, never elapsed local hours. */
export const greg2abs = (date: Date): number =>
	utcDate(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / DAY_MS + UNIX_CIVIL_DAY;

export function abs2greg(abs: number): Date {
	const utc = new Date((Math.trunc(abs) - UNIX_CIVIL_DAY) * DAY_MS);
	const local = new Date(0);
	local.setFullYear(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
	local.setHours(0, 0, 0, 0);
	return local;
}

export const daysInGregMonth = (month: number, year: number): number =>
	utcDate(year, month, 0).getUTCDate();
export const hebrewYearShort = (year: number): number => year % 100;

export interface HebrewDay {
	hebrewDay: number;
	gregorian: Date;
	hey: number;
	hem: number;
	hed: number;
}

export interface HebrewMonthPage {
	hebrewYear: number;
	month: number;
	monthNameHe: string;
	monthNameEn: string;
	days: (HebrewDay | null)[];
	leadingBlanks: number;
}

export function buildHebrewMonthPage(year: number, month: number): HebrewMonthPage {
	const record = nativeMonth(year, month);
	const name = monthDisplayName(month, year);
	const leadingBlanks = abs2greg(record.first).getDay();
	const days: (HebrewDay | null)[] = Array.from({ length: leadingBlanks }, () => null);
	for (let day = 1; day <= record.days; day++) {
		days.push({
			hebrewDay: day,
			gregorian: abs2greg(record.first + day - 1),
			hey: year,
			hem: month,
			hed: day,
		});
	}
	return {
		hebrewYear: year,
		month,
		monthNameHe: name.he,
		monthNameEn: name.en,
		days,
		leadingBlanks,
	};
}

/** Selected fixed-date festival captions used only by the demo. */
export function holidayLabel(month: number, day: number): string | null {
	if (month === HEBREW_MONTH.TISHREI) {
		if (day === 1 || day === 2) return "ראש השנה";
		if (day === 10) return "יום כיפור";
		if (day >= 15 && day <= 21) return "סוכות";
		if (day === 22) return "שמיני עצרת";
	}
	if (month === HEBREW_MONTH.NISAN && day >= 15 && day <= 21) return "פסח";
	if (month === HEBREW_MONTH.SIVAN && (day === 6 || day === 7)) return "שבועות";
	return null;
}
