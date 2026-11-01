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

---

## Node filesystem directory links

**Version**: Node 26.10.0
**Date**: 2026-11-01

### Key Learnings

- For shared benchmark `node_modules`, use `fs.promises.symlink` with `junction` on Windows and `dir` elsewhere. Keep targets absolute.
- A local reproduction found that MSYS `ln -s` reported success while creating an `Archive, ReparsePoint` file link to the directory; Node module traversal failed with `EACCES`. A native `Directory, ReparsePoint` junction resolved the same Vite package correctly.
- API reference: https://nodejs.org/api/fs.html#fspromisessymlinktarget-path-type

## Vite deferred example assets

**Version**: Vite 8.3.5
**Date**: 2026-11-01

### Key Learnings

- [Glob imports](https://vite.dev/guide/features.html#glob-import) create deferred import functions by default; `import: "default"` returns the asset value when called. Keep chapter PDF loaders aligned with page slots and invoke only the selected loaders during download. `eager: true` embeds the PDFs in the initial application graph.
- Ordinary dynamic imports defer Markdown and PDF exporters until the corresponding reader or download needs them. Keep the existing chunk warning limit and remove startup dependencies instead of raising it.
- `import.meta.env.BASE_URL` preserves the configured Pages prefix when requesting a PDF-only font. Exercise the production bundle under `/html-flip-book/` and verify a real PDF download plus a successful font response.
