# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Built-in history and download defaults (#168). When `enableHistory` is not false and no `historyMapper` is provided, a hash-based mapper (`#page/{semantic-name-or-index}`) syncs page flips with the URL, including Back/Forward restore and deep-linking to the page named in the URL on load. When `enableDownload` is not false and no `downloadConfig` is provided, built-in "entire book" and "page range" handlers export a JSON index of the book's pages. Consumer-provided `historyMapper`/`downloadConfig` still take precedence; `enableHistory: false`/`enableDownload: false` disable the features entirely.
- Opt-in bookmark providers add TOC and chapter tabs with independent front and back content, perpendicular or parallel layouts, brief and expanded HTML, leaf-attached or pinned motion, custom ordering and click actions, with LTR and RTL examples.
- Optional short page titles complement full titles in page metadata. A toolbar control shows or hides bookmarks without changing navigation.
- `restorePage(pageIndex)` lets an external SPA router show a page without adding another browser-history entry.
- Paper pages fold from the grabbed corner with crease shading.
- `FullscreenButton` is now backed by the `toggleFullscreen` toggle command — F11 by default, rebindable or disabled per command via `commandOptions`, with hold support — and shows localized enter/exit labels plus `aria-pressed` state in LTR and RTL toolbars.

### Fixed

- Rapid consecutive page flips no longer flicker: leaves stay visible while their flip animation is in flight, even when the `leavesBuffer` window slides past them, and the React wrapper keeps their content mounted until flips settle (#167).
- Attached bookmarks stay still during page-edge hover previews and continue folding with actual page turns.
- Bookmark reveals keep a stationary page-edge clip during hover, closing, and reentry, even when movement and reveal timing differ.
- Escape dismisses an open bookmark preview even when focus has moved to another control.
- Page scrollbars sit beside the spine without changing the content's reading direction, leaving outer edges clear for page-turn gestures.
- Download menus stay within the viewport on narrow screens and follow their toolbar trigger when scrolling or resizing.
- Dragging images and links turns pages without starting a competing native browser drag; selection mode and excluded areas retain native dragging.
- Backward hover hints curl a small corner while the page body stays still, matching forward hover hints.
- Page-edge hover previews stay within the visible page instead of triggering in empty space around the book.
- Table of contents entries keep full titles and page numbers visible in both reading directions.
- Browser Back/Forward now restores flipbook-owned pages without triggering a host SPA router traversal or remount.
- Dragged page corners follow horizontal and vertical movement using the page's actual dimensions.
- Text selection and gestures starting in excluded areas no longer trigger page folds.
- Instant page positioning clears stale notifications from a held page.
- Fullscreen state stays in sync when exiting via Escape or browser UI, on vendor-prefixed (`webkitfullscreenchange`) engines, and after rejected requests (`fullscreenerror`).
- `Toolbar` keeps its injected command data (fullscreen target, download executor) when consumers override the same command's options — entries now merge per command instead of being replaced.
- Live demo (GitHub Pages) rendering blank due to duplicate React instances — removed esm.sh import map and Vite externals, added `resolve.dedupe` to ensure a single React copy when aliased monorepo sources are bundled

### Changed

- `html-flip-book-react` peer dependency range widened to `^18.0.0 || ^19.0.0` for `react` and `react-dom`, so the package installs cleanly on React 19 apps.
- Demo examples show page shadows by default, with dedicated "No shadow" examples for each reading direction.
- Page turns settle smoothly from the held fold while cover boards retain rigid rotation.
- `FullscreenButton` hides itself on browsers that cannot use element fullscreen (e.g. iOS Safari, sandboxed frames); pass `unsupportedBehavior="disable"` to keep it visible but disabled with an explanation.

### Breaking Changes

- None

### Engineering

- Added geometry, drag, release, content-preservation, and selection regressions for both reading directions; browser fixtures now measure travel using physical page widths.
- Simplified held-fold state updates and shared gesture/content fixtures while preserving regression assertions.

---

## [0.0.0-alpha.27] - 2026-02-11

### Added

- None

### Fixed

- None

### Changed

- None

### Breaking Changes

- **Alpha only (not semver-breaking):** Fullscreen command now uses `data.getFullscreenTarget()` instead of `data.fullscreenTargetRef` (React ref). Use `commandOptions.toggleFullscreen.data = { getFullscreenTarget: () => ref.current ?? null }` if you need a specific target.

### Engineering

- None

---

## [0.0.0-alpha.24] - 2026-02-10

### Added

- Skip to last page now properly closes the book in reversed position (showing only the back cover)
- Subtle hover inner-shadow effect with dynamic shadow/highlight to preview page turns

### Fixed

- **react package**: Point `types` and `exports["."].types` to `FlipBook.d.ts` so consumers resolve declaration files correctly
- **jumpToPage**: Now correctly handles jumping to the last page when it's an odd-indexed page, closing the book reversed
- **flipNext/flipPrev race condition**: Prevented broken state when calling flipPrev during an active flipNext animation (or vice versa)

### Changed

- None

### Breaking Changes

- None

### Engineering

- Added `hasActiveAutoFlipInDirection` helper method to detect conflicting flip directions
- flipNext/flipPrev now block when there's an active auto-flip in the opposite direction
- Added Red-Green TDD workflow to copilot-instructions.md and testing.md
- Added comprehensive tests for jumpToPage edge cases and flip race conditions
- Updated auto-create-pr workflow to use BOT_PAT for CI workflow triggering on auto-created PRs
- Added codecov.yml configuration with coverage thresholds and PR comments
- Added Codecov badge to README.md
- Integrated codecov/codecov-action@v5 in CI workflow
- Added Codacy coverage upload step in CI workflow
- Added Codacy badge to README.md
- Removed flaky E2E test "fast swipe before middle completes" (already covered in mocked velocity-threshold tests)

---

## [0.0.0-alpha.10] - 2026-01-22

### Added

- Initial alpha release with core flipbook functionality
- React component wrapper
- Touch and mouse drag support
- RTL/LTR direction support
- Page navigation API (flipNext, flipPrev, flipToPage, jumpToPage)
- Concurrent flip animations support
- Leaves buffer for performance optimization
