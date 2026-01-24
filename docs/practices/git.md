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
| verify-version       | Ensures versions are in sync and bumped      |
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

## Version Verification

The repository enforces version bumping before releases at two levels:

### Pre-commit Hook (Local)

The `verify-version-bump` hook runs locally and warns if your version is not greater than the latest released version. This is a soft check - you can bypass it with `--no-verify`.

### CI Verification (Enforced)

On pull requests, the **Verify Version Bump** CI job enforces that the version in `package.json` is greater than the latest git tag. This cannot be bypassed and will block merging.

### How to Bump Version

Before merging a PR, bump the version:

```bash
# In root directory
cd base && npm version patch --no-git-tag-version  # for bug fixes
cd base && npm version minor --no-git-tag-version  # for new features
cd base && npm version major --no-git-tag-version  # for breaking changes

# Then sync other packages
cd ../react && npm version <same-version> --no-git-tag-version
cd example && npm version <same-version> --no-git-tag-version
```

The `verify-versions-sync` hook ensures all package.json files have matching versions.
