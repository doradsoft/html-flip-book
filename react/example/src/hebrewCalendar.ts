// hebrewCalendar.ts — Hebrew calendar arithmetic for the vertical calendar demo.
//
// Ported (simplified) from @hebcal/hdate (MIT License, github.com/hebcal/hdate-js).
// Implements the fixed/arithmetic Hebrew calendar (Hillel II): molad-based
// year lengths, the four Rosh Hashanah postponement rules, and conversion
// to/from proleptic Gregorian via Rata Die (R.D.) day numbers.
//
// Month numbering follows @hebcal/hdate: NISAN=1 .. ELUL=6, TISHREI=7 ..
// ADAR_II=13 (Nisan-based ecclesiastical order). Display code reorders to
// Tishrei-first civil order via TISHREI_FIRST.

/** Hebrew months numbered from Nisan (1) through Adar II (13). */
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

/** Hebrew month names in Hebrew script, Nisan-based (1-13). */
export const HEBREW_MONTH_HE: readonly string[] = [
	"",
	"ניסן",
	"אייר",
	"סיון",
	"תמוז",
	"אב",
	"אלול",
	"תשרי",
	"חשון",
	"כסלו",
	"טבת",
	"שבט",
	"אדר",
	"אדר ב׳",
];

/** Hebrew month names transliterated, Nisan-based (1-13). */
export const HEBREW_MONTH_EN: readonly string[] = [
	"",
	"Nisan",
	"Iyar",
	"Sivan",
	"Tamuz",
	"Av",
	"Elul",
	"Tishrei",
	"Cheshvan",
	"Kislev",
	"Tevet",
	"Shvat",
	"Adar",
	"Adar II",
];

/** Months of the civil (Tishrei-first) year, Nisan-based month numbers. */
const TISHREI_FIRST_COMMON = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6] as const;
const TISHREI_FIRST_LEAP = [7, 8, 9, 10, 11, 12, 13, 1, 2, 3, 4, 5, 6] as const;

/** Ordered list of months for a Hebrew civil year starting at Tishrei. */
export function tishreiFirstMonths(year: number): readonly number[] {
	return isLeapYear(year) ? TISHREI_FIRST_LEAP : TISHREI_FIRST_COMMON;
}

/** Hebrew month name for display: Adar in common years, Adar I/II in leap years. */
export function monthDisplayName(month: number, year: number): { he: string; en: string } {
	if (month === HEBREW_MONTH.ADAR_I && !isLeapYear(year)) {
		return { he: "אדר", en: "Adar" };
	}
	if (month === HEBREW_MONTH.ADAR_I && isLeapYear(year)) {
		return { he: "אדר א׳", en: "Adar I" };
	}
	return { he: HEBREW_MONTH_HE[month], en: HEBREW_MONTH_EN[month] };
}

export function isLeapYear(year: number): boolean {
	return (1 + year * 7) % 19 < 7;
}

export function monthsInYear(year: number): number {
	return 12 + Number(isLeapYear(year));
}

// Rata Die epoch offsets (days since imaginary Monday 1 Jan 1, proleptic Gregorian).
const HEBREW_EPOCH = -1373428;
const AVG_HEBYEAR_DAYS = 365.24682220597794;

// Static day counts indexed by Nisan-based month number (0 unused). 0 marks
// months whose length depends on the year (Cheshvan, Kislev, Adar I).
const STATIC_DAYS_IN_MONTH: readonly number[] = [
	0, 30, 29, 30, 29, 30, 29, 30, 0, 0, 29, 30, 0, 29,
];

function quotient(x: number, y: number): number {
	return Math.floor(x / y);
}

function mod(x: number, y: number): number {
	return x - y * Math.floor(x / y);
}

function isGregLeapYear(year: number): boolean {
	return !(year % 4) && (!!(year % 100) || !(year % 400));
}

/** Days elapsed since epoch to Rosh Hashanah (1 Tishrei) of Hebrew `year`. */
function elapsedDays0(year: number): number {
	const prevYear = year - 1;
	const mElapsed =
		235 * Math.floor(prevYear / 19) + // complete 19-year cycles
		12 * (prevYear % 19) + // regular months this cycle
		Math.floor(((prevYear % 19) * 7 + 1) / 19); // leap months this cycle

	const pElapsed = 204 + 793 * (mElapsed % 1080);

	const hElapsed =
		5 + 12 * mElapsed + 793 * Math.floor(mElapsed / 1080) + Math.floor(pElapsed / 1080);

	const parts = (pElapsed % 1080) + 1080 * (hElapsed % 24);

	const day = 1 + 29 * mElapsed + Math.floor(hElapsed / 24);
	let altDay = day;

	// The four postponement rules (dechiyot).
	if (
		parts >= 19440 ||
		(day % 7 === 2 && parts >= 9924 && !isLeapYear(year)) ||
		(day % 7 === 1 && parts >= 16789 && isLeapYear(prevYear))
	) {
		altDay++;
	}

	if (altDay % 7 === 0 || altDay % 7 === 3 || altDay % 7 === 5) {
		return altDay + 1;
	}
	return altDay;
}

function elapsedDays(year: number): number {
	return elapsedDays0(year);
}

/** Number of days in the Hebrew year (353-355 common, 383-385 leap). */
export function daysInYear(year: number): number {
	return elapsedDays(year + 1) - elapsedDays(year);
}

/** Cheshvan has 30 days in a "complete" year. */
export function longCheshvan(year: number): boolean {
	return daysInYear(year) % 10 === 5;
}

/** Kislev has 29 days in a "deficient" year. */
export function shortKislev(year: number): boolean {
	return daysInYear(year) % 10 === 3;
}

/** Days in a Hebrew month (29 or 30). */
export function daysInMonth(month: number, year: number): number {
	const d = STATIC_DAYS_IN_MONTH[month];
	if (d !== 0) return d;
	if (month === HEBREW_MONTH.ADAR_I) return isLeapYear(year) ? 30 : 29;
	if (month === HEBREW_MONTH.CHESHVAN) return longCheshvan(year) ? 30 : 29;
	return shortKislev(year) ? 29 : 30; // KISLEV
}

/** Convert Hebrew date to absolute R.D. day number. */
export function hebrew2abs(year: number, month: number, day: number): number {
	let tempabs = day;
	if (month < HEBREW_MONTH.TISHREI) {
		const endMonth = monthsInYear(year);
		for (let m = HEBREW_MONTH.TISHREI; m <= endMonth; m++) {
			tempabs += daysInMonth(m, year);
		}
		for (let m = HEBREW_MONTH.NISAN; m < month; m++) {
			tempabs += daysInMonth(m, year);
		}
	} else {
		for (let m = HEBREW_MONTH.TISHREI; m < month; m++) {
			tempabs += daysInMonth(m, year);
		}
	}
	return HEBREW_EPOCH + elapsedDays(year) + tempabs - 1;
}

/** Convert absolute R.D. day number to a Hebrew date. */
export function abs2hebrew(abs: number): { yy: number; mm: number; dd: number } {
	abs = Math.trunc(abs);
	let year = Math.floor((abs - HEBREW_EPOCH) / AVG_HEBYEAR_DAYS);
	while (HEBREW_EPOCH + elapsedDays(year) <= abs) {
		year++;
	}
	year--;

	let month =
		abs < hebrew2abs(year, HEBREW_MONTH.NISAN, 1) ? HEBREW_MONTH.TISHREI : HEBREW_MONTH.NISAN;
	while (abs > hebrew2abs(year, month, daysInMonth(month, year))) {
		month++;
	}
	const day = 1 + abs - hebrew2abs(year, month, 1);
	return { yy: year, mm: month, dd: day };
}

/** Gregorian date to absolute R.D. day number (proleptic Gregorian). */
export function greg2abs(date: Date): number {
	const py = date.getFullYear() - 1;
	return (
		365 * py +
		quotient(py, 4) -
		quotient(py, 100) +
		quotient(py, 400) +
		quotient(367 * (date.getMonth() + 1) - 362, 12) +
		(date.getMonth() + 1 <= 2 ? 0 : isGregLeapYear(date.getFullYear()) ? -1 : -2) +
		date.getDate()
	);
}

function yearFromFixed(abs: number): number {
	const l0 = abs - 1;
	const n400 = quotient(l0, 146097);
	const d1 = mod(l0, 146097);
	const n100 = quotient(d1, 36524);
	const d2 = mod(d1, 36524);
	const n4 = quotient(d2, 1461);
	const d3 = mod(d2, 1461);
	const n1 = quotient(d3, 365);
	const year = 400 * n400 + 100 * n100 + 4 * n4 + n1;
	return n100 !== 4 && n1 !== 4 ? year + 1 : year;
}

/** Absolute R.D. day number to a Gregorian `Date` at local midnight. */
export function abs2greg(abs: number): Date {
	abs = Math.trunc(abs);
	const year = yearFromFixed(abs);
	const priorDays = abs - greg2abs(new Date(year, 0, 1));
	const correction = abs < greg2abs(new Date(year, 2, 1)) ? 0 : isGregLeapYear(year) ? 1 : 2;
	const month = quotient(12 * (priorDays + correction) + 373, 367);
	const day = abs - greg2abs(new Date(year, month - 1, 1)) + 1;
	const dt = new Date(year, month - 1, day);
	if (year < 100 && year >= 0) dt.setFullYear(year);
	return dt;
}

/** Days in a Gregorian month (1-based). */
export function daysInGregMonth(month: number, year: number): number {
	return [0, 31, isGregLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
}

export interface HebrewDay {
	/** Hebrew day of month (1-30). */
	hebrewDay: number;
	/** Gregorian date for this day. */
	gregorian: Date;
	/** Hebrew date of this day (for highlighting). */
	hey: number;
	hem: number;
	hed: number;
}

export interface HebrewMonthPage {
	hebrewYear: number;
	month: number;
	monthNameHe: string;
	monthNameEn: string;
	/** Days of this month in Tishrei-first grid order. */
	days: (HebrewDay | null)[];
	/** Number of leading blank cells (weekday offset of the 1st). */
	leadingBlanks: number;
}

const WEEKDAY_HE = ["א", "ב", "ג", "ד", "ה", "ו", "ש"] as const;

export { WEEKDAY_HE };

/**
 * Build the day grid for one Hebrew month of `hebrewYear`, laid out
 * Sunday-first (matching the Hebrew week: א .. ש).
 */
export function buildHebrewMonthPage(hebrewYear: number, month: number): HebrewMonthPage {
	const { he, en } = monthDisplayName(month, hebrewYear);
	const daysInMonthCount = daysInMonth(month, hebrewYear);
	const firstAbs = hebrew2abs(hebrewYear, month, 1);
	const firstGreg = abs2greg(firstAbs);
	// getDay(): 0=Sunday .. 6=Saturday — already Sunday-first.
	const leadingBlanks = firstGreg.getDay();

	const days: (HebrewDay | null)[] = [];
	for (let i = 0; i < leadingBlanks; i++) days.push(null);
	for (let d = 1; d <= daysInMonthCount; d++) {
		const abs = hebrew2abs(hebrewYear, month, d);
		const g = abs2greg(abs);
		const h = abs2hebrew(abs);
		days.push({
			hebrewDay: d,
			gregorian: g,
			hey: h.yy,
			hem: h.mm,
			hed: h.dd,
		});
	}
	return {
		hebrewYear,
		month,
		monthNameHe: he,
		monthNameEn: en,
		days,
		leadingBlanks,
	};
}

/** Two-digit Hebrew year numeral for display, e.g. "תשפ״ה" style or "85". */
export function hebrewYearShort(hebrewYear: number): number {
	// Hebrew year modulo 1000 displayed as two digits where possible.
	return hebrewYear % 100;
}

/**
 * Short Hebrew label for a major festival / fast day, or null.
 * Day numbers are 1-based Hebrew day-of-month; month is Nisan-based.
 */
export function holidayLabel(month: number, day: number): string | null {
	const M = HEBREW_MONTH;
	switch (month) {
		case M.TISHREI:
			if (day === 1 || day === 2) return "ראש השנה";
			if (day === 10) return "יום כיפור";
			if (day >= 15 && day <= 21) return "סוכות";
			if (day === 22) return "שמיני עצרת";
			return null;
		case M.NISAN:
			if (day >= 15 && day <= 21) return "פסח";
			if (day === 22) return "שביעי של פסח";
			return null;
		case M.SIVAN:
			if (day === 6 || day === 7) return "שבועות";
			return null;
		case M.TAMUZ:
			if (day === 17) return "תענית";
			return null;
		case M.AV:
			if (day === 9) return "תענית";
			return null;
		default:
			return null;
	}
}
