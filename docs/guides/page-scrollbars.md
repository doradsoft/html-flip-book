# Page scrollbars

Books place each page's main scrollbar beside the spine. In an LTR book, even page indices have their scrollbar on the left and odd indices on the right. An RTL book mirrors those positions.

Scrolling direction and content reading direction are separate. Each React page renders a `.flipbook-page-scrollport` around `.flipbook-page-content`. The scrollport chooses the scrollbar edge; the content wrapper keeps the book's reading direction, including direct text. Consumer elements retain their own `dir` attributes and CSS direction overrides.

The main scrollport owns page scrolling. The immediate consumer content root uses visible overflow so example content does not create a second scrollbar. Nested scrolling regions remain available. Explicit inline overflow on the content root takes precedence when a consumer deliberately needs its own scroll area.

### Bounded page panels

Pages that are fixed-height panels — a stationary header and footer around an independently scrolling pane — need the content root to stay bounded instead of growing a document. Add the `flipbook-page-panel` class to the page's root element (the direct child of `.flipbook-page-content`) to keep it at exactly the page height with `overflow: hidden`:

```html
<div class="page">
  <div class="flipbook-page-panel my-panel">
    <header>Chapter title</header>
    <div class="my-pane" tabindex="0">…long scrollable content…</div>
    <footer>Footnotes</footer>
  </div>
</div>
```

```css
.my-panel { display: flex; flex-direction: column; }
.my-pane  { flex: 1; min-height: 0; overflow-y: auto; }
```

The panel always fits the scrollport, so the page scrollport stays dormant and the inner pane owns wheel, touch and keyboard scrolling (give the pane `tabindex` for keyboard focus). Page turns preserve inner scroll positions because the page's DOM is not recreated. The class is opt-in per page, so a book can mix document pages and panels; normal pages keep the document-style inward scrollbar described above.

`TocPage` also shares the page's main scrollport when rendered inside a book, so its contents list uses the same inward scrollbar. A standalone `TocPage` retains its own scrolling area.

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
