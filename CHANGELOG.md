# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
