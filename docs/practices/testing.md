# Testing Practices

## Overview

This project follows a "catch things early" philosophy—issues should be detected as early as possible in the development lifecycle. Testing is structured to provide multiple layers of verification.

## Testing Strategy

**Prefer unit tests over e2e tests.** When implementing features:

1. **Extract pure business logic** into separate, testable functions that don't depend on framework-specific APIs.
2. **Write unit tests first** for the extracted logic - they run faster, are more reliable, and provide better error isolation.
3. **Add e2e tests** for integration verification - confirming the full stack works together.
4. **Design for testability** - if a function can only be tested via e2e, refactor it to separate pure logic from side effects.

## Test Description Conventions

When writing tests, follow this naming convention for `describe` and `it`/`test` blocks:

- **Top-level `describe` blocks**: Use the subject being tested (e.g., component name, function name, module name)
- **Nested `describe` blocks**: Use contextual descriptions or scenarios (e.g., "when user drags left", "with invalid input")
- **Leaf `it`/`test` blocks**: Use expectation verbs describing the expected behavior (e.g., "returns the correct value", "throws an error", "flips to next page")

Example:

```typescript
describe("FlipBook", () => {
	describe("flipNext", () => {
		describe("when book is open", () => {
			it("flips to the next page", () => { ... });
		});
		describe("when book is at last page", () => {
			it("does nothing", () => { ... });
		});
	});
});
```

## Test Types

| Module | Unit Tests | E2E Tests |
| ------ | ---------- | --------- |
| base   | ✅         | ✅        |
| react  | ✅         | ✅        |

### Unit Tests

Unit tests verify individual functions, components, and modules in isolation. They run quickly and provide fast feedback during development.

- Uses Vitest with jsdom environment
- Located in `*/__tests__/*.test.ts` files

### End-to-End (E2E) Tests

E2E tests verify complete user flows through the application, testing the integration between components and browser interactions.

- Uses Playwright
- Located in `e2e/*.spec.ts` files

## Running Tests Locally

| Task           | Command           |
| -------------- | ----------------- |
| Unit Tests     | `npm test`        |
| E2E Tests      | `npm run test:e2e`|
| All Tests      | `npm run test:all`|
