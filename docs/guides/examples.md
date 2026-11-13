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

## Vertical spiral calendar (top-bound)

`flipAxis="vertical"` turns sheets **upward over a top binding** instead of
around a side spine — the model for desk/wall calendars. Page content stays
upright; `direction` still controls reading/text direction independently, so an
RTL Hebrew calendar works unchanged.

```tsx
<FlipBook
  ref={flipBookRef}
  pages={monthPages}
  className="calendar-book"
  flipAxis="vertical"
  bindingSize={20}   // thickness of the decorative spiral overlay, in pixels
  direction="rtl"   // Hebrew calendar content
  leafAspectRatio={{ width: 8, height: 5 }}
  coverAspectRatio={{ width: 8, height: 5 }}
/>
```

- The book splits vertically at the binding: the **lower half** is the live
  sheet stack, the **upper half** collects turned sheets.
- A decorative coil is drawn across the seam via `.flipbook--vertical::before`
  (positioned with `--flipbook-binding-y`, `--flipbook-binding-left`,
  `--flipbook-binding-width`, `--flipbook-binding-size` and
  `--flipbook-binding-z-index`). It spans the sheet stack and stays above the
  moving faces. Hide or restyle it with CSS. Reserve enough container height
  for both stacks; landscape sheets keep a complete calendar legible on phones.
- **Gesture policy:** lift the unturned sheet's **lower free edge** (bottom
  ~22%) upward to advance. Pull the turned sheet's **upper free edge** (top
  ~22%, above the binding) down to return. Drags elsewhere keep native scrolling and content
  interaction; links/buttons can opt out entirely with
  `data-flipbook-no-flip`. Scrolls can chain to the surrounding document at the
  content boundary. Keyboard and toolbar buttons provide the same navigation
  without gestures. The demo binds **ArrowUp** to next and **ArrowDown** to
  previous using `Toolbar.commandOptions`; default horizontal hotkeys remain unchanged.
- `bindingSize` is ignored when `flipAxis` is `"horizontal"` (the default).

**Live demo:** the gallery's **Vertical → Spiral Calendar** item
(`/?example=vertical-calendar`) renders a combined Hebrew/Gregorian calendar —
each sheet is one Hebrew month with Hebrew day numerals and the matching
Gregorian dates in the same grid, month names for both calendars, two-digit
years, Adar I/II leap-year sheets, and clickable date links.

The engine retains its two-faces-per-leaf indexing. For a calendar with one
month per turn, supply **front cover, blank reverse, month, blank reverse,
month, blank reverse, …**, ending in a back cover. Put months on the even
front indices `2, 4, 6, …`; putting consecutive months on both faces would
show one above the binding and the next below it. At rest after a turn,
`currentPageIndex` names the upper reverse (`1, 3, 5, …`), and the following
even index is the active lower month. `onPageFlipping` / `onPageFlipped`
report this same `[reverse, front]` pair. Jump to a month's even index with
`jumpToPage` (instant) or `flipToPage` (animated); `restorePage` restores a
history entry without writing another one. First/last turns are bounded,
and an unpaired final front cannot turn into a nonexistent reverse.

The demo uses `PageSemantics` to name only month fronts, so its toolbar shows
one month name instead of a pair of physical face numbers. Its month picker
demonstrates instant navigation, and its buffer keeps adjacent sheets mounted.
Covered vertical faces are inert and hidden from assistive technology. Focus
on navigation controls stays in place, and reduced-motion turns settle without
an animation delay. Use `flipbook-page-bounded` on the month root to keep the
complete grid within the sheet instead of creating a scrollable month.

Visible labels use named months and exactly two year digits, including
`December 26 – January 27` across the civil year boundary. Conversion retains
full years, exposed through `data-hebrew-year`, accessible table/date labels,
and local civil-date identifiers. The fixture covers both Adars in 5787 and
the transition to Tishrei 5788. See `VerticalCalendar.tsx` and `calendar-model.ts`
in the example source for the complete integration.

## Hold hotkeys and toggle actions

`MouseModeButton` uses `toggleTextSelectionCommand`. Turn selection on, then hold
**Ctrl** to temporarily turn pages with the mouse. Releasing Ctrl restores the
previous mode. Its toolbar button reflects the forced state and is disabled during
the hold. Temporary changes do not overwrite `mouseModeStorageKey`.

Ctrl activates page turning even when page text is already selected. That existing
selection remains available to native **Ctrl+C** until the first primary mouse
press on a page clears it and blocks new text selection for the turning gesture.

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
