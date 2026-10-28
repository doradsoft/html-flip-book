// Runs inside the browser via locator.evaluate; kept in .mts so spec bodies stay thin.
// Takes the inner pane element and reaches the enclosing scrollport itself so the
// spec can pass this function reference straight to evaluate (no closures serialize).
export function readScrollOwnership(inner: HTMLElement) {
	const port = inner.closest(".flipbook-page-scrollport") as HTMLElement | null;
	return {
		portScrollable: !!port && port.scrollHeight > port.clientHeight + 1,
		portScrollTop: port?.scrollTop ?? 0,
		innerScrollable: inner.scrollHeight > inner.clientHeight + 1,
		innerScrollTop: inner.scrollTop,
		innerOverflow: getComputedStyle(inner).overflowY,
	};
}
