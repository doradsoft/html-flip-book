# Git Practices

## Pre-commit Hooks

The repository uses pre-commit hooks managed by [pre-commit](https://pre-commit.com/) framework, triggered via Husky:

| Item          | Location                    |
| ------------- | --------------------------- |
| Configuration | `.pre-commit-config.yaml`   |
| Husky trigger | `.husky/pre-commit`         |

### Hooks

| Hook                 | Description                                  |
| -------------------- | -------------------------------------------- |
| trailing-whitespace  | Removes trailing whitespace                  |
| end-of-file-fixer    | Ensures files end with a newline             |
| check-yaml           | Validates YAML syntax                        |
| check-added-large-files | Prevents large files from being committed |
| check-case-conflict  | Detects case-insensitive filename conflicts  |
| check-merge-conflict | Detects unresolved merge conflicts           |
| mixed-line-ending    | Enforces consistent line endings             |
| verify-versions-sync | Ensures all package.json versions match      |
| biome                | Runs Biome linter/formatter on staged files  |

### Setup

```bash
pip install pre-commit
pre-commit install
```


## Git Workflow

### Manual Commit Process

When committing changes:

1. **Before committing**, review staged changes for PII (Personally Identifiable Information) such as API keys, passwords, or other sensitive data. Use `git diff --cached` to inspect.
2. After `git commit`, pre-commit hooks may apply auto-fixes (e.g., formatting, import sorting)
3. Before pushing, always check for unstaged changes: `git status`
4. If pre-commit modified files, stage and amend:
   ```bash
   git diff-tree --no-commit-id --name-only -r HEAD | xargs git add && git commit --amend --no-edit
   ```
   (Only re-stages files from the original commit)
5. Only push after confirming no uncommitted auto-fixes remain

### Automatic Process (Copilot/Agents)

Copilot and agents follow the same workflow as above but should:

1. Always check for PII before committing
2. After committing, check `git status` for any auto-fix changes
3. If changes exist, stage and amend automatically
4. Verify clean working tree before pushing

### Pull Request Management

- Always create a new branch for each feature or fix
- Only @DoradSoft can merge PRs unless explicitly delegated to do so
