# Page scrollbars

Books place each page's main scrollbar beside the spine. In an LTR book, even page indices have their scrollbar on the left and odd indices on the right. An RTL book mirrors those positions.

Scrolling direction and content reading direction are separate. Each React page renders a `.flipbook-page-scrollport` around `.flipbook-page-content`. The scrollport chooses the scrollbar edge; the content wrapper keeps the book's reading direction, including direct text. Consumer elements retain their own `dir` attributes and CSS direction overrides.

The main scrollport owns page scrolling. The immediate consumer content root uses visible overflow so example content does not create a second scrollbar. Nested scrolling regions remain available. Explicit inline overflow on the content root takes precedence when a consumer deliberately needs its own scroll area.

## Bounded panel pages

Fixed-height reader panels — a stationary header and footer around an independently scrolling pane — opt out of document-style scrolling per page by tagging their content root with `flipbook-page-bounded`:

```html
<div class="flipbook-page-content">
  <article class="flipbook-page-bounded">
    <header>Fixed header</header>
    <div class="pane" style="flex: 1; min-height: 0; overflow-y: auto">Long content…</div>
    <footer>Fixed footer</footer>
  </article>
</div>
```

The root keeps `height: 100%; max-height: 100%` (the same box `.page > *` gives its own children), the page's scrollport never engages, and scrolling belongs to the consumer's inner panes. A book can mix tagged and untagged roots, so document pages and panel pages coexist. Inner scroll positions survive page turns because the content root is never re-wrapped or resized.

`TocPage` also shares the page's main scrollport when rendered inside a book, so its contents list uses the same inward scrollbar. A standalone `TocPage` retains its own scrolling area, and so does an in-book `TocPage` whose root is tagged `flipbook-page-bounded`: the page scrollport stays put while the list scrolls inside the panel.

## Vanilla and framework markup

The base renderer adds these wrappers once for existing vanilla pages, preserving the original text nodes, elements, event listeners, and computed reading direction. It moves the page's vertical scroll position into the new scrollport and hides the old outer scrollbar.

React supplies the wrappers declaratively. Other frameworks that own and reconcile page children should do the same, so the base renderer leaves their node structure in place:

```html
<div class="my-book">
  <div class="page">
    <div class="flipbook-page-scrollport">
      <div class="flipbook-page-content" dir="ltr">
        <article>Page content, including direct text and links.</article>
      </div>
    </div>
  </div>
</div>
```

The inner `dir` can be omitted to use the captured page reading direction, or set explicitly for differently directed content. An existing direct `.flipbook-page-scrollport` child is retained without rewrapping. Vanilla applications adding content after rendering should append it inside `.flipbook-page-content`.

To override the scrollbar side through application CSS, set `--flipbook-page-scroll-direction` on the scrollport: `ltr` puts it on the right and `rtl` on the left. This does not change the content's reading direction.
