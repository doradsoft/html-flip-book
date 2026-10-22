import {
	type Bookmark,
	type BookmarkContext,
	type BookmarkProvider,
	FlipBook,
	type FlipBookHandle,
} from "html-flip-book-react";
import {
	FirstPageButton,
	LastPageButton,
	NextButton,
	PageIndicator,
	PrevButton,
	Toolbar,
} from "html-flip-book-react/toolbar";
import { useMemo, useRef, useState } from "react";
import "./BookmarkExample.css";

type Placement = NonNullable<BookmarkProvider["placement"]>;
type Order = "page" | "reverse-page" | "title";
type Action = "default" | "inspect" | "navigate";

const CHAPTERS = [
	{ id: "welcome", en: "Welcome", he: "פתיחה", color: "sand" },
	{ id: "gardens", en: "Gardens", he: "גנים", color: "moss" },
	{ id: "coast", en: "Coast", he: "חוף", color: "sea" },
	{ id: "night", en: "Night", he: "לילה", color: "violet" },
	{ id: "trails", en: "Trails", he: "שבילים", color: "clay" },
	{ id: "notes", en: "Notes", he: "רשימות", color: "slate" },
];

const EN_TEXT = [
	"A field guide to small wonders",
	"Take the long way home. This little book collects the details we often pass by: a leaf, a quiet shore, a path that goes somewhere new.",
	"Look closely at the ordinary",
	"A garden changes each time you visit. Look for new shoots, shifting shadows, and the small visitors making a home between the leaves.",
	"Where the land meets the water",
	"Walk beside the water and notice its rhythm. Every stone has a different shape. Every tide leaves a new line on the shore.",
	"A different kind of daylight",
	"Let your eyes grow used to the dark. Familiar places become new again beneath the stars. Pause, listen, and see what appears.",
	"Follow your curiosity",
	"A good trail leaves room for discovery. Choose a turning you have never taken, then stop to notice what makes this place its own.",
	"Keep a little of what you find",
	"Write a few words, sketch a shape, or simply remember how it felt to be there. There is always another small wonder waiting outside.",
];

const HE_TEXT = [
	"מדריך לפלאים הקטנים",
	"לפעמים כדאי לבחור בדרך הארוכה הביתה. הספר הקטן הזה אוסף פרטים שאנחנו חולפים על פניהם: עלה, חוף שקט, שביל שמוביל למקום חדש.",
	"להתבונן מחדש במוכר",
	"הגן משתנה בכל ביקור. חפשו נבטים חדשים, צללים נעים ואת המבקרים הקטנים שמצאו בית בין העלים.",
	"בין היבשה למים",
	"לכו לצד המים והקשיבו לקצב שלהם. לכל אבן צורה משלה. כל גל משאיר קו חדש על החוף.",
	"אור מסוג אחר",
	"תנו לעיניים להתרגל לחושך. מקומות מוכרים נראים חדשים תחת הכוכבים. עצרו, הקשיבו וראו מה מופיע.",
	"בעקבות הסקרנות",
	"שביל טוב משאיר מקום לגילוי. בחרו פנייה שעוד לא ניסיתם, ועצרו לשים לב למה שמייחד את המקום הזה.",
	"לשמור משהו מהדרך",
	"כתבו כמה מילים, ציירו צורה או זכרו איך הרגשתם שם. בחוץ תמיד מחכה עוד פלא קטן.",
];

export default function BookmarkExample({ direction }: { direction: "ltr" | "rtl" }) {
	const bookRef = useRef<FlipBookHandle>(null);
	const [placement, setPlacement] = useState<Placement>("sides");
	const [order, setOrder] = useState<Order>("page");
	const [action, setAction] = useState<Action>("default");
	const [onlyUpcoming, setOnlyUpcoming] = useState(false);
	const [lastAction, setLastAction] = useState("Choose a tab to open a chapter.");
	const isRtl = direction === "rtl";
	const bookmarks = useMemo<Bookmark[]>(
		() =>
			CHAPTERS.map((chapter, index) => ({
				id: chapter.id,
				pageIndex: index * 2,
				label: isRtl ? chapter.he : chapter.en,
				className: `field-guide-tab--${chapter.color}`,
				data: { chapter: index + 1 },
			})),
		[isRtl],
	);
	const pages = useMemo(
		() =>
			(isRtl ? HE_TEXT : EN_TEXT).map((text, index) => (
				<article
					key={text}
					className={`field-guide-page ${index === 0 ? "field-guide-cover" : ""}`}
					dir={direction}
				>
					<span className="field-guide-eyebrow">{isRtl ? "יומן מסע" : "THE FIELD GUIDE"}</span>
					<div className="field-guide-page-body">
						{index % 2 === 0 ? <h2>{text}</h2> : <p>{text}</p>}
						<span className="field-guide-ornament" aria-hidden="true">
							✦
						</span>
					</div>
					<span className="field-guide-page-number">{index + 1}</span>
				</article>
			)),
		[direction, isRtl],
	);
	const bookmarkProvider = useMemo<BookmarkProvider>(
		() => ({
			getBookmarks: ({ currentPageIndex }: BookmarkContext) =>
				bookmarks.filter((bookmark) => !onlyUpcoming || bookmark.pageIndex >= currentPageIndex),
			placement,
			order:
				order === "title" ? (a, b) => a.label.localeCompare(b.label, isRtl ? "he" : "en") : order,
			className: "field-guide-tabs",
			renderBookmark: (bookmark) => (
				<span className="field-guide-tab-content" dir={direction}>
					<span className="field-guide-tab-number" aria-hidden="true">
						{String(bookmark.pageIndex / 2 + 1).padStart(2, "0")}
					</span>
					<span className="field-guide-tab-label">{bookmark.label}</span>
				</span>
			),
			onClick:
				action === "default"
					? undefined
					: (currentLeafIndex, bookmark) => {
							const chapter = (bookmark.data as { chapter: number }).chapter;
							setLastAction(
								`From leaf ${currentLeafIndex + 1}: ${bookmark.label} (page ${bookmark.pageIndex + 1}). Chapter ${chapter}.`,
							);
							if (action === "navigate") bookRef.current?.jumpToPage(bookmark.pageIndex);
						},
		}),
		[action, bookmarks, direction, isRtl, onlyUpcoming, order, placement],
	);

	return (
		<div className="bookmark-example">
			<div className="bookmark-example-heading">
				<p className="bookmark-example-kicker">BOOKMARK PROVIDER · {direction.toUpperCase()}</p>
				<h2>Find your place.</h2>
				<p>Chapter tabs with custom content, styling, ordering, and actions.</p>
			</div>
			<div className="bookmark-example-controls">
				<label>
					Placement
					<select
						value={placement}
						onChange={(event) => setPlacement(event.target.value as Placement)}
					>
						<option value="top">Top</option>
						<option value="bottom">Bottom</option>
						<option value="sides">Left & right</option>
						<option value="left">Left</option>
						<option value="right">Right</option>
						<option value="top-bottom">Top & bottom</option>
					</select>
				</label>
				<label>
					Order
					<select value={order} onChange={(event) => setOrder(event.target.value as Order)}>
						<option value="page">Page number</option>
						<option value="reverse-page">Reverse page number</option>
						<option value="title">Title (custom comparator)</option>
					</select>
				</label>
				<label>
					Click action
					<select value={action} onChange={(event) => setAction(event.target.value as Action)}>
						<option value="default">Default: jump to page</option>
						<option value="inspect">Custom: show event only</option>
						<option value="navigate">Custom: show event & jump</option>
					</select>
				</label>
				<label className="bookmark-example-checkbox">
					<input
						type="checkbox"
						checked={onlyUpcoming}
						onChange={(event) => setOnlyUpcoming(event.target.checked)}
					/>
					Upcoming chapters only
				</label>
			</div>
			<div className="bookmark-example-stage">
				<FlipBook
					ref={bookRef}
					className="bookmark-demo-book"
					pages={pages}
					direction={direction}
					bookmarkProvider={bookmarkProvider}
					initialTurnedLeaves={[0]}
					pageShadow
					coverConfig={{ coverIndices: [] }}
				/>
			</div>
			<Toolbar flipBookRef={bookRef} direction={direction}>
				<div className="flipbook-toolbar-nav-cluster">
					<FirstPageButton />
					<PrevButton />
					<PageIndicator />
					<NextButton />
					<LastPageButton />
				</div>
			</Toolbar>
			<output className="bookmark-example-event">{lastAction}</output>
		</div>
	);
}
