// EnBook.tsx

import { FlipBook, type FlipBookHandle, type PageSemantics } from "html-flip-book-react";
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
import Markdown from "react-markdown";

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

const enPageSemantics: PageSemantics = {
	// Semantic names are displayable page numbers - covers don't have page numbers
	indexToSemanticName(pageIndex: number): string {
		if (pageIndex === 0) return ""; // Front cover - no page number
		return String(pageIndex);
	},
	semanticNameToIndex(semanticPageName: string): number | null {
		const num = parseInt(semanticPageName, 10);
		return Number.isNaN(num) ? null : num;
	},
	// Titles are used for table of contents - only meaningful pages get titles
	indexToTitle(pageIndex: number): string {
		if (pageIndex === 0) return "Front Cover";
		return "";
	},
};

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

			// Add front cover, content pages, and back cover
			const pages = [
				<FrontCover key="front-cover" />,
				...contentPages,
				<BackCover key="back-cover" />,
			];

			setEnPages(pages);
		};

		loadMarkdownFiles();
	}, []);

	return enPages.length ? (
		<>
			<FlipBook
				ref={flipBookRef}
				className="en-book"
				pages={enPages}
				pageSemantics={enPageSemantics}
				debug={true}
				initialTurnedLeaves={testParams.initialTurnedLeaves}
				fastDeltaThreshold={testParams.fastDeltaThreshold}
			/>
			<Toolbar flipBookRef={flipBookRef} direction="ltr">
				<FullscreenButton />
				<FirstPageButton />
				<PrevButton />
				<PageIndicator />
				<NextButton />
				<LastPageButton />
			</Toolbar>
		</>
	) : null;
};

export default EnBook;
