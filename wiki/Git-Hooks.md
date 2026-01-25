# Git Hooks

Automate Drift scans on git events to catch pattern drift before it reaches CI.

## Quick Setup with Husky

### 1. Install Husky

```bash
npm install -D husky
npx husky init
```

### 2. Add Pre-commit Hook

```bash
echo 'drift check --staged --fail-on error' > .husky/pre-commit
```

### 3. Add Pre-push Hook (Optional)

```bash
echo 'drift gate --fail-on warning' > .husky/pre-push
```

---

## Hook Templates

### Pre-commit: Check Staged Files

Fast check that only analyzes staged files:

```bash
#!/bin/sh
# .husky/pre-commit

# Skip if no staged files
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|py|java|cs|php)$')
if [ -z "$STAGED" ]; then
  exit 0
fi

# Run Drift check on staged files
drift check --staged --fail-on error

# Exit with Drift's exit code
exit $?
```

### Pre-push: Full Quality Gate

More thorough check before pushing:

```bash
#!/bin/sh
# .husky/pre-push

# Run incremental scan
drift scan --incremental --timeout 120

# Run quality gate
drift gate --fail-on warning

exit $?
```

### Commit-msg: Pattern in Commit Message

Optionally include pattern info in commits:

```bash
#!/bin/sh
# .husky/commit-msg

# Get current pattern health
HEALTH=$(drift status --json | jq -r '.healthScore // "?"')

# Append to commit message if health changed
if [ "$HEALTH" != "?" ]; then
  echo "" >> "$1"
  echo "[drift: health=$HEALTH]" >> "$1"
fi
```

---

## Manual Git Hooks (No Husky)

### Pre-commit

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Make executable: chmod +x .git/hooks/pre-commit

if command -v drift &> /dev/null; then
  drift check --staged --fail-on error
fi
```

### Pre-push

```bash
#!/bin/sh
# .git/hooks/pre-push

if command -v drift &> /dev/null; then
  drift scan --incremental
  drift gate --fail-on warning
fi
```

---

## Lefthook Configuration

Alternative to Husky using [Lefthook](https://github.com/evilmartians/lefthook):

```yaml
# lefthook.yml
pre-commit:
  commands:
    drift-check:
      glob: "*.{ts,tsx,js,jsx,py,java,cs,php}"
      run: drift check --staged --fail-on error

pre-push:
  commands:
    drift-gate:
      run: |
        drift scan --incremental
        drift gate --fail-on warning
```

---

## lint-staged Integration

Combine with lint-staged for efficient pre-commit:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "drift check --files"
    ],
    "*.py": [
      "black",
      "drift check --files"
    ]
  }
}
```

---

## Bypassing Hooks

When you need to skip hooks (use sparingly):

```bash
# Skip pre-commit
git commit --no-verify -m "WIP: work in progress"

# Skip pre-push
git push --no-verify
```

---

## Performance Tips

### 1. Use `--staged` for pre-commit

Only checks files being committed, not the entire codebase:

```bash
drift check --staged  # Fast: only staged files
drift check           # Slow: all files
```

### 2. Set reasonable timeouts

Prevent hooks from blocking too long:

```bash
drift scan --incremental --timeout 60  # 1 minute max
```

### 3. Skip on CI

Hooks are redundant in CI (CI runs its own checks):

```bash
#!/bin/sh
# Skip if running in CI
if [ -n "$CI" ]; then
  exit 0
fi

drift check --staged
```

### 4. Cache warm-up

First run after clone is slow. Warm up the cache:

```bash
# After cloning
drift init --yes
drift scan  # Initial full scan
# Now hooks will be fast
```

---

## Monorepo Hooks

For monorepos, scope hooks to changed packages:

```bash
#!/bin/sh
# .husky/pre-commit

# Get changed packages
CHANGED_PACKAGES=$(git diff --cached --name-only | grep -oE '^packages/[^/]+' | sort -u)

for pkg in $CHANGED_PACKAGES; do
  echo "Checking $pkg..."
  drift check --staged --root "$pkg" --fail-on error
done
```

---

## Troubleshooting

### Hook not running

1. Check hook is executable: `chmod +x .husky/pre-commit`
2. Verify Husky is installed: `npx husky --version`
3. Check git config: `git config core.hooksPath`

### Hook too slow

1. Use `--staged` flag
2. Add timeout: `--timeout 30`
3. Check `.driftignore` excludes large directories

### Drift not found

Add to PATH or use full path:

```bash
#!/bin/sh
# Use npx if drift not in PATH
npx driftdetect check --staged --fail-on error
```

### False positives blocking commits

1. Review violations: `drift check --staged --verbose`
2. Approve legitimate patterns: `drift approve <id>`
3. Temporarily bypass: `git commit --no-verify`

---

## Team Setup

### Share hook configuration

Commit Husky config to repo:

```bash
# .husky/ is committed
git add .husky/
git commit -m "Add Drift git hooks"
```

### Auto-install hooks

Add to `package.json`:

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

Now hooks install automatically on `npm install`.

---

## Next Steps

- [CI Integration](CI-Integration) — Full CI/CD setup
- [Quality Gates](Quality-Gates) — Configure gate policies
- [Configuration](Configuration) — Customize Drift settings
