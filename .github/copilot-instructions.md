# Copilot Instructions

This file provides guidance for GitHub Copilot and other AI assistants working in this repository.

## Project Overview

**html-flip-book** is a TypeScript library for creating realistic page-flip animations in the browser. It consists of:

- **base/**: Core flipbook library (pure TypeScript, no framework dependencies)
- **react/**: React component wrapper
- **vanilla/**: Vanilla JS example
- **e2e/**: Playwright E2E tests

## Development Practices

See [docs/practices/](../docs/practices/) for detailed guidelines:

- [General Practices](../docs/practices/general.md) - Tool learning protocol, investigation tools
- [Implementation](../docs/practices/implementation.md) - Code quality, module-specific instructions
- [Git Practices](../docs/practices/git.md) - Pre-commit hooks, commit workflow
- [Testing](../docs/practices/testing.md) - Testing philosophy, conventions, commands

## Key Guidelines

### Code Quality

- **Never ignore compiler or linter errors/warnings** - always fix issues
- Maintain 0 errors and 0 warnings in VS Code's Problems panel
- Use Biome for formatting (tabs, double quotes, semicolons)

### Git Workflow (for Copilot/Agents)

1. **Always sync master before creating branches**: Fetch latest and branch from `github/master` unless explicitly requested otherwise
2. Always check for PII before committing
3. After committing, check `git status` for any auto-fix changes
4. If changes exist, stage and amend automatically
5. Verify clean working tree before pushing

### Testing

- Prefer unit tests over e2e tests
- Extract pure business logic into testable functions
- Use Vitest for unit tests, Playwright for E2E

### Bug Fix Workflow (Red-Green TDD)

When fixing bugs, follow this test-driven process:

1. **Write failing tests first (Red)**:
   - Add a test that exposes the bug (should fail with current code)
   - Add a negative test ensuring the bug behavior doesn't occur
2. **Run tests** to confirm they fail as expected
3. **Fix the bug** in the implementation
4. **Run tests again** to confirm they pass (Green)
5. **Run full test suite** to check for regressions

### Issue Ownership

- **Never claim an issue is "pre-existing"** unless there is an open GitHub Issue documenting it
- If CI fails after your changes, assume your changes caused or exposed the issue
- Investigate and fix failures - don't dismiss them as unrelated
- The only legitimate pre-existing issues are those tracked in GitHub Issues

### Tool Learning Protocol

1. Check `.github/tool-registry.md` for existing research
2. If missing/outdated: use Context7, official docs, or GitHub
3. Update registry with: tool name, version, date, key learnings
4. Apply learnings

### Changelog Maintenance

After completing any fix, feature, or breaking change, update `CHANGELOG.md`:

1. **Add entries under `[Unreleased]`** in the appropriate section:
   - **Added**: New user-facing features
   - **Fixed**: Bug fixes (user-facing description)
   - **Changed**: Changes to existing functionality
   - **Breaking Changes**: API or behavior changes that may affect users
   - **Engineering**: Internal changes (refactoring, tests, tooling, docs)

2. **Writing guidelines**:
   - User-facing bullets should be clear to end-users (not implementation details)
   - Breaking changes must be clearly marked and explain migration path
   - Engineering bullets are for internal reference (tests added, refactoring, etc.)

3. **On release**: The `[Unreleased]` section is automatically moved to a versioned section by the release workflow

## Commands Reference

| Task          | Command                     |
| ------------- | --------------------------- |
| Unit Tests    | `npm test`                  |
| E2E Tests     | `npm run test:e2e`          |
| Lint & Format | `npx biome check --write .` |
| Build         | `npm run build`             |
