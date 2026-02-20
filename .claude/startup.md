# Claude Code Startup Protocol

> Silent checks to run when opening the project. Only report problems.

---

## Silent Boot Checks

### Check 1: Project Structure
```bash
test -f CLAUDE.md && test -f BUILD_HISTORY.md && test -f docker-compose.yml
test -d api/ && test -d frontend/ && test -d services/ && test -d database/
```
**If missing:** Report which files/folders are missing.

### Check 2: Git Status
```bash
git status --short
git log --oneline -1
```

### Check 3: Environment File
```bash
test -f .env
```
**If missing:** Warn: "No .env file found. Copy from .env.example before running services."

### Check 4: Dependencies
```bash
test -d frontend/node_modules/
```
**If node_modules missing:** Auto-run `cd frontend && npm install` silently.

### Check 5: Docker (optional)
```bash
docker-compose ps 2>/dev/null | grep -c "Up"
```
Don't start Docker automatically. Just note if services are running.

---

## Auto-Format Configuration

**Python:**
```bash
black <file> --line-length 100
ruff check <file> --fix
```

**TypeScript/React:**
```bash
cd frontend && npx prettier --write <file>
cd frontend && npx eslint --fix <file>
```

---

## Security Scan (Every Commit)

Before every `git commit`, run:

```bash
# Check for leaked secrets
grep -rn "sk-ant-\|AKIA\|password\s*=\s*['\"]" --include="*.py" --include="*.ts" --include="*.tsx" . \
  --exclude-dir=.archive --exclude-dir=node_modules --exclude=.env.example

# Check for hardcoded IPs/URLs that should be env vars
grep -rn "localhost:[0-9]\+" --include="*.py" --include="*.ts" . \
  --exclude-dir=node_modules --exclude-dir=.archive --exclude="*.test.*" --exclude="*.spec.*" --exclude="vite.config.*"
```

**If secrets found:** STOP. Do NOT commit. Remove the secret. Use .env variable instead.

---

## Git Stash Safety Net

Before risky operations (deleting files, rewriting 3+ files, schema changes, encryption changes, Docker config), auto-run `git stash`.

- Success → `git stash drop`
- Failure → `git stash pop` and report

---

## Dependency Auto-Install Rules

### Known Safe (install silently):
- Everything in `api/pyproject.toml` [dependencies]
- Everything in `frontend/package.json` [dependencies + devDependencies]
- Everything in `services/oracle/pyproject.toml` [dependencies]
- Standard dev tools: pytest, ruff, black, mypy, eslint, prettier

### Ask First:
- Any package not already in a project manifest file
- System-level packages (apt-get, brew)
- New MCP servers or plugins

### After Any Install:
```bash
pip-audit 2>/dev/null || echo "pip-audit not installed"
cd frontend && npm audit --audit-level=moderate 2>/dev/null
```
