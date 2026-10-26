import type { HistoryMapper } from "./flip-book-options";
import type { PageSemantics } from "./page-semantics";

/**
 * Route prefix for the built-in history mapper: `#page/{name}`.
 *
 * A fragment-only route cannot collide with pathname-based SPA routes —
 * the flipbook writes it as `pathname + search + hash`, so pushState stays
 * on the same document and host routers that key off the path see no change.
 * The `page/` segment namespaces the fragment away from anchor links and
 * common `#/...` hash-router schemes.
 */
const ROUTE_PREFIX = "#page/";

/**
 * Built-in {@link HistoryMapper} used when `enableHistory !== false` and no
 * consumer `historyMapper` is provided.
 *
 * Routes look like `#page/4` (zero-based page index) or `#page/%D7%92` when
 * the book has {@link PageSemantics} and the page has a semantic name —
 * semantic names win so deep links show the displayed page number.
 * Parsing tries `semanticNameToIndex` first, then falls back to a plain
 * integer page index. Anything else returns null (no navigation).
 *
 * Consumers can wrap or replace this to customize the scheme:
 * ```typescript
 * const mapper = createDefaultHistoryMapper(pageSemantics);
 * ```
 */
export function createDefaultHistoryMapper(pageSemantics?: PageSemantics): HistoryMapper {
	return {
		pageToRoute: (pageIndex, semantic) => {
			const name = semantic?.semanticName || String(pageIndex);
			return `${ROUTE_PREFIX}${encodeURIComponent(name)}`;
		},
		routeToPage: (route) => {
			const match = route.match(/#page\/([^?#]+)/);
			if (!match) return null;
			let name: string;
			try {
				name = decodeURIComponent(match[1]);
			} catch {
				return null; // malformed percent-escape
			}
			const semanticIndex = pageSemantics?.semanticNameToIndex(name);
			if (semanticIndex != null) return semanticIndex;
			const index = Number(name);
			return Number.isInteger(index) && index >= 0 ? index : null;
		},
	};
}
