/** Default TOC page index when store not set (e.g. after front/back + soft covers). */
const DEFAULT_TOC_PAGE_INDEX = 4;

/** Book-level store for TOC page index. Populated by book constructor / config layer. */
let tocPageIndexStore = DEFAULT_TOC_PAGE_INDEX;

export function getTocPageIndex(): number {
	return tocPageIndexStore;
}

export function setTocPageIndex(index: number): void {
	tocPageIndexStore = index;
}
