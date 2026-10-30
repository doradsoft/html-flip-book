# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Performance benchmark harness: isolated base-vs-candidate comparison with paired samples, per-run A/A noise calibration, explicit regression thresholds and verdict policy (regression / no-regression / inconclusive / unsupported / error), raw artifacts with environment metadata, and a selfcheck that injects a synthetic slowdown which must be detected (#289). Scenarios cover page-turn smoothness, rAF cadence, long tasks/frames and pointer-to-visible-mutation latency (#290), plus 20/200/1000-page scaling windows for init, bookmark refresh, navigation, resize relayout, mount/destroy cycles, React mount, and a retained-nodes/listeners/timers/rAF/observers leak audit after teardown (#291).
- Built-in history and download defaults (#168). When `enableHistory` is not false and no `historyMapper` is provided, a hash-based mapper (`#page/{semantic-name-or-index}`) syncs page flips with the URL, including Back/Forward restore and deep-linking to the page named in the URL on load. When `enableDownload` is not false and no `downloadConfig` is provided, built-in "entire book" and "page range" handlers export a JSON index of the book's pages. Consumer-provided `historyMapper`/`downloadConfig` still take precedence; `enableHistory: false`/`enableDownload: false` disable the features entirely.
- Opt-in bookmark providers add TOC and chapter tabs with independent front and back content, perpendicular or parallel layouts, brief and expanded HTML, leaf-attached or pinned motion, custom ordering and click actions, with LTR and RTL examples.
- Optional short page titles complement full titles in page metadata. A toolbar control shows or hides bookmarks without changing navigation.
- `restorePage(pageIndex)` lets an external SPA router show a page without adding another browser-history entry.
- `DownloadDropdown` accepts `children` rendered at the end of the open menu — a supported slot for app-specific hints or extra download actions. Slot content is a real child of the menu element: inside-menu click behavior, keyboard tabbing, `dir` and React context are preserved, and it remounts with each open (#280).
- `flipbook-page-bounded` opts a page's content root out of document-style scrolling: tagged roots stay pinned at `height: 100%; max-height: 100%` so fixed header/footer panels with inner scroll panes work per page — no private selector overrides needed. Untagged roots keep the shared scrollport (#279).
- Paper pages fold from the grabbed corner with crease shading.
- `FullscreenButton` is now backed by the `toggleFullscreen` toggle command — F11 by default, rebindable or disabled per command via `commandOptions`, with hold support — and shows localized enter/exit labels plus `aria-pressed` state in LTR and RTL toolbars.

### Fixed

- Page turns avoid redundant bookmark attributes, styles and rail moves, and only change the page's folded class when its fold state changes, reducing animation-time DOM work while preserving live geometry and provider updates.
- Destroying a book now stops its debug refresh timer and removes the debug bar, preventing background updates from accumulating after reader remounts.
- Dragging from a turnable page margin keeps turning when the pointer enters an excluded content pane before the gesture is recognized; gestures that start inside excluded panes remain native.
- Books opened at a chapter mark only the active spread as current, and clear old active-page markers when mounted again.
- The GitHub Pages example no longer renders a blank page: the `gematry` dependency ships a webpack dev bundle that `eval()`s its own module code, which throws inside the strict-mode ESM output of `vite build`. The example vendors equivalent `toLetters`/`toNumber` helpers instead, and a new e2e smoke test loads the production bundle so this class of breakage can't regress (#267).
- Pressing a bookmark now blocks its hover preview from reopening until the pointer moves, so an activation click always lands on the button in its rail slot instead of the preview overlay (#270).
- `coverConfig.noShadow` now actually suppresses the page's inner shadow and edge highlight on tagged covers: the shipped stylesheet hides the `page--no-shadow` pseudo-elements so cover opt-out works without consumer CSS, while interior pages keep their normal shading (#277).
- React bookmark renderers no longer insert a layout-interfering wrapper: the portal target uses `display: contents` (class `flipbook-bookmark__renderer`), so brief and expanded renderer children are direct flex/grid items and can shrink below their content size — long titles truncate with ellipsis instead of being clipped (#282).
- Page shading overlays (`::before`/`::after`) now carry `z-index: var(--flipbook-shading-z-index, 10)`, so hover shadows, edge highlights and fold shading stay visible above positioned, opaque page content — no consumer override needed. The overlays still never intercept input (#278).
- Failed downloads no longer vanish silently: handler rejections and browser-side save failures route through one lifecycle — `DownloadConfig.onDownloadError` fires for hosts (optionally returning a custom message), the menu stays open with a localized `role="alert"` line, loading resets, and retry works. Intentional `null` results still close quietly (#281).
- The documented stylesheet entry points now actually resolve and cover the whole book: `html-flip-book-vanilla/style.css` pointed at a file the build never emitted (now correctly `html-flip-book.css`), and `html-flip-book-react/styles.css` shipped only toolbar/TOC/mouse-mode rules — it now bundles the complete core styles (pages, shading, scrollports, bookmarks) alongside the React component styles, so React consumers need no second import or copied CSS (#276).
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
- The initial history sync on `render()` once again fires `onPageFlipped` before the first history write — consumers rely on it as a pre-write hook to re-apply richer routes (e.g. article/perush deep links) that the canonicalizing write normalizes away. `onPageChanged` stays silent at init since no transition occurred.

### Changed

- `html-flip-book-react` peer dependency range widened to `^18.0.0 || ^19.0.0` for `react` and `react-dom`, so the package installs cleanly on React 19 apps.
- Demo examples show page shadows by default, with dedicated "No shadow" examples for each reading direction.
- Page turns settle smoothly from the held fold while cover boards retain rigid rotation.
- `FullscreenButton` hides itself on browsers that cannot use element fullscreen (e.g. iOS Safari, sandboxed frames); pass `unsupportedBehavior="disable"` to keep it visible but disabled with an explanation.

### Breaking Changes

- None

### Engineering

- Retained-resource benchmarks complete browser garbage collection and verify a deliberately retained DOM tree, while React mount probes fail on timeout and always release their timer and fixture. Performance fixtures are typechecked from source in clean checkouts, and native Vite configuration uses ESM paths.
- Browser tests now collect Chromium execution coverage and map it back to the original library sources. CI requires useful unit coverage and every browser shard's LCOV report instead of silently publishing unit-only coverage.
- The React performance fixture now fills its sized host and rejects zero-area pages, so frame and gesture probes measure a visible reader.
- Package management moved to Bun (`packageManager: bun@1.4.4`, `bun.lock` replacing `package-lock.json`, `bunfig.toml` with hoisted linking, exact saves, and a 24h supply-chain freshness gate). CI installs via `bun install --frozen-lockfile` with the Bun dependency cache, Playwright browser caching keys off the resolved version in `bun.lock`, and the publish pipeline still uses `npm publish --provenance` since Bun has no provenance flag. Script lifecycle allowlisting moved to `trustedDependencies`.
- Release versions are now derived from git tags (`scripts/next-version.mts`), so pull requests no longer carry version bumps: every master merge releases `latestTag + 1` even if it lands before the post-release bump PR merges, and a manifest version ahead of the tag sequence (a deliberate major/minor prep change) is honored. The pre-commit hook and PR check only enforce that all manifests stay in sync.
- Rebalanced e2e shards: `bookmarks.spec.ts` (the ~13-minute shard hotspot) is split into `bookmarks-dense`, `bookmarks-layout`, and `bookmarks-interaction` specs sharing `bookmark-helpers.ts`, so Playwright's file-level sharding distributes the bookmark suite across all three shards. Migrated `biome.json` to schema 2.6.3 (`recommended` field replaced by `preset`) and reordered example stylesheet selectors to clear descending-specificity warnings.
- Added geometry, drag, release, content-preservation, and selection regressions for both reading directions; browser fixtures now measure travel using physical page widths.
- Simplified held-fold state updates and shared gesture/content fixtures while preserving regression assertions.
- Modernized test/build tooling: `base`, `react`, and `react/example` are now npm workspaces with a single root lockfile (nested `npm install` chains and lockfiles removed, giving `npm ci` a deterministic view and dependabot coverage of every workspace dependency). GitHub Actions bumped to current majors (checkout/setup-node v7, upload-pages-artifact v5, dependency-review-action v5, action-gh-release v3, codecov-action v7.1.1). Script helpers run on Node 24's native TypeScript support instead of `tsx`. Removed the obsolete `legacy-peer-deps` `.npmrc` override, the unused `vite-plugin-dts` dependency, and the completed January modernization plan document; `npm run build` no longer compiles `base` twice; the example app is marked `private` and resolves `html-flip-book-react` from the workspace instead of a stale published tarball.
- Cut e2e wall-clock time ~3x: Playwright now runs sharded across three CI jobs with per-shard coverage/report artifacts (merged lcov reports). The dense-bookmark regression batch — previously ~90–115s per case and the recurring e2e timeout — collects rail/slot geometry, z-index, and exposed hit points in a single page evaluation, emulates `prefers-reduced-motion` so preview timers and transitions settle instantly, and exercises full hover/click behavior on each stacked layer's boundary tab instead of serially on all 60 (~19s per case, same assertions). The redundant example build step is gone from the e2e job (the dev server compiles from source).

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
