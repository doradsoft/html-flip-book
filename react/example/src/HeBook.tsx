// HeBook.tsx
import { FlipBook, type PageSemantics } from "html-flip-book-react";
import { useMemo } from "react";

const hePageIds = Array.from({ length: 10 }, (_, i) => `he-page-${i}`);
const hePages = hePageIds.map((id) => (
	<div key={id}>
		<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
	</div>
));

const hePageSemanticsDict: Record<number, string> = {
	4: "א",
	5: "ב",
	6: "ג",
};

const hePageSemantics: PageSemantics = {
	indexToSemanticName(pageIndex: number): string {
		return hePageSemanticsDict[pageIndex] ?? "";
	},
	semanticNameToIndex(semanticPageName: string): number | null {
		const entry = Object.entries(hePageSemanticsDict).find(
			([, value]) => value === semanticPageName,
		);
		return entry ? parseInt(entry[0], 10) : null;
	},
	indexToTitle(pageIndex: number): string {
		const chapter = hePageSemanticsDict[pageIndex];
		return chapter ? `פרק ${chapter}` : "";
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
	const testParams = useTestParams();

	return (
		<FlipBook
			className="he-book"
			pages={hePages}
			pageSemantics={hePageSemantics}
			debug={true}
			direction="rtl"
			initialTurnedLeaves={testParams.initialTurnedLeaves}
			fastDeltaThreshold={testParams.fastDeltaThreshold}
		/>
	);
};

export default HeBook;
