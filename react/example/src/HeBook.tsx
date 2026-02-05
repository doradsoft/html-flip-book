// HeBook.tsx

import { toLetters, toNumber } from "gematry";
import { FlipBook, type FlipBookHandle, type PageSemantics, TocPage } from "html-flip-book-react";
import {
	FirstPageButton,
	FullscreenButton,
	LastPageButton,
	NextButton,
	PageIndicator,
	PrevButton,
	Toolbar,
} from "html-flip-book-react/toolbar";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";

// Import text files for Genesis (Bereshit)
const textFiles = import.meta.glob("/assets/pages_data/he/*.txt", {
	query: "?raw",
	import: "default",
});

/** Front cover component */
const FrontCover = () => (
	<div className="cover front-cover he-cover">
		<div className="cover-content">
			<div className="cover-decoration top" />
			<h1>ספר בראשית</h1>
			<p className="subtitle">מקרא על פי המסורה</p>
			<div className="cover-decoration bottom" />
			<p className="author">ספריא • CC-BY-SA</p>
		</div>
	</div>
);

/** Back cover component */
const BackCover = () => (
	<div className="cover back-cover he-cover">
		<div className="cover-content">
			<h2>סוף</h2>
			<p>טקסט מתוך ספריא</p>
			<div className="cover-decoration" />
			<p className="small">html-flip-book</p>
		</div>
	</div>
);

// Page titles for TOC - extracted from chapter headers in the text files
// The actual chapter headers are embedded in the text files themselves
const chapterTitles: Record<number, string> = {
	0: "שער", // Cover
	1: "תוכן העניינים", // TOC
	// Remaining pages (2-328) are content pages - title extracted from text
};

const hePageSemantics: PageSemantics = {
	indexToSemanticName(pageIndex: number): string {
		// Front cover and TOC have no page numbers
		if (pageIndex <= 1) return "";
		// Content pages use Hebrew numerals (starting from 1 for page index 2)
		return toLetters(pageIndex - 1, { addQuotes: true });
	},
	semanticNameToIndex(semanticPageName: string): number | null {
		const num = toNumber(semanticPageName);
		if (num === 0) return null;
		// Content starts at index 2
		return num + 1;
	},
	indexToTitle(pageIndex: number): string {
		return chapterTitles[pageIndex] ?? "";
	},
};

/** Parse URL parameters for test configuration */
function useTestParams() {
	return useMemo(() => {
		const params = new URLSearchParams(window.location.search);
		const initialTurnedLeaves = params.get("initialTurnedLeaves");
		const fastDeltaThreshold = params.get("fastDeltaThreshold");

		return {
			initialTurnedLeaves: initialTurnedLeaves
				? initialTurnedLeaves
						.split(",")
						.map(Number)
						.filter((n) => !Number.isNaN(n))
				: undefined,
			fastDeltaThreshold: fastDeltaThreshold ? Number(fastDeltaThreshold) : undefined,
		};
	}, []);
}

export const HeBook = () => {
	const [hePages, setHePages] = useState<ReactElement[]>([]);
	const testParams = useTestParams();
	const flipBookRef = useRef<FlipBookHandle>(null);

	useEffect(() => {
		const loadTextFiles = async () => {
			// Load and sort text files
			const files = await Promise.all(
				Object.entries(textFiles).map(async ([path, resolver]) => {
					const content = (await resolver()) as string;
					// Extract file number for sorting
					const match = path.match(/(\d+)\.txt$/);
					const order = match ? parseInt(match[1], 10) : 999;
					return { path, content, order };
				}),
			);

			// Sort by file number
			files.sort((a, b) => a.order - b.order);

			const contentPages = files.map(({ path, content }) => (
				<div key={path} className="he-page bible-page">
					<div className="bible-content">{content}</div>
				</div>
			));

			// Build pages: cover, TOC, content pages, back cover
			const toc = (
				<TocPage
					key="toc"
					onNavigate={(pageIndex) => flipBookRef.current?.goToPage(pageIndex)}
					totalPages={contentPages.length + 3} // cover + toc + content + back
					pageSemantics={hePageSemantics}
					heading="תוכן העניינים"
					direction="rtl"
					filter={(entry) => entry.pageIndex > 1 && entry.title.length > 0}
				/>
			);

			const pages = [
				<FrontCover key="front-cover" />,
				toc,
				...contentPages,
				<BackCover key="back-cover" />,
			];

			setHePages(pages);
		};

		loadTextFiles();
	}, []);

	if (hePages.length === 0) {
		return <div className="loading">טוען...</div>;
	}

	return (
		<div className="book-wrapper" dir="rtl">
			<FlipBook
				ref={flipBookRef}
				className="he-book"
				pages={hePages}
				direction="rtl"
				pageSemantics={hePageSemantics}
				debug={true}
				initialTurnedLeaves={testParams.initialTurnedLeaves}
				fastDeltaThreshold={testParams.fastDeltaThreshold}
			/>
			<Toolbar flipBookRef={flipBookRef} direction="rtl">
				<FullscreenButton />
				<LastPageButton />
				<NextButton />
				<PageIndicator />
				<PrevButton />
				<FirstPageButton />
			</Toolbar>
		</div>
	);
};

export default HeBook;
