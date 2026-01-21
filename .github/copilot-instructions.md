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
- Maintain 0 problems in VS Code
- Use Biome for formatting (tabs, double quotes, semicolons)

### Git Workflow (for Copilot/Agents)

1. Always check for PII before committing
2. After committing, check `git status` for any auto-fix changes
3. If changes exist, stage and amend automatically
4. Verify clean working tree before pushing

### Testing

- Prefer unit tests over e2e tests
- Extract pure business logic into testable functions
- Use Vitest for unit tests, Playwright for E2E

### Tool Learning Protocol

1. Check `.github/tool-registry.md` for existing research
2. If missing/outdated: use Context7, official docs, or GitHub
3. Update registry with: tool name, version, date, key learnings
4. Apply learnings

## Commands Reference

| Task           | Command           |
| -------------- | ----------------- |
| Unit Tests     | `npm test`        |
| E2E Tests      | `npm run test:e2e`|
| Lint & Format  | `npx biome check --write .` |
| Build          | `npm run build`   |
