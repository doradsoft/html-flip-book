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
