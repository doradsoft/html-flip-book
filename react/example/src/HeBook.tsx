// HeBook.tsx

import { toLetters, toNumber } from "gematry";
import { FlipBook, type FlipBookHandle, type PageSemantics, TocPage } from "html-flip-book-react";
import {
	DownloadDropdown,
	FirstPageButton,
	FullscreenButton,
	LastPageButton,
	NextButton,
	PageIndicator,
	PrevButton,
	TocButton,
	Toolbar,
} from "html-flip-book-react/toolbar";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { exportEntireBookPdf, exportPageRangePdf } from "./pdfExport";
import { getHebrewPdfFontName, loadHebrewFont } from "./pdfHebrewFont";

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

/** Front cover interior (כריכה פנים — inside of front cover when opened) */
const FrontCoverInterior = () => (
	<div className="cover cover-interior front-cover-interior he-cover">
		<div className="cover-content">
			<p className="interior-label">ספר בראשית</p>
			<p className="small">מקרא על פי המסורה</p>
		</div>
	</div>
);

/** Back cover component (no "סוף" on interior; exterior is blank/design only) */
const BackCover = () => (
	<div className="cover back-cover he-cover">
		<div className="cover-content">
			<p>טקסט מתוך ספריא</p>
			<div className="cover-decoration" />
			<p className="small">html-flip-book</p>
		</div>
	</div>
);

// Page titles for TOC. כריכה = front cover; כריכה פנים = front interior; שער = page after (e.g. TOC)
const getChapterTitles = (totalPages: number): Record<number, string> => ({
	0: "כריכה", // Front cover
	1: "כריכה פנים", // Front cover interior
	2: "שער", // Page after cover (e.g. TOC)
	[totalPages - 1]: "כריכה אחורית", // Back cover
});

function createHePageSemantics(totalPages: number): PageSemantics {
	return {
		indexToSemanticName(pageIndex: number): string {
			if (pageIndex <= 2) return ""; // כריכה, כריכה פנים, שער
			if (pageIndex === totalPages - 1) return "כריכה אחורית";
			return toLetters(pageIndex - 2, { addQuotes: true }); // content pages after cover, interior, toc
		},
		semanticNameToIndex(semanticPageName: string): number | null {
			if (semanticPageName === "כריכה אחורית") return totalPages - 1;
			const num = toNumber(semanticPageName);
			if (num === 0) return null;
			return num + 2; // content starts at index 3
		},
		indexToTitle(pageIndex: number): string {
			return getChapterTitles(totalPages)[pageIndex] ?? "";
		},
	};
}

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
	const [hePageSemantics, setHePageSemantics] = useState<PageSemantics | null>(null);
	const [hePageContents, setHePageContents] = useState<(string | null)[]>([]);
	const testParams = useTestParams();
	const flipBookRef = useRef<FlipBookHandle>(null);

	useEffect(() => {
		loadHebrewFont();
	}, []);

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

			// Normalize: no redundant newlines between psukim (single line break only)
			const normalizePsukim = (s: string) => s.replace(/\n{2,}/g, "\n").trim();

			const contentPages = files.map(({ path, content }) => (
				<div key={path} className="he-page bible-page">
					<div className="bible-content">{normalizePsukim(content)}</div>
				</div>
			));

			// Per-page content for PDF export: כריכה, כריכה פנים, שער, content, כריכה אחורית
			const contents: (string | null)[] = [
				"כריכה — ספר בראשית\nמקרא על פי המסורה",
				"כריכה פנים — ספר בראשית\nמקרא על פי המסורה",
				"שער — תוכן העניינים",
				...files.map((f) => normalizePsukim(f.content)),
				"כריכה אחורית\nטקסט מתוך ספריא",
			];

			const totalPages = contentPages.length + 4; // cover + front interior + toc + content + back
			const semantics = createHePageSemantics(totalPages);
			setHePageSemantics(semantics);
			setHePageContents(contents);

			// Build pages: cover, front interior, TOC, content pages, back cover
			const toc = (
				<TocPage
					key="toc"
					onNavigate={(pageIndex) => flipBookRef.current?.goToPage(pageIndex)}
					totalPages={totalPages}
					pageSemantics={semantics}
					heading="תוכן העניינים"
					direction="rtl"
					filter={(entry) => entry.pageIndex > 2 && entry.title.length > 0}
				/>
			);

			const pages = [
				<FrontCover key="front-cover" />,
				<FrontCoverInterior key="front-cover-interior" />,
				toc,
				...contentPages,
				<BackCover key="back-cover" />,
			];

			setHePages(pages);
		};

		loadTextFiles();
	}, []);

	if (hePages.length === 0 || !hePageSemantics) {
		return <div className="loading">טוען...</div>;
	}

	return (
		<>
			<FlipBook
				ref={flipBookRef}
				className="he-book"
				pages={hePages}
				direction="rtl"
				pageSemantics={hePageSemantics}
				of="נ"
				debug={true}
				leavesBuffer={7}
				initialTurnedLeaves={testParams.initialTurnedLeaves}
				fastDeltaThreshold={testParams.fastDeltaThreshold}
			/>
			<Toolbar flipBookRef={flipBookRef} direction="rtl" pageSemantics={hePageSemantics}>
				<div className="flipbook-toolbar-start">
					<FullscreenButton />
					<TocButton tocPageIndex={2} ariaLabel="תוכן העניינים" />
				</div>
				{/* RTL: swap 2 vs 2 — show Last, Next | Indicator | Prev, First (no row-reverse) */}
				<div className="flipbook-toolbar-nav-cluster">
					<LastPageButton />
					<NextButton />
					<PageIndicator />
					<PrevButton />
					<FirstPageButton />
				</div>
				<div className="flipbook-toolbar-end">
					<DownloadDropdown
						onDownloadSefer={async () => {
							const data = exportEntireBookPdf("ספר בראשית", hePages.length, {
								pageContents: hePageContents,
								rtl: true,
								hebrewFontName: getHebrewPdfFontName(),
							});
							return { ext: "pdf", data };
						}}
						onDownloadPageRange={async (pages, semanticPages) =>
							semanticPages.length
								? {
										ext: "pdf",
										data: exportPageRangePdf("ספר בראשית", pages, semanticPages, {
											pageContents: hePageContents,
											rtl: true,
											hebrewFontName: getHebrewPdfFontName(),
										}),
									}
								: null
						}
						entireBookFilename="bereshit"
						rangeFilename="bereshit-pages"
					/>
				</div>
			</Toolbar>
		</>
	);
};

export default HeBook;
