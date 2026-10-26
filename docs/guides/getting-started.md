# Getting Started

## Installation

```bash
# React (includes vanilla as dependency)
npm install html-flip-book-react

# Vanilla JavaScript only
npm install html-flip-book-vanilla
```

## Quick Start with React

```tsx
import { useRef } from 'react';
import { FlipBook } from 'html-flip-book-react';
import { Toolbar, PrevButton, NextButton, PageIndicator } from 'html-flip-book-react/toolbar';
import 'html-flip-book-vanilla/style.css';

function App() {
  const flipBookRef = useRef(null);

  const pages = [
    <div className="page">Cover</div>,
    <div className="page">Page 1</div>,
    <div className="page">Page 2</div>,
    <div className="page">Back Cover</div>,
  ];

  return (
    <div>
      <FlipBook
        ref={flipBookRef}
        pages={pages}
        className="my-book"
        direction="ltr"
      />
      <Toolbar flipBookRef={flipBookRef}>
        <PrevButton />
        <PageIndicator />
        <NextButton />
      </Toolbar>
    </div>
  );
}
```

## Quick Start with Vanilla JavaScript

```typescript
import { FlipBook } from 'html-flip-book-vanilla';
import 'html-flip-book-vanilla/style.css';

// Create the flipbook instance
const flipBook = new FlipBook({
  pagesCount: 10,
  direction: 'ltr',
  leafAspectRatio: { width: 2, height: 3 },
});

// Render into a container
flipBook.render('#book-container');

// Programmatic navigation
await flipBook.flipNext();
await flipBook.flipPrev();
await flipBook.flipToPage(5);
flipBook.jumpToPage(0); // instant, no animation
```

## Browser History and Downloads

Both work out of the box — no configuration needed:

- **History** (`enableHistory`, on by default): the book keeps the URL in sync while
  flipping using the built-in hash mapper — routes look like `#page/4` (or the
  page's semantic name when `pageSemantics` is set, e.g. `#page/%D7%92`). Back/Forward
  restores pages, and opening a deep link jumps straight to the named page. Pass your
  own `historyMapper` to customize the route scheme, or `enableHistory: false` to
  disable URL writes entirely.
- **Download** (`enableDownload`, on by default): `getDownloadConfig()` falls back to a
  built-in config whose "entire book" and "page range" handlers export a JSON index of
  the book's pages (`pageIndex`, `semanticName`, `title`). Pass your own
  `downloadConfig` for richer formats (e.g. PDF), or `enableDownload: false` to
  disable.

## Styling

Import the base styles:

```typescript
import 'html-flip-book-vanilla/style.css';
```

Add your own styles:

```css
.my-book {
  width: 100%;
  max-width: 800px;
  aspect-ratio: 4 / 3;
}

.page {
  padding: 20px;
  background: white;
}
```
