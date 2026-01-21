# Implementation Practices

## Code Quality

**Never ignore compiler or linter errors/warnings.** Always fix issues reported by:

- TypeScript
- Biome
- Any other static analysis tool

Maintain 0 problems in VS Code.

## Module-Specific Instructions

### base/ (Core FlipBook Library)

The core TypeScript library implementing the flipbook functionality.

**Commands:**

| Task       | Command        |
| ---------- | -------------- |
| Unit Tests | `npm test`     |
| Build      | `npm run build`|
| Watch      | `npm run watch`|

**Implementation Notes:**

- When writing a test and asserting non-null using the framework, you can use the non-null assertion operator after and decorate the usage with a linter suppression comment explaining why it's safe
- When catching an error, log that it took place using `console.warn` or `console.error`

### react/ (React Component Wrapper)

React component wrapper for the base flipbook library.

**Commands:**

| Task       | Command        |
| ---------- | -------------- |
| Unit Tests | `npm test`     |
| Build      | `npm run build`|

### e2e/ (End-to-End Tests)

Playwright-based E2E tests for the flipbook.

**Commands:**

| Task      | Command           |
| --------- | ----------------- |
| E2E Tests | `npm run test:e2e`|

### vanilla/ (Vanilla JS Example)

Example implementation using vanilla JavaScript.
