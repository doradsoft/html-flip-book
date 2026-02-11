// EnBook.tsx

import {
	FlipBook,
	type FlipBookHandle,
	type HistoryMapper,
	type PageSemantics,
} from "html-flip-book-react";
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
import Markdown from "react-markdown";
import { exportEntireBookPdf, exportPageRangePdf } from "./pdfExport";

const markdownFiles = import.meta.glob("/assets/pages_data/en/content/*.md");

/** Front cover component */
const FrontCover = () => (
	<div className="cover front-cover">
		<div className="cover-content">
			<div className="cover-decoration top" />
			<h1>SQL Tutorial</h1>
			<p className="subtitle">A Complete Guide to Database Management</p>
			<div className="cover-decoration bottom" />
			<p className="author">Interactive FlipBook</p>
		</div>
	</div>
);

/* Front & back cover interiors are simple blank pages.
   The cover boards are larger than text-block leaves, so they naturally peek
   out behind leaf-sized pages — no synthetic frame element is needed. */

/** Table of contents page */
const TocPageEn = () => (
	<div className="toc-page">
		<h2>Table of Contents</h2>
		<p>Navigate using the toolbar or flip through the book.</p>
	</div>
);

/** Back cover component */
const BackCover = () => (
	<div className="cover back-cover">
		<div className="cover-content">
			<h2>More in This Series</h2>
			<ul className="series-list">
				<li>JavaScript Fundamentals</li>
				<li>React Development</li>
				<li>Node.js Backend</li>
			</ul>
			<div className="cover-decoration" />
			<p className="small">Visit our website for more tutorials</p>
		</div>
	</div>
);

function createEnPageSemantics(totalPages: number): PageSemantics {
	return {
		indexToSemanticName(pageIndex: number): string {
			if (pageIndex <= 1) return ""; // Front cover + front cover interior
			if (pageIndex >= totalPages - 2) return ""; // Back cover interior + back cover
			return String(pageIndex);
		},
		semanticNameToIndex(semanticPageName: string): number | null {
			const num = parseInt(semanticPageName, 10);
			return Number.isNaN(num) ? null : num;
		},
		indexToTitle(pageIndex: number): string {
			// No interior titles for front/back cover in en
			if (pageIndex === 0) return "Front Cover";
			if (pageIndex === totalPages - 1) return "Back Cover";
			return "";
		},
	};
}

interface MarkdownModule {
	default: string;
}

function assertIsMarkdownModule(module: unknown): asserts module is MarkdownModule {
	if (typeof (module as MarkdownModule).default !== "string") {
		throw new Error("Invalid markdown module");
	}
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

export const EnBook = () => {
	const [enPages, setEnPages] = useState<ReactElement[]>([]);
	const [enPageSemantics, setEnPageSemantics] = useState<PageSemantics | null>(null);
	const [enPageContents, setEnPageContents] = useState<(string | null)[]>([]);
	const testParams = useTestParams();
	const flipBookRef = useRef<FlipBookHandle>(null);

	useEffect(() => {
		const loadMarkdownFiles = async () => {
			const files = await Promise.all(
				Object.entries(markdownFiles).map(async ([path, resolver]) => {
					const content = await resolver();
					assertIsMarkdownModule(content);
					return {
						path,
						content: content.default,
					};
				}),
			);
			const contentPages = files.map(({ path, content }) => (
				<div key={path} className="en-page">
					<Markdown>{content}</Markdown>
				</div>
			));

			// Per-page content for PDF export: front cover, front interior, TOC, content, back interior, back cover
			const contents: (string | null)[] = [
				"Front Cover — SQL Tutorial\nA Complete Guide to Database Management",
				"Front Cover Interior\nSQL Tutorial — A Complete Guide to Database Management",
				"Table of Contents\nNavigate using the toolbar or flip through the book.",
				...files.map((f) => f.content),
				"Back Cover Interior\nMore in This Series",
				"Back Cover — More in This Series\nJavaScript Fundamentals, React Development, Node.js Backend",
			];

			// Add front cover, front interior, TOC, content pages, back interior, back cover
			const pages = [
				<FrontCover key="front-cover" />,
				<div key="front-cover-interior" />,
				<TocPageEn key="toc" />,
				...contentPages,
				<div key="back-cover-interior" />,
				<BackCover key="back-cover" />,
			];

			setEnPageContents(contents);
			setEnPageSemantics(createEnPageSemantics(pages.length));
			setEnPages(pages);
		};

		loadMarkdownFiles();
	}, []);

	const enHistoryMapper: HistoryMapper | undefined = useMemo(
		() =>
			enPageSemantics
				? {
						pageToRoute: (pageIndex, semantic) => `#page/${semantic?.semanticName ?? pageIndex}`,
						routeToPage: (route) => {
							const m = route.match(/#page\/(.+)/);
							if (!m) return null;
							const name = m[1];
							const idx = enPageSemantics.semanticNameToIndex(name);
							if (idx !== null) return idx;
							const n = parseInt(name, 10);
							return Number.isNaN(n) ? null : n;
						},
					}
				: undefined,
		[enPageSemantics],
	);

	return enPages.length && enPageSemantics ? (
		<>
			<FlipBook
				ref={flipBookRef}
				className="en-book"
				pages={enPages}
				pageSemantics={enPageSemantics}
				debug={true}
				coverConfig={{
					coverIndices: "auto",
				}}
				initialTurnedLeaves={testParams.initialTurnedLeaves}
				fastDeltaThreshold={testParams.fastDeltaThreshold}
				historyMapper={enHistoryMapper}
			/>
			<Toolbar flipBookRef={flipBookRef} direction="ltr" pageSemantics={enPageSemantics}>
				<div className="flipbook-toolbar-start">
					<FullscreenButton />
					<TocButton tocPageIndex={2} />
				</div>
				<div className="flipbook-toolbar-nav-cluster">
					<FirstPageButton />
					<PrevButton />
					<PageIndicator />
					<NextButton />
					<LastPageButton />
				</div>
				<div className="flipbook-toolbar-end">
					<DownloadDropdown
						onDownloadSefer={async () => {
							const data = exportEntireBookPdf("SQL Tutorial", enPages.length, {
								pageContents: enPageContents,
							});
							return { ext: "pdf", data };
						}}
						onDownloadPageRange={async (pages, semanticPages) =>
							semanticPages.length
								? {
										ext: "pdf",
										data: exportPageRangePdf("SQL Tutorial", pages, semanticPages, {
											pageContents: enPageContents,
										}),
									}
								: null
						}
						entireBookFilename="sql-tutorial"
						rangeFilename="sql-tutorial-pages"
					/>
				</div>
			</Toolbar>
		</>
	) : null;
};

export default EnBook;
