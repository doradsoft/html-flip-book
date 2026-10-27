# Examples

## LTR Book (English)

[**Live Demo →**](https://doradsoft.github.io/html-flip-book/)

```tsx
import { useRef } from 'react';
import { FlipBook } from 'html-flip-book-react';
import { Toolbar, PrevButton, NextButton, PageIndicator } from 'html-flip-book-react/toolbar';
import 'html-flip-book-vanilla/style.css';

function EnglishBook() {
  const flipBookRef = useRef(null);

  const pages = [
    <div className="cover front">My Book</div>,
    <div className="page">Chapter 1: Introduction</div>,
    <div className="page">Lorem ipsum dolor sit amet...</div>,
    <div className="page">Chapter 2: Getting Started</div>,
    <div className="page">More content here...</div>,
    <div className="cover back">The End</div>,
  ];

  return (
    <div className="book-container">
      <FlipBook
        ref={flipBookRef}
        pages={pages}
        className="english-book"
        direction="ltr"
        pageSemantics={{
          frontCover: 0,
          backCover: pages.length - 1,
        }}
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

## RTL Book (Hebrew/Arabic)

```tsx
function HebrewBook() {
  const flipBookRef = useRef(null);

  const pages = [
    <div className="cover front" dir="rtl">הספר שלי</div>,
    <div className="page" dir="rtl">פרק א': הקדמה</div>,
    <div className="page" dir="rtl">תוכן נוסף כאן...</div>,
    <div className="cover back" dir="rtl">סוף</div>,
  ];

  return (
    <div className="book-container" dir="rtl">
      <FlipBook
        ref={flipBookRef}
        pages={pages}
        className="hebrew-book"
        direction="rtl"
      />
      <Toolbar flipBookRef={flipBookRef}>
        <NextButton /> {/* Note: order reversed for RTL */}
        <PageIndicator />
        <PrevButton />
      </Toolbar>
    </div>
  );
}
```

### Key Differences for RTL

1. Set `direction="rtl"` on the FlipBook
2. Reverse toolbar button order (Next before Prev)
3. Add `dir="rtl"` to content for proper text alignment

## Hold hotkeys and toggle actions

`MouseModeButton` uses `toggleTextSelectionCommand`. Turn selection on, then hold
**Ctrl** to temporarily turn pages with the mouse. Releasing Ctrl restores the
previous mode. Its toolbar button reflects the forced state and is disabled during
the hold. Temporary changes do not overwrite `mouseModeStorageKey`.

The demo has dedicated **Hold hotkeys** items for LTR and RTL, and both
**Comprehensive** examples support the same behavior.

Existing commands remain ordinary actions. For a custom toggle, declare
`kind: "toggle"`, `isActive(context)`, and `setActive(context, active)` alongside
`execute(context)`. A `ToggleButton` reads that command's state automatically.
Register custom commands with `Toolbar`'s `commands` prop.

```tsx
import {
  MouseModeButton, Toolbar, toggleTextSelectionCommand,
} from 'html-flip-book-react/toolbar';

<Toolbar
  flipBookRef={flipBookRef}
  commandOptions={{
    [toggleTextSelectionCommand.id]: {
      hotkeys: [
        { key: 'Control', mode: 'hold', active: false },
        { key: 's', modifiers: { alt: true }, mode: 'press' },
      ],
    },
  }}
>
  <MouseModeButton />
</Toolbar>
```

`mode: "press"` (the default) executes normally. `mode: "hold"` forces `active`
(default `true`) until the key or a required modifier is released. Holds also
restore on window blur, a hidden document, disabled/removed bindings, and provider
unmount. Hotkeys ignore text inputs and editable content. Custom setters should
honor `context.transient` to avoid persisting a temporary state. Hold bindings on
ordinary action commands are ignored.

## Styling Examples

```css
.book-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.english-book,
.hebrew-book {
  width: 100%;
  max-width: 900px;
}

.cover {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
}

.cover.front {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.page {
  padding: 40px;
  background: #fff;
  font-family: Georgia, serif;
  line-height: 1.6;
}
```
