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
