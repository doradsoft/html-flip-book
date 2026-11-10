// VerticalCalendar.tsx — top-bound spiral Hebrew/Gregorian calendar demo.
//
// Each sheet is one Hebrew month; every day cell shows the Hebrew day numeral
// and the corresponding Gregorian day-of-month in the same grid. Month names
// (never bare numbers) label both calendar systems, and years render as two
// digits per the demo spec (full years stay in machine-readable attributes).

import { FlipBook, type FlipBookHandle } from "html-flip-book-react";
import {
	FirstPageButton,
	FullscreenButton,
	LastPageButton,
	MouseModeButton,
	NextButton,
	PageIndicator,
	PrevButton,
	Toolbar,
} from "html-flip-book-react/toolbar";
import { type ReactElement, useMemo, useRef } from "react";
import { toLetters } from "./gematry";
import {
	abs2greg,
	buildHebrewMonthPage,
	greg2abs,
	type HebrewDay,
	type HebrewMonthPage,
	hebrew2abs,
	hebrewYearShort,
	holidayLabel,
	tishreiFirstMonths,
} from "./hebrewCalendar";
import { TEST_PARAM_INITIAL_TURNED_LEAVES } from "./test-url-params";

/** Fixed fixture years: 5787 is a leap year (Adar I/II) and 5788 crosses the
 *  Tishrei year boundary, satisfying the demo's leap/boundary coverage. */
const CALENDAR_YEARS = [5787, 5788] as const;

const GREG_MONTHS_EN = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const WEEKDAY_HE = ["א", "ב", "ג", "ד", "ה", "ו", "ש"] as const;

function gregMonthYear(d: Date): { month: number; year: number } {
	return { month: d.getMonth(), year: d.getFullYear() };
}

/** Gregorian month name(s) overlapped by a Hebrew month, e.g. "March–April". */
function gregorianRangeLabel(page: HebrewMonthPage): string {
	const firstAbs = hebrew2abs(page.hebrewYear, page.month, 1);
	const dim = page.days.filter(Boolean).length;
	const lastAbs = hebrew2abs(page.hebrewYear, page.month, dim);
	const start = gregMonthYear(abs2greg(firstAbs));
	const end = gregMonthYear(abs2greg(lastAbs));
	const two = (y: number) => String(y % 100).padStart(2, "0");
	if (start.month === end.month && start.year === end.year) {
		return `${GREG_MONTHS_EN[start.month]} ${two(start.year)}`;
	}
	if (start.year === end.year) {
		return `${GREG_MONTHS_EN[start.month]}–${GREG_MONTHS_EN[end.month]} ${two(start.year)}`;
	}
	return `${GREG_MONTHS_EN[start.month]} ${two(start.year)} – ${GREG_MONTHS_EN[end.month]} ${two(end.year)}`;
}

function isToday(d: { hey: number; hem: number; hed: number }): boolean {
	const now = new Date();
	const todayHebrew = abs2greg(
		greg2abs(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
	);
	// Compare via R.D.: today's Hebrew date equals the cell's Hebrew date.
	const cellGreg = abs2greg(hebrew2abs(d.hey, d.hem, d.hed));
	return cellGreg.getTime() === todayHebrew.getTime();
}

const FrontCover = () => (
	<div className="cal-cover cal-cover--front">
		<div className="cal-cover__rings" aria-hidden="true" />
		<div className="cal-cover__content">
			<h1>לוח שנה</h1>
			<p className="cal-cover__subtitle">עברית · לועזית</p>
			<p className="cal-cover__years">תשפ״ז – תשפ״ח</p>
		</div>
		<div className="cal-cover__spiral" aria-hidden="true" />
	</div>
);

const BackCover = () => (
	<div className="cal-cover cal-cover--back">
		<div className="cal-cover__content" />
	</div>
);

const CoverInterior = () => <div className="cal-page cal-page--interior" />;

const TitlePage = () => (
	<div className="cal-page cal-title">
		<h2>לוח שנה עברי-לועזי</h2>
		<p>
			כל דף מציג חודש עברי עם התאריכים העבריים והלועזיים המקבילים באותו רשת. גררו את הקצה התחתון של
			הדף <strong>כלפי מעלה</strong> כדי להפוך עמוד, או השתמשו בכפתורי הניווט.
		</p>
		<p className="cal-title__note">שנים מוצגות בשתי ספרות: 87 = תשפ״ז, 26 = 2026.</p>
	</div>
);

function MonthPage({ year, month }: { year: number; month: number }) {
	const page = useMemo(() => buildHebrewMonthPage(year, month), [year, month]);
	const hebrewYearLabel = String(hebrewYearShort(year)).padStart(2, "0");
	// Pad to whole weeks and derive row/cell keys from content (ISO dates) so
	// the grid stays a semantic table without index keys.
	const grid = useMemo(() => {
		const flat = [...page.days];
		while (flat.length % 7 !== 0) flat.push(null);
		const rows: { key: string; cells: { key: string; day: HebrewDay | null }[] }[] = [];
		for (let w = 0; w * 7 < flat.length; w += 1) {
			const slice = flat.slice(w * 7, w * 7 + 7);
			const firstDay = slice.find((d): d is HebrewDay => d !== null);
			rows.push({
				key: firstDay ? firstDay.gregorian.toISOString().slice(0, 10) : `w${w}`,
				cells: slice.map((day, c) => ({
					key: day ? day.gregorian.toISOString().slice(0, 10) : `x${w}-${c}`,
					day,
				})),
			});
		}
		return rows;
	}, [page]);
	return (
		<div className="cal-page" dir="rtl">
			<header className="cal-page__head">
				<div className="cal-page__hebrew">
					<span className="cal-page__month-he">{page.monthNameHe}</span>
					<span className="cal-page__year-he">{hebrewYearLabel}</span>
				</div>
				<div className="cal-page__gregorian">
					<span className="cal-page__month-en">{page.monthNameEn}</span>
					<span className="cal-page__greg-range">{gregorianRangeLabel(page)}</span>
				</div>
			</header>
			<div className="cal-grid">
				<table className="cal-grid__table" aria-label={`${page.monthNameEn} ${page.hebrewYear}`}>
					<thead>
						<tr className="cal-grid__row cal-grid__row--head">
							{WEEKDAY_HE.map((d, i) => (
								<th
									key={d}
									scope="col"
									className={
										i === 6
											? "cal-cell cal-cell--head cal-cell--shabbat"
											: "cal-cell cal-cell--head"
									}
									data-shabbat={i === 6 || undefined}
								>
									{d}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{grid.map((row) => (
							<tr key={row.key} className="cal-grid__row">
								{row.cells.map((cell, col) => {
									const day = cell.day;
									if (!day) {
										return <td key={cell.key} className="cal-cell cal-cell--blank" />;
									}
									const holiday = holidayLabel(day.hem, day.hed);
									const today = isToday(day);
									const roshChodesh = day.hed === 1;
									const cls = [
										"cal-cell",
										col === 6 ? "cal-cell--shabbat" : "",
										today ? "cal-cell--today" : "",
										holiday ? "cal-cell--holiday" : "",
									].join(" ");
									const body = (
										<span className="cal-cell__body">
											<span className="cal-cell__he" aria-hidden="true">
												{toLetters(day.hebrewDay)}
											</span>
											<span className="cal-cell__ge" aria-hidden="true">
												{day.gregorian.getDate()}
											</span>
											<span className="cal-cell__label">
												{holiday ?? (roshChodesh ? "ראש חודש" : "")}
											</span>
											<span className="cal-cell__sr">
												{day.gregorian.toDateString()} — {page.monthNameHe}{" "}
												{toLetters(day.hebrewDay)} {page.monthNameEn}
											</span>
										</span>
									);
									// One clickable date proves links don't turn the page.
									if (today || holiday === "פסח") {
										return (
											<td key={cell.key} className={cls}>
												<a
													className="cal-cell__link"
													href={`https://www.hebcal.com/converter?gy=${day.gregorian.getFullYear()}&gm=${day.gregorian.getMonth() + 1}&gd=${day.gregorian.getDate()}&g2h=1`}
													target="_blank"
													rel="noreferrer"
													data-flipbook-no-flip
												>
													{body}
												</a>
											</td>
										);
									}
									return (
										<td key={cell.key} className={cls}>
											{body}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

const VerticalCalendar = () => {
	const flipBookRef = useRef<FlipBookHandle>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Same test hook the book examples use: ?test-initialTurnedLeaves=0,1,2
	const initialTurnedLeaves = useMemo(() => {
		const raw = new URLSearchParams(window.location.search).get(TEST_PARAM_INITIAL_TURNED_LEAVES);
		return raw
			? raw
					.split(",")
					.map(Number)
					.filter((n) => !Number.isNaN(n))
			: undefined;
	}, []);

	const pages = useMemo<ReactElement[]>(() => {
		const arr: ReactElement[] = [
			<FrontCover key="fc" />,
			<CoverInterior key="fci" />,
			<TitlePage key="title" />,
		];
		for (const year of CALENDAR_YEARS) {
			for (const month of tishreiFirstMonths(year)) {
				arr.push(<MonthPage key={`${year}-${month}`} year={year} month={month} />);
			}
		}
		arr.push(<CoverInterior key="bci" />, <BackCover key="bc" />);
		return arr;
	}, []);

	return (
		<div ref={containerRef} className="cal-wrap">
			<FlipBook
				ref={flipBookRef}
				className="cal-book"
				flipAxis="vertical"
				bindingSize={72}
				direction="rtl"
				pages={pages}
				leafAspectRatio={{ width: 5, height: 7 }}
				coverAspectRatio={{ width: 5.4, height: 7.4 }}
				leavesBuffer={4}
				initialTurnedLeaves={initialTurnedLeaves}
				debug={false}
				enableHistory={false}
				enableDownload={false}
			/>
			<Toolbar flipBookRef={flipBookRef} direction="rtl" fullscreenTargetRef={containerRef}>
				<div className="flipbook-toolbar-start">
					<FullscreenButton />
					<MouseModeButton />
				</div>
				<div className="flipbook-toolbar-nav-cluster">
					<FirstPageButton />
					<PrevButton />
					<PageIndicator />
					<NextButton />
					<LastPageButton />
				</div>
			</Toolbar>
		</div>
	);
};

export default VerticalCalendar;
