/**
 * Defines semantic page naming and titles for a FlipBook.
 *
 * Physical books typically start numbering from page 1 or 2 (after covers),
 * but the internal page index always starts from 0. PageSemantics bridges
 * this gap by providing human-readable page identifiers.
 *
 * Many books use different numbering systems for different sections. For example,
 * academic textbooks and novels often use Roman numerals (i, ii, iii, iv...) for
 * front matter (preface, table of contents, acknowledgments) and Arabic numerals
 * (1, 2, 3...) for the main content. This interface allows you to define such
 * complex numbering schemes.
 *
 * @example
 * ```typescript
 * // Book with Roman numeral front matter and Arabic numeral content
 * const frontMatterPages = 4; // Pages i, ii, iii, iv
 * const bookSemantics: PageSemantics = {
 *   indexToSemanticName: (index) => {
 *     if (index === 0) return ""; // Front cover
 *     if (index <= frontMatterPages) return toRomanNumeral(index); // i, ii, iii, iv
 *     return String(index - frontMatterPages); // 1, 2, 3, 4...
 *   },
 *   semanticNameToIndex: (name) => {
 *     const roman = fromRomanNumeral(name);
 *     if (roman !== null) return roman;
 *     const arabic = parseInt(name, 10);
 *     return isNaN(arabic) ? null : arabic + frontMatterPages;
 *   },
 *   indexToTitle: (index) => chapterTitles[index] ?? "",
 * };
 * ```
 */
export interface PageSemantics {
	/**
	 * Converts a page index to its semantic page name (displayed page number).
	 *
	 * This is used for displaying page numbers to users and for navigation.
	 * Return an empty string for pages that shouldn't display a page number
	 * (e.g., covers, title pages).
	 *
	 * @example
	 * - Index 0 (cover) → "" (no page number)
	 * - Index 1 → "1" or "א" (first numbered page)
	 * - Index 5 → "5" or "ה"
	 */
	indexToSemanticName: (pageIndex: number) => string;

	/**
	 * Converts a semantic page name back to its page index.
	 *
	 * This enables "go to page" functionality where users enter a page number
	 * (like "5" or "ה") and the book navigates to the correct physical page.
	 *
	 * @returns The page index, or null if the semantic name is invalid.
	 *
	 * @example
	 * - "1" or "א" → 1 (first content page after cover)
	 * - "5" or "ה" → 5
	 * - "invalid" → null
	 */
	semanticNameToIndex: (semanticPageName: string) => number | null;

	/**
	 * Gets the title for a page, used in table of contents generation.
	 *
	 * Return an empty string for pages without titles. When building a
	 * table of contents, entries typically fall back to semantic name
	 * if no title is provided.
	 *
	 * @example
	 * - Index 0 → "Front Cover"
	 * - Index 2 → "Introduction"
	 * - Index 5 → "Chapter 2: Getting Started"
	 */
	indexToTitle: (pageIndex: number) => string;
}
