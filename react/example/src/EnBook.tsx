// EnBook.tsx

import { FlipBook, type FlipBookHandle } from "html-flip-book-react";
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
			const pages = files
				// To avoid having an empty page at the end
				.concat([{ path: "", content: "" }])
				.map(({ path, content }) => (
					<div key={path || "empty-page"} className="en-page">
						<Markdown>{content}</Markdown>
					</div>
				));

			setEnPages(pages);
		};

		loadMarkdownFiles();
	}, []);

	return enPages.length ? (
		<div className="en-book-container">
			<FlipBook
				ref={flipBookRef}
				className="en-book"
				pages={enPages}
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
		</div>
	) : null;
};

export default EnBook;
