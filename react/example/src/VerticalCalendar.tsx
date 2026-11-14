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
import { type ReactElement, useMemo, useRef, useState } from "react";
import {
	calendarMonths,
	calendarSemantics,
	civilDateId,
	gregorianRangeLabel,
	monthLabel,
	monthPageIndex,
} from "./calendar-model";
import { toLetters } from "./gematry";
import {
	buildHebrewMonthPage,
	type HebrewDay,
	type HebrewMonthPage,
	hebrewYearShort,
	holidayLabel,
} from "./hebrewCalendar";
import { TEST_PARAM_INITIAL_TURNED_LEAVES } from "./test-url-params";

const WEEKDAY_HE = ["א", "ב", "ג", "ד", "ה", "ו", "ש"] as const;
const selectedDateFormat = new Intl.DateTimeFormat("en", {
	month: "long",
	day: "numeric",
	year: "2-digit",
});

function isToday(date: Date): boolean {
	const now = new Date();
	return (
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate()
	);
}

const FrontCover = () => (
	<div className="cal-cover cal-cover--front flipbook-page-bounded">
		<div className="cal-cover__content">
			<h1>לוח שנה</h1>
			<p className="cal-cover__subtitle">עברית · לועזית</p>
			<p className="cal-cover__years">
				<span aria-hidden="true">87–88 · 26–28</span>
				<span className="cal-cell__sr">Hebrew years 5787–5788, Gregorian years 2026–2028</span>
			</p>
		</div>
	</div>
);

const BackCover = () => (
	<div className="cal-cover cal-cover--back flipbook-page-bounded">
		<div className="cal-cover__content">סוף הלוח · End of calendar</div>
	</div>
);

const CoverInterior = () => (
	<div className="cal-page cal-page--interior flipbook-page-bounded" aria-hidden="true">
		<div className="cal-reverse__handle">↓ החודש הקודם · Pull to return</div>
		<div className="cal-reverse__note" dir="rtl">
			<span>לוח שנה עברי · Gregorian calendar</span>
			<p>הרימו את הקצה התחתון כדי להתקדם לחודש הבא.</p>
			<p lang="en" dir="ltr">
				Lift the lower edge to turn. Pull this upper edge down to return.
			</p>
			<small>↑ / ↓ · Keyboard & buttons</small>
		</div>
	</div>
);

interface GridCell {
	key: string;
	day: HebrewDay | null;
}

function CellBody({
	day,
	page,
	holiday,
}: {
	day: HebrewDay;
	page: HebrewMonthPage;
	holiday: string | null;
}) {
	return (
		<span className="cal-cell__body">
			<span className="cal-cell__he" aria-hidden="true">
				{toLetters(day.hebrewDay)}
			</span>
			<span className="cal-cell__ge" aria-hidden="true">
				{day.gregorian.getDate()}
			</span>
			<span className="cal-cell__label">{holiday ?? (day.hed === 1 ? "ראש חודש" : "")}</span>
			<span className="cal-cell__sr">
				{day.gregorian.toDateString()} — {page.monthNameHe} {toLetters(day.hebrewDay)}{" "}
				{page.monthNameEn} {page.hebrewYear}
			</span>
		</span>
	);
}

function MonthCell({
	cell,
	col,
	page,
	onSelectDate,
}: {
	cell: GridCell;
	col: number;
	page: HebrewMonthPage;
	onSelectDate: (day: HebrewDay) => void;
}) {
	const day = cell.day;
	if (!day) {
		return <td className="cal-cell cal-cell--blank" />;
	}
	const holiday = holidayLabel(day.hem, day.hed);
	const today = isToday(day.gregorian);
	const cls = [
		"cal-cell",
		col === 6 ? "cal-cell--shabbat" : "",
		today ? "cal-cell--today" : "",
		holiday ? "cal-cell--holiday" : "",
	].join(" ");
	const body = <CellBody day={day} page={page} holiday={holiday} />;
	// One clickable date proves links don't turn the page.
	if (today || day.hebrewDay === 1 || holiday === "פסח") {
		return (
			<td className={cls} data-date={civilDateId(day.gregorian)}>
				<a
					className="cal-cell__link"
					href={`#date-${civilDateId(day.gregorian)}`}
					onClick={(event) => {
						event.preventDefault();
						onSelectDate(day);
					}}
					data-flipbook-no-flip
				>
					{body}
				</a>
			</td>
		);
	}
	return (
		<td className={cls} data-date={civilDateId(day.gregorian)}>
			{body}
		</td>
	);
}

function MonthPage({ year, month }: { year: number; month: number }) {
	const page = useMemo(() => buildHebrewMonthPage(year, month), [year, month]);
	const hebrewYearLabel = String(hebrewYearShort(year)).padStart(2, "0");
	const [selectedDay, setSelectedDay] = useState<HebrewDay | null>(null);
	const dateDialogRef = useRef<HTMLDialogElement>(null);
	const selectDate = (day: HebrewDay) => {
		setSelectedDay(day);
		dateDialogRef.current?.showModal();
	};
	// Pad to whole weeks and derive row/cell keys from content (ISO dates) so
	// the grid stays a semantic table without index keys.
	const grid = useMemo(() => {
		const flat = [...page.days];
		while (flat.length % 7 !== 0) flat.push(null);
		const rows: { key: string; cells: GridCell[] }[] = [];
		for (let w = 0; w * 7 < flat.length; w += 1) {
			const slice = flat.slice(w * 7, w * 7 + 7);
			const firstDay = slice.find((d): d is HebrewDay => d !== null);
			rows.push({
				key: firstDay ? civilDateId(firstDay.gregorian) : `w${w}`,
				cells: slice.map((day, c) => ({
					key: day ? civilDateId(day.gregorian) : `x${w}-${c}`,
					day,
				})),
			});
		}
		return rows;
	}, [page]);
	return (
		<div
			className="cal-page flipbook-page-bounded"
			dir="rtl"
			data-hebrew-year={year}
			data-hebrew-month={month}
		>
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
								{row.cells.map((cell, col) => (
									<MonthCell
										key={cell.key}
										cell={cell}
										col={col}
										page={page}
										onSelectDate={selectDate}
									/>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="cal-page__handle" aria-hidden="true">
				החודש הבא ↑ · Lift to turn
			</div>
			<dialog
				ref={dateDialogRef}
				className="cal-date-dialog"
				aria-label="Calendar date details"
				data-flipbook-no-flip
				onClose={() => setSelectedDay(null)}
				onKeyDown={(event) => event.stopPropagation()}
			>
				{selectedDay && (
					<>
						<h3>פרטי התאריך</h3>
						<p>
							<time dateTime={civilDateId(selectedDay.gregorian)}>
								<span aria-hidden="true">{selectedDateFormat.format(selectedDay.gregorian)}</span>
								<span className="cal-cell__sr">{selectedDay.gregorian.toDateString()}</span>
							</time>
						</p>
						<p>
							<span aria-hidden="true">
								{toLetters(selectedDay.hebrewDay)} {page.monthNameHe} {hebrewYearLabel}
							</span>
							<span className="cal-cell__sr">
								{selectedDay.hebrewDay} {page.monthNameEn} {year}
							</span>
						</p>
						<button
							type="button"
							aria-label="Close date details"
							onClick={() => dateDialogRef.current?.close()}
						>
							סגירה · Close
						</button>
					</>
				)}
			</dialog>
		</div>
	);
}

const VerticalCalendar = () => {
	const flipBookRef = useRef<FlipBookHandle>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [currentPage, setCurrentPage] = useState(1);

	// Same test hook the book examples use: ?test-initialTurnedLeaves=0,1,2
	const initialTurnedLeaves = useMemo(() => {
		const raw = new URLSearchParams(window.location.search).get(TEST_PARAM_INITIAL_TURNED_LEAVES);
		return raw
			? raw
					.split(",")
					.map(Number)
					.filter((n) => !Number.isNaN(n))
			: [0];
	}, []);

	const pages = useMemo<ReactElement[]>(() => {
		const arr: ReactElement[] = [<FrontCover key="fc" />, <CoverInterior key="fci" />];
		for (const { year, month } of calendarMonths) {
			arr.push(
				<MonthPage key={`${year}-${month}`} year={year} month={month} />,
				<CoverInterior key={`${year}-${month}-back`} />,
			);
		}
		arr[arr.length - 1] = <BackCover key="bc" />;
		return arr;
	}, []);

	return (
		<div ref={containerRef} className="cal-wrap">
			<div className="cal-intro" dir="rtl">
				<h2>לוח שנה עברי · Gregorian calendar</h2>
				<p>הרימו את הקצה התחתון למעלה. לחזרה, הורידו את הקצה העליון של הדף שהתהפך.</p>
				<p lang="en" dir="ltr">
					Lift the lower edge to advance; pull the upper free edge down to return. Or use ↑ / ↓ and
					the buttons.
				</p>
				<label>
					מעבר לחודש{" "}
					<select
						data-flipbook-no-flip
						aria-label="Go to month"
						value={Math.max(-1, Math.min(calendarMonths.length, Math.floor((currentPage - 1) / 2)))}
						onChange={(event) =>
							flipBookRef.current?.jumpToPage(
								Number(event.target.value) === calendarMonths.length
									? pages.length - 1
									: monthPageIndex(Number(event.target.value)),
							)
						}
					>
						<option value={-1}>כריכה · Cover</option>
						{calendarMonths.map(({ year, month }, index) => (
							<option key={`${year}-${month}`} value={index}>
								{monthLabel(index)}
							</option>
						))}
						<option value={calendarMonths.length}>סיום · End</option>
					</select>
				</label>
			</div>
			<FlipBook
				ref={flipBookRef}
				className="cal-book"
				flipAxis="vertical"
				bindingSize={20}
				direction="rtl"
				pages={pages}
				leafAspectRatio={{ width: 8, height: 5 }}
				coverAspectRatio={{ width: 8, height: 5 }}
				leavesBuffer={4}
				initialTurnedLeaves={initialTurnedLeaves}
				pageSemantics={calendarSemantics}
				handlers={{
					onPageFlipped: ({ pageIndices }) =>
						setCurrentPage(flipBookRef.current?.getCurrentPageIndex() ?? pageIndices[0]),
				}}
				debug={false}
				enableHistory={false}
				enableDownload={false}
			/>
			<Toolbar
				flipBookRef={flipBookRef}
				direction="rtl"
				pageSemantics={calendarSemantics}
				fullscreenTargetRef={containerRef}
				commandOptions={{
					flipNext: { hotkeys: [{ key: "ArrowUp" }, { key: "PageDown" }, { key: " " }] },
					flipPrev: { hotkeys: [{ key: "ArrowDown" }, { key: "PageUp" }] },
				}}
			>
				<div className="flipbook-toolbar-start">
					<FullscreenButton />
					<MouseModeButton />
				</div>
				<div className="flipbook-toolbar-nav-cluster">
					<FirstPageButton />
					<PrevButton />
					<PageIndicator showTotal={false} editable={false} />
					<NextButton />
					<LastPageButton />
				</div>
			</Toolbar>
		</div>
	);
};

export default VerticalCalendar;
