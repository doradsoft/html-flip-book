# Contributing

Thank you for your interest in contributing to HTML Flip Book!

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/DoradSoft/html-flip-book.git
   cd html-flip-book
   ```

2. Install dependencies ([Bun](https://bun.com) is the package manager):
   ```bash
   bun install
   ```

3. Install pre-commit hooks:
   ```bash
   pip install pre-commit
   pre-commit install
   ```

4. Start development:
   ```bash
   bun run dev
   ```

## Commands

| Task | Command |
|------|---------|
| Build | `bun run build` |
| Unit Tests | `bun run test` |
| E2E Tests | `bun run test:e2e` |
| Lint & Format | `bunx biome check --write .` |
| Generate Docs | `bun run docs` |

## Guidelines

- Follow the existing code style (Biome formatting)
- Write tests for new features
- Add JSDoc comments for public APIs (auto-generates docs)
- Keep commits focused and descriptive

## Bug Fix Workflow (Red-Green TDD)

1. Write a failing test that exposes the bug
2. Verify the test fails
3. Fix the bug
4. Verify the test passes
5. Run the full test suite

## Pull Requests

1. Create a feature branch from `master`
2. Make your changes
3. Bump the version in `package.json`, `base/package.json`, `react/package.json`, and `react/example/package.json` to the same higher version
4. Submit a PR

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
