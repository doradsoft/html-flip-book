import type { Bookmark, BookmarkContext, BookmarkProvider } from "html-flip-book-react";
import { useCallback, useMemo, useState } from "react";
import EnBook, { type EnBookConfig } from "./EnBook";
import HeBook from "./HeBook";
import "./BookmarkExample.css";

type Placement = NonNullable<BookmarkProvider["placement"]>;
type Orientation = NonNullable<BookmarkProvider["orientation"]>;
type Attachment = NonNullable<BookmarkProvider["attachment"]>;
type Order = "page" | "reverse-page" | "title";
type Action = "default" | "inspect" | "navigate";
type Provider = "default" | "custom";
interface ExampleBookmarkData {
	chapter: number;
	pageIndices: number[];
	shortTitle: string;
	semanticName: string;
}

const TAB_COLORS = ["sand", "moss", "sea", "violet", "clay", "slate"];

export default function BookmarkExample({
	direction,
	config,
}: {
	direction: "ltr" | "rtl";
	config?: EnBookConfig;
}) {
	const isRtl = direction === "rtl";
	const [provider, setProvider] = useState<Provider>("custom");
	const [placement, setPlacement] = useState<Placement>("sides");
	const [orientation, setOrientation] = useState<Orientation>("perpendicular");
	const [attachment, setAttachment] = useState<Attachment>("leaf");
	const [order, setOrder] = useState<Order>("page");
	const [action, setAction] = useState<Action>("default");
	const [onlyUpcoming, setOnlyUpcoming] = useState(false);
	const [lastAction, setLastAction] = useState("Choose a bookmark to open its page.");
	const createBookmarkProvider = useCallback<NonNullable<EnBookConfig["createBookmarkProvider"]>>(
		(pageSemantics, jumpToPage, { pagesCount, coverPageIndices }) => {
			const covers = new Set(coverPageIndices);
			const pageBookmarks = Array.from(
				{ length: pagesCount },
				(_, index) => index,
			).flatMap<Bookmark>((pageIndex) => {
				if (covers.has(pageIndex)) return [];
				const title = pageSemantics.indexToTitle(pageIndex);
				if (title.length === 0 && pageIndex !== 2) return [];
				return [
					{
						id: `page-${pageIndex}`,
						pageIndex,
						label: title || (isRtl ? "תוכן העניינים" : "Table of Contents"),
					},
				];
			});
			const spreads = new Map<number, Bookmark[]>();
			for (const bookmark of pageBookmarks) {
				const spreadIndex = Math.floor((bookmark.pageIndex + 1) / 2);
				const facing = spreads.get(spreadIndex) ?? [];
				facing.push(bookmark);
				spreads.set(spreadIndex, facing);
			}
			const bookmarks: Bookmark[] = Array.from(spreads, ([spreadIndex, facing]) => {
				const contents = facing.find((bookmark) => bookmark.pageIndex === 2);
				const start = spreadIndex === 0 ? 0 : spreadIndex * 2 - 1;
				const data: ExampleBookmarkData = {
					chapter: spreadIndex + 1,
					pageIndices: facing.map((bookmark) => bookmark.pageIndex),
					shortTitle: facing
						.map(
							(bookmark) => pageSemantics.indexToShortTitle?.(bookmark.pageIndex) || bookmark.label,
						)
						.join(" / "),
					semanticName: facing
						.map(
							(bookmark) =>
								pageSemantics.indexToSemanticName(bookmark.pageIndex) ||
								String(bookmark.pageIndex + 1),
						)
						.join("–"),
				};
				return {
					id: contents ? "contents" : `spread-${spreadIndex}`,
					pageIndex: contents?.pageIndex ?? start,
					label: facing.map((bookmark) => bookmark.label).join(" / "),
					className: `example-bookmark--${TAB_COLORS[(spreadIndex - 1 + TAB_COLORS.length) % TAB_COLORS.length]}`,
					data,
				};
			});
			return {
				getBookmarks: ({ currentPageIndex }: BookmarkContext) =>
					bookmarks.filter((bookmark) => !onlyUpcoming || bookmark.pageIndex >= currentPageIndex),
				placement,
				orientation,
				attachment,
				order:
					order === "title" ? (a, b) => a.label.localeCompare(b.label, isRtl ? "he" : "en") : order,
				className: "example-bookmarks",
				renderBookmark: (bookmark) => (
					<span className="example-bookmark-brief" dir={direction}>
						<strong>{(bookmark.data as ExampleBookmarkData).shortTitle}</strong>
					</span>
				),
				renderExpandedBookmark: (bookmark) => (
					<span className="example-bookmark-full" dir={direction}>
						<strong>{bookmark.label}</strong>
						<small>
							{isRtl ? "עמוד " : "Page "}
							{(bookmark.data as ExampleBookmarkData).semanticName}
						</small>
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
								if (action === "navigate") jumpToPage(bookmark.pageIndex);
							},
			};
		},
		[action, attachment, direction, isRtl, onlyUpcoming, order, orientation, placement],
	);
	const bookConfig = useMemo<EnBookConfig>(
		() => ({
			...config,
			enableBookmarks: true,
			createBookmarkProvider: provider === "custom" ? createBookmarkProvider : undefined,
		}),
		[config, createBookmarkProvider, provider],
	);

	return (
		<div className="bookmark-example">
			<div className="bookmark-example-controls">
				<label>
					Provider
					<select
						value={provider}
						onChange={(event) => setProvider(event.target.value as Provider)}
					>
						<option value="default">Default: table of contents</option>
						<option value="custom">Custom bookmarks</option>
					</select>
				</label>
				{provider === "custom" && (
					<>
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
							Orientation
							<select
								value={orientation}
								onChange={(event) => setOrientation(event.target.value as Orientation)}
							>
								<option value="perpendicular">Perpendicular to edge</option>
								<option value="parallel">Parallel to edge</option>
							</select>
						</label>
						<label>
							Attachment
							<select
								value={attachment}
								onChange={(event) => setAttachment(event.target.value as Attachment)}
							>
								<option value="leaf">Turn with target leaf</option>
								<option value="pinned">Pinned to book</option>
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
					</>
				)}
			</div>
			<div
				className={`bookmark-example-stage ${isRtl ? "he-book-container" : "en-book-container"}`}
			>
				{isRtl ? <HeBook config={bookConfig} /> : <EnBook config={bookConfig} />}
			</div>
			<output className="bookmark-example-event">{lastAction}</output>
		</div>
	);
}
