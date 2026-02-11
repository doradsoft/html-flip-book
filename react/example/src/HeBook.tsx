// HeBook.tsx

import { toLetters, toNumber } from "gematry";
import {
	FlipBook,
	type FlipBookHandle,
	type HistoryMapper,
	type PageSemantics,
	TocPage,
} from "html-flip-book-react";
import {
	DownloadDropdown,
	FirstPageButton,
	FullscreenButton,
	LastPageButton,
	NextButton,
	PageIndicator,
	PrevButton,
	type SemanticPageInfo,
	TocButton,
	Toolbar,
} from "html-flip-book-react/toolbar";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { exportEntireBookPdf, exportPageRangePdf } from "./pdfExport";
import { getHebrewPdfFontName, loadHebrewFont } from "./pdfHebrewFont";
import {
	TEST_PARAM_FAST_DELTA_THRESHOLD,
	TEST_PARAM_INITIAL_TURNED_LEAVES,
} from "./test-url-params";

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

/* Front & back cover interiors are simple blank pages.
   The cover boards are larger than text-block leaves, so they naturally peek
   out behind leaf-sized pages — no synthetic frame element is needed. */

/** Back cover: no writing. */
const BackCover = () => (
	<div className="cover back-cover he-cover">
		<div className="cover-content" />
	</div>
);

// Page titles for non-content pages. שער = page after cover (e.g. TOC)
const getSpecialPageTitles = (_totalPages: number): Record<number, string> => ({
	0: "כריכה", // Front cover
	2: "שער", // Page after cover (e.g. TOC)
});

/** Extract semantic title from first line: part after " — " (e.g. "פרק א' — בריאת העולם" → "בריאת העולם"). */
function titleFromFirstLine(firstLine: string): string {
	const sep = " — ";
	const i = firstLine.indexOf(sep);
	return i >= 0 ? firstLine.slice(i + sep.length).trim() : firstLine.trim();
}

function createHePageSemantics(
	totalPages: number,
	perekTitles: Record<number, string>,
): PageSemantics {
	const specialTitles = getSpecialPageTitles(totalPages);
	const firstContent = 3;
	const lastContent = totalPages - 4;

	return {
		indexToSemanticName(pageIndex: number): string {
			if (pageIndex <= 2) return ""; // כריכה, כריכה פנים, שער
			if (pageIndex >= totalPages - 3) return ""; // last blank, back interior, back cover
			return toLetters(pageIndex - 2, { addQuotes: true }); // content pages after cover, interior, toc
		},
		semanticNameToIndex(semanticPageName: string): number | null {
			const num = toNumber(semanticPageName);
			if (num === 0) return null;
			return num + 2; // content starts at index 3
		},
		indexToTitle(pageIndex: number): string {
			if (pageIndex >= firstContent && pageIndex <= lastContent) {
				const perekNum = pageIndex - 2;
				const title = perekTitles[perekNum];
				return title ?? `פרק ${toLetters(perekNum, { addQuotes: true })}`;
			}
			return specialTitles[pageIndex] ?? "";
		},
	};
}

/** Parse URL parameters for test configuration */
function useTestParams() {
	return useMemo(() => {
		const params = new URLSearchParams(window.location.search);
		const initialTurnedLeaves = params.get(TEST_PARAM_INITIAL_TURNED_LEAVES);
		const fastDeltaThreshold = params.get(TEST_PARAM_FAST_DELTA_THRESHOLD);

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
	const containerRef = useRef<HTMLDivElement>(null);

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

			// Semantic page titles: part after " — " on first line of each asset
			const perekTitles: Record<number, string> = {};
			for (let i = 0; i < files.length; i++) {
				const firstLine = files[i].content.split("\n")[0]?.trim() ?? "";
				const title = titleFromFirstLine(firstLine);
				if (title) perekTitles[i + 1] = title;
			}

			// Normalize: no redundant newlines between psukim (single line break only)
			const normalizePsukim = (s: string) => s.replace(/\n{2,}/g, "\n").trim();

			const contentPages = files.map(({ path, content }) => (
				<div key={path} className="he-page bible-page">
					<div className="bible-content">{normalizePsukim(content)}</div>
				</div>
			));

			// Per-page content for PDF export: cover, front interior, toc, content, blank, back interior, back cover
			const contents: (string | null)[] = [
				"כריכה — ספר בראשית\nמקרא על פי המסורה",
				"", // front interior (no text)
				"שער — תוכן העניינים",
				...files.map((f) => normalizePsukim(f.content)),
				"", // last blank page
				"", // back interior (no titles)
				"", // back cover (no writing)
			];

			const totalPages = contentPages.length + 6; // cover + front interior + toc + content + blank + back interior + back cover
			const semantics = createHePageSemantics(totalPages, perekTitles);
			setHePageSemantics(semantics);
			setHePageContents(contents);

			// Build pages: cover, front interior, TOC, content, back interior, back cover
			const toc = (
				<TocPage
					key="toc"
					onNavigate={(pageIndex) => flipBookRef.current?.commands.jumpToPage(pageIndex)}
					totalPages={totalPages}
					pageSemantics={semantics}
					heading="תוכן העניינים"
					direction="rtl"
					filter={(entry) => entry.pageIndex > 2 && entry.title.length > 0}
				/>
			);

			const pages = [
				<FrontCover key="front-cover" />,
				<div key="front-cover-interior" />,
				toc,
				...contentPages,
				<div key="last-blank" />,
				<div key="back-cover-interior" />,
				<BackCover key="back-cover" />,
			];

			setHePages(pages);
		};

		loadTextFiles();
	}, []);

	const heHistoryMapper: HistoryMapper | undefined = useMemo(
		() =>
			hePageSemantics
				? {
						pageToRoute: (pageIndex, semantic) => `#page/${semantic?.semanticName ?? pageIndex}`,
						routeToPage: (route) => {
							const m = route.match(/#page\/(.+)/);
							if (!m) return null;
							const name = m[1];
							const semantics = hePageSemantics;
							const idx = semantics ? semantics.semanticNameToIndex(name) : null;
							if (idx !== null) return idx;
							const n = parseInt(name, 10);
							return Number.isNaN(n) ? null : n;
						},
					}
				: undefined,
		[hePageSemantics],
	);

	const heDownloadConfig = useMemo(
		() => ({
			onDownloadSefer: async () => {
				await loadHebrewFont();
				const total = hePages.length;
				const opts = {
					pageContents: hePageContents,
					rtl: true,
					hebrewFontName: getHebrewPdfFontName(),
				};
				try {
					const data = exportEntireBookPdf("ספר בראשית", total, opts);
					return { ext: "pdf", data };
				} catch (e) {
					console.error("Hebrew entire-book PDF export failed:", e);
					const data = exportEntireBookPdf("ספר בראשית", total, {
						rtl: true,
						hebrewFontName: getHebrewPdfFontName(),
					});
					return { ext: "pdf", data };
				}
			},
			onDownloadPageRange: async (pages: number[], semanticPages: SemanticPageInfo[]) => {
				if (!semanticPages.length) return null;
				await loadHebrewFont();
				const opts = {
					pageContents: hePageContents,
					rtl: true,
					hebrewFontName: getHebrewPdfFontName(),
				};
				try {
					const data = exportPageRangePdf("ספר בראשית", pages, semanticPages, opts);
					return { ext: "pdf", data };
				} catch (e) {
					console.error("Hebrew range PDF export failed:", e);
					const data = exportPageRangePdf("ספר בראשית", pages, semanticPages, {
						rtl: true,
						hebrewFontName: getHebrewPdfFontName(),
					});
					return { ext: "pdf", data };
				}
			},
			entireBookFilename: "bereshit",
			rangeFilename: "bereshit-pages",
		}),
		[hePages.length, hePageContents],
	);

	if (hePages.length === 0 || !hePageSemantics) {
		return <div className="loading">טוען...</div>;
	}

	return (
		<div ref={containerRef} className="he-book-wrap">
			<FlipBook
				ref={flipBookRef}
				className="he-book"
				pages={hePages}
				direction="rtl"
				pageSemantics={hePageSemantics}
				of="נ"
				tocPageIndex={2}
				debug={true}
				leavesBuffer={7}
				coverConfig={{
					coverIndices: "auto",
				}}
				initialTurnedLeaves={testParams.initialTurnedLeaves}
				fastDeltaThreshold={testParams.fastDeltaThreshold}
				historyMapper={heHistoryMapper}
				downloadConfig={heDownloadConfig}
			/>
			<Toolbar
				flipBookRef={flipBookRef}
				direction="rtl"
				pageSemantics={hePageSemantics}
				fullscreenTargetRef={containerRef}
			>
				<div className="flipbook-toolbar-start">
					<FullscreenButton />
					<TocButton />
				</div>
				<div className="flipbook-toolbar-nav-cluster">
					<FirstPageButton />
					<PrevButton />
					<PageIndicator />
					<NextButton />
					<LastPageButton />
				</div>
				<div className="flipbook-toolbar-end">
					<DownloadDropdown />
				</div>
			</Toolbar>
		</div>
	);
};

export default HeBook;
