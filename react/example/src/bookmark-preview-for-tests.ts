// Test hook for e2e specs: lets them instantiate the preview class in-page.
// The class is internal to the library, so the bridge imports it by path
// rather than widening the package's public exports.
import { BookmarkPreview } from "../../../base/src/bookmark-preview";

declare global {
	interface Window {
		__BookmarkPreview?: typeof BookmarkPreview;
	}
}

window.__BookmarkPreview = BookmarkPreview;
