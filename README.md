# HTML Flip Book

[![CI](https://github.com/DoradSoft/html-flip-book/actions/workflows/ci.yml/badge.svg)](https://github.com/DoradSoft/html-flip-book/actions/workflows/ci.yml?query=branch%3Amaster)
[![CD](https://github.com/DoradSoft/html-flip-book/actions/workflows/cd.yml/badge.svg)](https://github.com/DoradSoft/html-flip-book/actions/workflows/cd.yml)
[![Codecov](https://codecov.io/gh/DoradSoft/html-flip-book/branch/master/graph/badge.svg)](https://codecov.io/gh/DoradSoft/html-flip-book)
[![Codacy Grade](https://app.codacy.com/project/badge/Grade/87a9b9d4c81b49b8b49115c4ac7ec486)](https://app.codacy.com/gh/DoradSoft/html-flip-book/dashboard)
[![Documentation](https://img.shields.io/badge/docs-API%20Reference-blue)](https://html-flip-book.readthedocs.io/)

[![npm vanilla](https://img.shields.io/npm/v/html-flip-book-vanilla?label=vanilla)](https://www.npmjs.com/package/html-flip-book-vanilla)
[![npm react](https://img.shields.io/npm/v/html-flip-book-react?label=react)](https://www.npmjs.com/package/html-flip-book-react)

A TypeScript library for creating realistic page-flip animations in the browser.

**[📖 Live Demo](https://doradsoft.github.io/html-flip-book/)** · **[📚 API Docs](https://html-flip-book.readthedocs.io/)**

## Installation

```bash
# Vanilla JavaScript
npm install html-flip-book-vanilla

# React
npm install html-flip-book-react
```

## Features

### Core

- **RTL & LTR Support** — Horizontal flip direction for both reading directions
- **Touch & Mouse Input** — Drag pages with touch gestures or mouse
- **Velocity-based Flipping** — Fast swipes complete the flip automatically
- **Progress-based Flipping** — Partial drags complete based on progress threshold
- **Concurrent Flip Animations** — Multiple pages can flip simultaneously
- **Hover Effects** — Subtle inner-shadow preview on page edges
- **Leaves Buffer** — Performance optimization for large books (only render nearby pages)
- **Bookmark Providers** — Opt-in TOC and chapter tabs, or custom content, placement, ordering, and click actions. Tabs have front and back content, expand on hover, and fold with their leaf. See the [bookmark guide](docs/guides/bookmarks.md).

### React Component

- **Toolbar Components** — Pre-built navigation UI:
  - `Toolbar` — Container component
  - `PrevButton` / `NextButton` — Navigate pages
  - `FirstPageButton` / `LastPageButton` — Jump to ends
  - `PageIndicator` — Current page display
  - `FullscreenButton` — Toggle fullscreen mode
- **Imperative API** — `flipNext()`, `flipPrev()`, `flipToPage()`, `jumpToPage()`
- **Ref Handle** — Access current page index, total pages, navigation state

### Examples

- [Live Demo](https://doradsoft.github.io/html-flip-book/) — English (LTR) and Hebrew (RTL) books

## Roadmap

- [ ] Curl animation / animated page edges
- [ ] Vertical flip direction
- [ ] Vue component
- [ ] Angular component

## Bugs
