# Bookmark providers

Bookmark providers add rectangular tabs outside the pages. They work independently of the page content and remain available while the book turns. Each tab refers to a zero-based `pageIndex`; clicking it jumps to that page unless the provider supplies its own action.

The example app includes **LTR → Bookmarks** and **RTL → Bookmarks**, with controls for placement, ordering, actions, and showing only upcoming chapters.

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
    id: "gardens",
    pageIndex: 4,
    label: "Gardens",
    className: "garden-tab",
    data: { chapterId: "gardens" },
  },
];

export function ChapterBook({ pages }: { pages: React.ReactNode[] }) {
  const book = useRef<FlipBookHandle>(null);
  const bookmarkProvider = useMemo<BookmarkProvider>(() => ({
    getBookmarks: () => chapters,
    placement: "sides",
    className: "chapter-tabs",
    renderBookmark: (bookmark) => <span>{bookmark.label}</span>,
  }), []);

  return (
    <FlipBook
      ref={book}
      className="chapter-book"
      pages={pages}
      direction="ltr"
      bookmarkProvider={bookmarkProvider}
    />
  );
}
```

Use `direction="rtl"` for a right-to-left book. The provider receives the reading direction alongside the current position.

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

const book = new FlipBook({ pagesCount: 12, bookmarkProvider });
book.render(".my-book");
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

Bookmarks sort by their target page by default, running left to right on horizontal rails and top to bottom on side rails. Use `order: "reverse-page"` to reverse that order, or pass a comparator for custom ordering:

```ts
const bookmarkProvider: BookmarkProvider = {
  getBookmarks: () => chapters,
  order: (a, b) => a.label.localeCompare(b.label),
};
```

Tabs occupy separate slots along each rail. When they cannot all fit, that rail scrolls instead of stacking tabs on top of each other.

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

```css
.chapter-book {
  --flipbook-bookmark-depth: 30px;
  --flipbook-bookmark-length: 90px;
  --flipbook-bookmark-gap: 6px;
}

.chapter-tabs .flipbook-bookmark {
  border-radius: 3px;
  background: #e3cf9b;
  color: #233c2f;
}

.chapter-tabs .garden-tab {
  background: #bed2a3;
}

.chapter-tabs .flipbook-bookmark:focus-visible {
  outline: 3px solid #233c2f;
  outline-offset: 2px;
}
```

`depth` controls how far tabs extend from an edge; `length` controls their size along that edge. The book reserves the tab depth in its layout. Rail selectors are `.flipbook-bookmarks__rail[data-edge="top"]` (also `right`, `bottom`, and `left`); the inner content wrapper is `.flipbook-bookmark__content`.
