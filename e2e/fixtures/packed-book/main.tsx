import { FlipBook, type FlipBookHandle, TocPage } from "html-flip-book-react";
import {
	DownloadDropdown,
	NextButton,
	PageIndicator,
	PrevButton,
	Toolbar,
} from "html-flip-book-react/toolbar";
import { createRoot } from "react-dom/client";
import "html-flip-book-react/styles.css";
import { useRef } from "react";

function Book({ direction }: { direction: "ltr" | "rtl" }) {
	const ref = useRef<FlipBookHandle>(null);
	const pages = [
		<div key="cover" className="fixture-cover">
			Cover
		</div>,
		<TocPage
			key="toc"
			onNavigate={(i) => ref.current?.jumpToPage(i)}
			totalPages={5}
			direction={direction}
		/>,
		...[2, 3, 4].map((n) => (
			<div key={n} className="fixture-page">
				Page {n}
			</div>
		)),
		<div key="back" className="fixture-cover">
			Back
		</div>,
	];
	return (
		<div className="book-wrap" data-dir={direction} style={{ direction }}>
			{/* The wrapper selects its container by the first class token, so
			each book on the page needs a unique className. */}
			<FlipBook
				ref={ref}
				pages={pages}
				className={`fixture-book-${direction}`}
				direction={direction}
				enableHistory={false}
			/>
			<Toolbar flipBookRef={ref} direction={direction}>
				<PrevButton />
				<PageIndicator />
				<NextButton />
				<DownloadDropdown />
			</Toolbar>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("missing #root");
createRoot(rootEl).render(
	<>
		<Book direction="ltr" />
		<Book direction="rtl" />
	</>,
);
