# Tool Registry

This file tracks research and learnings about tools used in this repository.

## Format

Each entry should include:
- **Tool**: Name and version
- **Date**: When the research was done
- **Key Learnings**: Important findings, gotchas, best practices

---

## Biome

**Version**: 2.x
**Date**: 2026-01-21

### Key Learnings

- Configuration in `biome.json`
- Uses tabs for indentation, double quotes, semicolons always
- Run `bunx biome check --write .` to fix all issues
- Run `bunx biome format --write <file>` for specific files

---

## Vitest

**Version**: 4.x
**Date**: 2026-01-21

### Key Learnings

- Configuration in `vitest.config.ts`
- Uses jsdom environment for DOM testing
- Run `bun run test` to execute all unit tests
- Supports watch mode with `bun run test:watch`

---

## Playwright

**Version**: Latest
**Date**: 2026-01-21

### Key Learnings

- Configuration in `playwright.config.ts`
- E2E tests in `e2e/` directory
- Run `bun run test:e2e` to execute E2E tests
- Supports multiple browsers (chromium, firefox, webkit)

---

## Chrome DevTools tracing

**Version**: Chromium bundled with Playwright 1.64.1 (browser-wide CDP Tracing)
**Date**: 2026-11-01

### Key Learnings

- A page-level V8 Profiler capture can reset across document navigation. Use browser-wide `Tracing.start` with timeline and V8 sampling categories to attribute a workload spanning several page loads.
- `transferMode: ReturnAsStream` retains the capture until `Tracing.end`; read its IO stream after the workload, and check `Tracing.tracingComplete.dataLossOccurred` before treating the trace as complete. Keep diagnostic captures separate from plain acceptance tests.
- Primary protocol schema: https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/browser_protocol.json
