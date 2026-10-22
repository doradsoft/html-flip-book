# Bookmark providers

Bookmark providers add rectangular tabs outside the pages. By default, tabs point perpendicular to their edge and turn with their target leaf. Each tab refers to a zero-based `pageIndex`; clicking it jumps to that page unless the provider supplies its own action.

Bookmarks are disabled by default: set `enableBookmarks: true` in vanilla or `enableBookmarks={true}` in React to enable them. Providing a custom provider does not enable them by itself. When enabled without a custom provider, the built-in provider includes the table of contents and every page with a nonempty title, using the book's `pageSemantics` and `tocPageIndex`. This matches `TocPage`'s default title filter; a custom `TocPage.filter` does not change the bookmark provider.

Configured cover pages are excluded. The built-in provider includes the entire table of contents, with one shared bookmark for each pair of facing pages. Brief content combines meaningful short titles from `pageSemantics.indexToShortTitle`, falling back to full titles from `indexToTitle`. Expanded content combines the full titles and shows the actual semantic page range as secondary information.

The example app includes **LTR → Bookmarks** and **RTL → Bookmarks**, using the same SQL tutorial and Hebrew book as the other examples. Their covers, shadows, history, downloads, toolbar, and page buffering are preserved. They start with custom compact HTML for every table of contents entry, using the book's short titles. The **Provider** control also offers the built-in table of contents provider. Custom controls configure placement, orientation, attachment, ordering, actions, and showing only upcoming chapters.

Short and full titles belong to the book's page metadata, independently of its bookmark provider. Consumers can reuse them in other UI. For example, `indexToShortTitle` may return `SQL syntax` while `indexToTitle` returns `Basic syntax and querying relational data` for the same page. The example's custom provider renders this metadata as HTML in both reading directions.

## React

Keep the provider stable with `useMemo`. `renderBookmark` returns React content; the library supplies the surrounding button, accessible label, and navigation behavior.

```tsx
import { useMemo, useRef } from "react";
import {
  FlipBook,
  type Bookmark,
  type BookmarkProvider,
  type FlipBookHandle,
} from "html-flip-book-react";
import "html-flip-book-vanilla/style.css";

const chapters: Bookmark[] = [
  { id: "intro", pageIndex: 0, label: "Introduction" },
  {
    id: "databases",
    pageIndex: 4,
    label: "Databases",
    className: "database-tab",
    data: { chapterId: "databases" },
  },
];

export function ChapterBook({ pages }: { pages: React.ReactNode[] }) {
  const book = useRef<FlipBookHandle>(null);
  const bookmarkProvider = useMemo<BookmarkProvider>(() => ({
    getBookmarks: () => chapters,
    placement: "sides",
    className: "chapter-tabs",
    renderBookmark: (bookmark) => <strong>{bookmark.label}</strong>,
    renderExpandedBookmark: (bookmark) => (
      <span><strong>{bookmark.label}</strong><small>Open this chapter</small></span>
    ),
  }), []);

  return (
    <FlipBook
      ref={book}
      className="chapter-book"
      pages={pages}
      direction="ltr"
      enableBookmarks
      bookmarkProvider={bookmarkProvider}
    />
  );
}
```

Use `direction="rtl"` for a right-to-left book. The provider receives the reading direction alongside the current position.

To let a reader show or hide bookmarks, keep `enableBookmarks` in React state. `BookmarkToggleButton` from `html-flip-book-react/toolbar` takes `enabled` and `onChange` props; pass the same state to `FlipBook.enableBookmarks`. Toggling visibility keeps the current spread. Both Bookmarks and Comprehensive examples include this control.

## Vanilla

The same provider contract is available from `html-flip-book-vanilla`. Its renderer returns an `HTMLElement` or a text string. Strings are rendered as text rather than interpreted as HTML.

```ts
import { FlipBook, type BookmarkProvider } from "html-flip-book-vanilla";

const bookmarkProvider: BookmarkProvider = {
  getBookmarks: () => [
    { id: "intro", pageIndex: 0, label: "Introduction" },
    { id: "chapter-two", pageIndex: 4, label: "Chapter two" },
  ],
  placement: "top",
  renderBookmark: (bookmark) => {
    const label = document.createElement("span");
    label.textContent = bookmark.label;
    return label;
  },
};

const book = new FlipBook({ pagesCount: 12, enableBookmarks: true, bookmarkProvider });
book.render(".my-book");
```

## Orientation and expanded content

`orientation: "perpendicular"` is the default: the rectangle's long axis extends out from the page edge. Set `orientation: "parallel"` for tabs whose long axis runs along the edge.

`renderBookmark` supplies the brief content shown at rest. Supply `renderExpandedBookmark` to show richer content when the tab is hovered or receives keyboard focus. A slot conceals the inner portion of a fixed-size strip. Hover slides that same button along its long axis to reveal the full strip; its dimensions, font, and padding stay unchanged. The revealed position is constrained to the viewport. Parallel tabs move past neighboring tabs when space permits; a crowded viewport may require overlap. Reduced motion skips the animation. Both renderers return React content in the React package, or an `HTMLElement` or text string in the vanilla package.

```tsx
const bookmarkProvider = useMemo<BookmarkProvider>(() => ({
  getBookmarks: () => chapters,
  orientation: "perpendicular",
  renderBookmark: (bookmark) => <b>{bookmark.label}</b>,
  renderExpandedBookmark: (bookmark) => (
    <span className="chapter-preview">
      <strong>{bookmark.label}</strong>
      <small>Page {bookmark.pageIndex + 1}</small>
    </span>
  ),
}), []);
```

The button keeps its `label` as its accessible name in either state. Keep both brief and expanded content noninteractive; the surrounding button handles activation.

In the default page-turn mode, dragging a bookmark turns the current page, just like dragging page text or a TOC link. Releasing a drag does not also activate the bookmark. A normal click opens the target spread or invokes `onClick`. Text-selection mode preserves selection without starting a page turn.

## Turn with the leaf or stay pinned

`attachment: "leaf"` is the default. A bookmark follows the leaf carrying the start of its facing spread, including folding and settling back after a canceled drag. Set `attachment: "pinned"` to keep tabs on the book's resting edge while pages turn.

With leaf attachment, `left` and `right` show only tabs whose target leaves currently occupy that side. Those tabs follow their leaf while it turns and disappear from that rail when the turn finishes on the opposite side. Use `sides` to keep tabs available on both sides, or pinned attachment to keep every tab on a fixed left-only or right-only rail.

```ts
const bookmarkProvider: BookmarkProvider = {
  getBookmarks: () => chapters,
  attachment: "pinned",
};
```

## Position and order

`placement` names physical edges, so changing reading direction does not rename `left` and `right`.

| Value | Placement |
| --- | --- |
| `top` | Along the upper edge |
| `bottom` | Along the lower edge |
| `sides` | Split between the left and right edges |
| `left` | Along the left edge |
| `right` | Along the right edge |
| `top-bottom` | Split between the upper and lower edges |

The first three options suit a horizontal book; the remaining three provide the corresponding physical edges for a vertical arrangement. These options position the tabs; they do not change the book's page-turn axis.

Bookmarks sort by their target page by default. Side rails run from top to bottom. Pinned top/bottom rails run from left to right. Leaf-attached top/bottom tabs occupy their own leaf's half and run outward from the spine, keeping each tab on the same material point throughout a turn. With `placement: "top-bottom"`, leaf-attached tabs split by sorted order: the first half goes on top and the remainder on the bottom, preserving each tab's vertical edge when its leaf turns. Pinned tabs use the current turned-leaf split instead. Use `order: "reverse-page"` to reverse that order, or pass a comparator for custom ordering:

```ts
const bookmarkProvider: BookmarkProvider = {
  getBookmarks: () => chapters,
  order: (a, b) => a.label.localeCompare(b.label),
};
```

Tabs occupy separate slots along each rail. When they cannot all fit, that rail scrolls instead of stacking tabs on top of each other.

There is at most one bookmark per facing spread: pages `1–2`, `3–4`, and so on, with page `0` standing alone. For example, `DELETE` on page index `13` and `JOIN` on page index `14` share a bookmark; `UPDATE` on page index `12` belongs to the preceding spread. These are facing pages in the open book, rather than the two sides of one physical leaf.

Return one bookmark object for that spread, combining its short HTML and full HTML as needed. If a custom provider returns several entries for the same spread, the first in its configured order is used. Its `pageIndex` targets the odd starting page, except that a spread containing the table of contents targets the actual TOC page. The default provider exposes the included page indices through `bookmark.data.pageIndices`. The custom example also includes this metadata. The same original bookmark object and `data` are passed unchanged to rendering and click callbacks.

Keyboard Tab traversal follows the configured bookmark order across rails. At either end it leaves the bookmark navigation for the surrounding controls or page content.

## Use the current page

`getBookmarks` receives `{ currentPageIndex, currentLeafIndex, direction }` and runs again after navigation. Both indices are zero-based; `currentLeafIndex` is `Math.floor(currentPageIndex / 2)`.

```ts
const bookmarkProvider: BookmarkProvider = {
  getBookmarks: ({ currentPageIndex }) =>
    chapters.filter((bookmark) => bookmark.pageIndex >= currentPageIndex),
};
```

Supply stable, unique bookmark `id` values and a `label` for the button's accessible name. `data` can hold any consumer-specific value. Keep rendered content noninteractive because it is already inside a button.

## Custom click actions

Providing `onClick` replaces the default jump. It receives the current leaf index and the same bookmark object returned by `getBookmarks`, including its `data` value. Navigate explicitly if the action should also turn or jump to the target page.

```tsx
const bookmarkProvider = useMemo<BookmarkProvider>(() => ({
  getBookmarks: () => chapters,
  onClick: (currentLeafIndex, bookmark) => {
    recordBookmarkSelection(currentLeafIndex, bookmark.data);
    book.current?.jumpToPage(bookmark.pageIndex);
  },
}), []);
```

## Style overrides

`provider.className` is added to the bookmark root. Each bookmark's `className` is added to its button. Override the library CSS from your application stylesheet, as with other flipbook UI.

During expansion, the original button temporarily moves into a wrapper under `document.body` so page clipping cannot hide it. A placeholder preserves its rail slot. The `.flipbook-bookmark-preview` wrapper receives the provider class, and the button retains the bookmark's class plus `.flipbook-bookmark--expanded`. Use these classes to style it without depending on the book being an ancestor. The open wrapper matches `.flipbook-bookmark-preview[data-open="true"]`; the full content wrapper is `.flipbook-bookmark__expanded-content`.

```css
.chapter-book {
  --flipbook-bookmark-depth: 56px;
  --flipbook-bookmark-length: 26px;
  --flipbook-bookmark-gap: 6px;
  --flipbook-bookmark-full-length: 320px;
}

.chapter-tabs .flipbook-bookmark {
  border-radius: 3px;
  background: #e3cf9b;
  color: #233c2f;
}

.chapter-tabs .database-tab {
  background: #bed2a3;
}

.chapter-tabs .flipbook-bookmark:focus-visible {
  outline: 3px solid #233c2f;
  outline-offset: 2px;
}

.chapter-tabs .flipbook-bookmark__expanded-content strong,
.chapter-tabs .flipbook-bookmark__expanded-content small {
  display: block;
}
```

The sizing variables name physical dimensions relative to the edge:

| CSS variable | Perpendicular default | Parallel default | Purpose |
| --- | --- | --- | --- |
| `--flipbook-bookmark-depth` | `52px` | `28px` | Exposed outward distance from the edge |
| `--flipbook-bookmark-length` | `24px` | `72px` | Exposed size along the edge |
| `--flipbook-bookmark-gap` | `4px` | `4px` | Space between tabs |
| `--flipbook-bookmark-full-length` | `220px` | `220px` | Fixed full strip length, capped to the viewport before hovering |

The book reserves tab depth in its layout. Rail selectors are `.flipbook-bookmarks__rail[data-edge="top"]` (also `right`, `bottom`, and `left`); the brief content wrapper is `.flipbook-bookmark__content`.
