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
| verify-version       | Ensures all manifest versions are in sync    |
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

1. **Always sync master before creating branches**: Fetch latest and branch from `github/master` unless explicitly requested otherwise
2. Always check for PII before committing
3. After committing, check `git status` for any auto-fix changes
4. If changes exist, stage and amend automatically
5. Verify clean working tree before pushing

### Pull Request Management

- Always create a new branch for each feature or fix
- Only @DoradSoft can merge PRs unless explicitly delegated to do so

## Version Verification

Versions are managed automatically — pull requests do not bump them.

- The **release job** derives each release's version from git tags
  (`scripts/next-version.mts`): the latest `v*` tag plus one prerelease/patch
  increment. A manifest version ahead of the tag sequence (a deliberate
  major/minor prep change) wins over the mechanical increment.
- After each release, **Auto Bump Version** opens a pull request advancing the
  manifests to the next version so they stay ahead of the tags.
- The **Verify Version Sync** check (pre-commit hook and PR job) only enforces
  that `package.json`, `base/package.json`, `react/package.json`, and
  `react/example/package.json` all carry the same version.

### Deliberate version jumps

To release a specific version (e.g. `1.0.0` instead of the next alpha), set it
in all four manifests on a PR. The release job honors a manifest version that
is ahead of the tag sequence.
