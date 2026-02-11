import type { PageSemantics } from "html-flip-book-vanilla";
import type React from "react";
import "./TocPage.css";

/**
 * Entry in the table of contents.
 */
export interface TocEntry {
	/** Page index to navigate to */
	pageIndex: number;
	/** Display title (from pageSemantics.indexToTitle or custom) */
	title: string;
	/** Semantic page name/number (from pageSemantics.indexToSemanticName) */
	semanticName: string;
}

/**
 * Props for the TocPage component.
 */
export interface TocPageProps {
	/** Callback to navigate to a specific page */
	onNavigate: (pageIndex: number) => void;
	/** Total number of pages in the book */
	totalPages: number;
	/** Page semantics for generating titles and page numbers */
	pageSemantics?: PageSemantics;
	/** Custom heading text. Default: "Table of Contents" */
	heading?: string;
	/** Custom CSS class for the container */
	className?: string;
	/** Reading direction for RTL support */
	direction?: "ltr" | "rtl";
	/**
	 * Filter function to determine which pages appear in TOC.
	 * By default, only pages with a title are included.
	 */
	filter?: (entry: TocEntry, pageIndex: number) => boolean;
	/**
	 * Custom render function for TOC entries.
	 * If not provided, uses default rendering.
	 */
	renderEntry?: (entry: TocEntry, onClick: () => void) => React.ReactNode;
}

/**
 * Default filter: include pages that have a non-empty title.
 */
const defaultFilter = (entry: TocEntry): boolean => entry.title.length > 0;

/**
 * A table of contents page component for FlipBook.
 *
 * Automatically generates TOC entries from pageSemantics, showing pages
 * that have titles. Entries display title with fallback to semantic name,
 * then page index.
 *
 * @example
 * ```tsx
 * <TocPage
 *   onNavigate={(pageIndex) => flipBookRef.current?.commands.flipToPage(pageIndex)}
 *   totalPages={20}
 *   pageSemantics={mySemantics}
 *   heading="Contents"
 *   direction="rtl"
 * />
 * ```
 */
const TocPage: React.FC<TocPageProps> = ({
	onNavigate,
	totalPages,
	pageSemantics,
	heading = "Table of Contents",
	className,
	direction = "ltr",
	filter = defaultFilter,
	renderEntry,
}) => {
	// Generate TOC entries for all pages
	const entries: TocEntry[] = [];
	for (let i = 0; i < totalPages; i++) {
		const title = pageSemantics?.indexToTitle(i) ?? "";
		const semanticName = pageSemantics?.indexToSemanticName(i) ?? "";
		const entry: TocEntry = { pageIndex: i, title, semanticName };

		if (filter(entry, i)) {
			entries.push(entry);
		}
	}

	const renderDefaultEntry = (entry: TocEntry, onClick: () => void) => {
		// Title on one side (left in LTR, right in RTL); semantic name or page index on the other
		const title = entry.title || entry.semanticName || `Page ${entry.pageIndex + 1}`;
		const pageOrSemantic = entry.semanticName || String(entry.pageIndex + 1);

		return (
			<li key={entry.pageIndex}>
				<button type="button" className="toc-link" onClick={onClick}>
					<span className="toc-title">{title}</span>
					<span className="toc-dots" aria-hidden />
					<span className="toc-page-num">{pageOrSemantic}</span>
				</button>
			</li>
		);
	};

	return (
		<div
			className={`toc-page ${className ?? ""}`.trim()}
			style={{ direction, textAlign: direction === "rtl" ? "right" : "left" }}
		>
			<div className="toc-page__scroll">
				<h2 className="toc-heading">{heading}</h2>
				<ul className="toc-list">
					{entries.map((entry) => {
						const onClick = () => onNavigate(entry.pageIndex);
						return renderEntry ? renderEntry(entry, onClick) : renderDefaultEntry(entry, onClick);
					})}
				</ul>
			</div>
		</div>
	);
};

export { TocPage };
