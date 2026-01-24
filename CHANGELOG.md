# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Skip to last page now properly closes the book in reversed position (showing only the back cover)
- Subtle hover inner-shadow effect with dynamic shadow/highlight to preview page turns

### Fixed

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

---

## [0.0.0-alpha.10] - 2026-01-22

### Added

- Initial alpha release with core flipbook functionality
- React component wrapper
- Touch and mouse drag support
- RTL/LTR direction support
- Page navigation API (flipNext, flipPrev, goToPage, jumpToPage)
- Concurrent flip animations support
- Leaves buffer for performance optimization
