# Git Workflow for XMLTools

This document outlines the branching and commit strategy for XMLTools development.

## Branch Strategy

### Main Branches

- **`main`** — Production-ready code. Corresponds to completed milestones (M1, M2, etc.).
  - Each commit to `main` represents a fully tested, usable milestone.
  - Tagged with milestone names: `M1-skeleton`, `M2-core-viewers`, etc.

- **`dev`** — Integration branch for work-in-progress features.
  - Default branch for daily development.
  - Merges feature branches after QA.

### Feature Branches

Per milestone and per-tool, create feature branches off `dev`:

```
dev/M1-skeleton
  ├─ feature/subprocess-runner
  ├─ feature/xml-io
  ├─ feature/highlight
  └─ feature/app-skeleton
    
dev/M2-core-viewers
  ├─ feature/lint-tab
  ├─ feature/pretty-print-tab
  └─ feature/tree-view-tab
```

**Naming convention**: `feature/M{milestone}-{tool-name}` or `fix/{issue}`.

## Commit Message Convention

Each commit should follow this format:

```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>
```

**Types**:
- `feat` — New feature or tool tab
- `fix` — Bug fix
- `refactor` — Code restructuring without changing functionality
- `test` — Add or update tests
- `docs` — Documentation only
- `chore` — Build config, dependencies, etc.

**Scope**: which module or tool (e.g., `lint`, `xpath`, `utils/highlight`)

**Subject**: one line, imperative mood, no period. Max 50 characters.

**Examples**:
```
feat(lint): add well-formedness check via xmllint --noout
fix(highlight): debounce regex highlight on large files
docs(readme): add XPath syntax cheat-sheet
refactor(utils/subprocess_runner): extract _format_cmd helper
```

## Workflow Per Milestone

### 1. Create milestone feature branch off `dev`

```bash
git checkout -b dev/M{milestone}
```

### 2. For each tool/module in the milestone

- Create a feature branch: `git checkout -b feature/M{milestone}-{tool}`
- Implement the feature
- Run tests locally
- Commit incrementally with clear messages
- Push: `git push origin feature/M{milestone}-{tool}`

### 3. Merge back to `dev` when complete

```bash
git checkout dev
git merge --no-ff feature/M{milestone}-{tool}
git branch -d feature/M{milestone}-{tool}
```

Use `--no-ff` to preserve the feature branch history.

### 4. Tag and merge to `main` when milestone is complete and tested

```bash
git checkout main
git merge --no-ff dev/M{milestone}
git tag -a M{milestone}-complete -m "Milestone {N}: {description}"
git push origin main --tags
```

## Example: Completing M1 (Skeleton)

```bash
# Start work on M1
git checkout -b dev/M1-skeleton

# Feature 1: subprocess runner
git checkout -b feature/M1-subprocess-runner
# ... implement utils/subprocess_runner.py ...
git commit -m "feat(utils/subprocess_runner): add ToolResult + run_xmllint/xsltproc"
git push origin feature/M1-subprocess-runner

# Merge back
git checkout dev/M1-skeleton
git merge --no-ff feature/M1-subprocess-runner
git branch -d feature/M1-subprocess-runner

# Repeat for xml_io, highlight, app, main...

# All tools done, integrate into dev
git checkout dev
git merge --no-ff dev/M1-skeleton

# Test on dev, then release to main
git checkout main
git merge --no-ff dev
git tag -a M1-skeleton -m "M1: Runnable skeleton with all 9 tabs"
git push origin main --tags
```

## Local Development

```bash
# Clone or start fresh
git clone <repo> && cd xmltools

# Ensure you're on dev or a feature branch
git branch -a
git checkout dev  # or create a new feature branch

# Make changes and commit frequently
git add utils/highlight.py
git commit -m "feat(highlight): add XML tag color scheme"

# Before pushing, rebase to keep history clean (optional but recommended)
git rebase -i origin/dev

# Push your feature branch
git push origin feature/M2-tree-view

# Create a pull request (if using GitHub)
# or merge manually once tested
```

## Tagging Milestones

After completing a milestone and merging to `main`:

```bash
git tag -a M1-skeleton -m "Milestone 1: Runnable skeleton with file open/save and highlight"
git tag -a M2-core-viewers -m "Milestone 2: Lint, format, tree navigation working"
git tag -a M3-query-validate -m "Milestone 3: XPath and schema validation"
# ... etc ...

git push origin --tags
```

View all tags:
```bash
git tag -l
```

## Viewing History

```bash
# Pretty log with branch graph
git log --oneline --graph --all --decorate

# Show commits for a specific tool
git log -- tools/lint.py

# Show commits between milestones
git log M1-skeleton..M2-core-viewers
```

## Reverting Changes

If a feature breaks things:

```bash
# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Revert a published commit (safe for shared branches)
git revert <commit-hash>
```

---

## Summary

- **Main branches**: `main` (releases/milestones) and `dev` (integration)
- **Feature branches**: `feature/M{milestone}-{tool}` per feature
- **Commits**: type(scope): subject, imperative mood, ~50 char subject line
- **Merge strategy**: `--no-ff` to preserve feature history
- **Tags**: `M{N}-{name}` on `main` for each completed milestone
- **Push**: feature branches to origin; merges happen locally, then push to main/dev
