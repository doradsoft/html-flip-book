// EnBook.tsx

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
import Markdown from "react-markdown";
import { exportEntireBookPdf, exportPageRangePdf } from "./pdfExport";
import { mergePdfsFromUrls } from "./pdfMerge";
import {
	TEST_PARAM_FAST_DELTA_THRESHOLD,
	TEST_PARAM_INITIAL_TURNED_LEAVES,
} from "./test-url-params";

const markdownFiles = import.meta.glob("/assets/pages_data/en/content/*.md");

/** Real ebook split: one PDF per chapter under assets. Keys sorted by leading number. */
const enPdfModules = import.meta.glob<string>("/assets/pages_data/en/pdf/*.pdf", {
	query: "?url",
	import: "default",
});
const sortedEnPdfKeys = Object.keys(enPdfModules)
	.filter((k) => /\/\d+-/.test(k))
	.sort((a, b) => {
		const nA = parseInt(a.replace(/^.*\/(\d+)-.*$/, "$1"), 10);
		const nB = parseInt(b.replace(/^.*\/(\d+)-.*$/, "$1"), 10);
		return nA - nB;
	});

async function getEnChapterPdfUrls(): Promise<string[]> {
	const modules = await Promise.all(sortedEnPdfKeys.map((k) => enPdfModules[k]()));
	return modules
		.map((m) => {
			if (typeof m === "string") return m;
			if (m && typeof m === "object" && "default" in m) return (m as { default: string }).default;
			return null;
		})
		.filter((u): u is string => typeof u === "string");
}

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

/** Extract title from first line of markdown (e.g. "# Databases" → "Databases"). */
function titleFromMarkdownFirstLine(firstLine: string): string {
	const trimmed = firstLine.trim();
	if (trimmed.startsWith("#")) return trimmed.replace(/^#+\s*/, "").trim();
	return trimmed;
}

function createEnPageSemantics(
	totalPages: number,
	contentTitles: Record<number, string>,
): PageSemantics {
	const firstContent = 3;
	const lastContent = totalPages - 4;

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
			if (pageIndex === 0) return "Front Cover";
			if (pageIndex === 1) return "";
			if (pageIndex === 2) return ""; // TOC page
			if (pageIndex >= firstContent && pageIndex <= lastContent) {
				return contentTitles[pageIndex] ?? "";
			}
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
			// Sort by path so order is stable (e.g. 000-introduction, 001-databases, ...)
			files.sort((a, b) => a.path.localeCompare(b.path));

			// Content page titles from first line of each markdown (# heading or first line)
			const contentTitles: Record<number, string> = {};
			for (let i = 0; i < files.length; i++) {
				const firstLine = files[i].content.split("\n")[0] ?? "";
				const title = titleFromMarkdownFirstLine(firstLine);
				if (title) contentTitles[3 + i] = title; // content starts at page index 3
			}

			const contentPages = files.map(({ path, content }) => (
				<div key={path} className="en-page">
					<Markdown>{content}</Markdown>
				</div>
			));

			// Per-page content for PDF export: front cover, front interior, TOC, content, back interior, back cover
			const contents: (string | null)[] = [
				"Front Cover — SQL Tutorial\nA Complete Guide to Database Management",
				"Front Cover Interior\nSQL Tutorial — A Complete Guide to Database Management",
				"Table of Contents",
				...files.map((f) => f.content),
				"Back Cover Interior\nMore in This Series",
				"Back Cover — More in This Series\nJavaScript Fundamentals, React Development, Node.js Backend",
			];

			const totalPages = 6 + contentPages.length;
			const semantics = createEnPageSemantics(totalPages, contentTitles);

			const toc = (
				<TocPage
					key="toc"
					onNavigate={(pageIndex: number) => flipBookRef.current?.commands.jumpToPage(pageIndex)}
					totalPages={totalPages}
					pageSemantics={semantics}
					heading="Table of Contents"
					direction="ltr"
					filter={(entry: { pageIndex: number; title: string }) =>
						entry.pageIndex >= 3 && entry.title.length > 0
					}
				/>
			);

			// Add front cover, front interior, TOC, content pages, back interior, back cover
			const pages = [
				<FrontCover key="front-cover" />,
				<div key="front-cover-interior" />,
				toc,
				...contentPages,
				<div key="back-cover-interior" />,
				<BackCover key="back-cover" />,
			];

			setEnPageContents(contents);
			setEnPageSemantics(semantics);
			setEnPages(pages);
		};

		loadMarkdownFiles();
	}, []);

	const containerRef = useRef<HTMLDivElement>(null);

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

	const downloadConfig = useMemo(
		() => ({
			onDownloadSefer: async () => {
				const urls = await getEnChapterPdfUrls();
				const base64 = urls.length ? await mergePdfsFromUrls(urls) : null;
				if (base64) return { ext: "pdf", data: base64 };
				const data = exportEntireBookPdf("SQL Tutorial", enPages.length, {
					pageContents: enPageContents,
					markdownToPlain: true,
				});
				return { ext: "pdf", data };
			},
			onDownloadPageRange: async (pages: number[], semanticPages: SemanticPageInfo[]) => {
				if (!semanticPages.length || pages.length === 0) return null;
				const urls = await getEnChapterPdfUrls();
				const firstContent = 3;
				const lastContent = enPages.length - 4;
				const fromPage = Math.min(...pages);
				const toPage = Math.max(...pages);
				const contentIndices: number[] = [];
				for (let p = fromPage; p <= toPage; p++) {
					if (p >= firstContent && p <= lastContent) {
						contentIndices.push(p - firstContent);
					}
				}
				const urlsToMerge = contentIndices
					.filter((i) => i >= 0 && i < urls.length)
					.map((i) => urls[i]);
				const base64 = urlsToMerge.length > 0 ? await mergePdfsFromUrls(urlsToMerge) : null;
				if (base64) return { ext: "pdf", data: base64 };
				return {
					ext: "pdf",
					data: exportPageRangePdf("SQL Tutorial", pages, semanticPages, {
						pageContents: enPageContents,
						markdownToPlain: true,
					}),
				};
			},
			entireBookFilename: "sql-tutorial",
			rangeFilename: "sql-tutorial-pages",
		}),
		[enPages.length, enPageContents],
	);

	return enPages.length && enPageSemantics ? (
		<div ref={containerRef} className="en-book-wrap">
			<FlipBook
				ref={flipBookRef}
				className="en-book"
				pages={enPages}
				pageSemantics={enPageSemantics}
				tocPageIndex={2}
				debug={true}
				coverConfig={{
					coverIndices: "auto",
				}}
				initialTurnedLeaves={testParams.initialTurnedLeaves}
				fastDeltaThreshold={testParams.fastDeltaThreshold}
				historyMapper={enHistoryMapper}
				downloadConfig={downloadConfig}
			/>
			<Toolbar
				flipBookRef={flipBookRef}
				direction="ltr"
				pageSemantics={enPageSemantics}
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
	) : null;
};

export default EnBook;
