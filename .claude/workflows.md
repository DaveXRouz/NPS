# Claude Code Workflows

---

## How Claude Works in This Project

```
1. CLAUDE.md loads automatically (project instructions)
2. User gives a task
3. Simple task → execute directly, show results
   Complex task → show plan, wait for approval, then execute
4. After execution: format → lint → test → commit
```

**Simple =** single file, obvious fix, direct instruction.
**Complex = ** multi-file, new feature, architecture change, anything ambiguous.

---

## Plan Template

When creating a plan for complex tasks:

```markdown
# Plan — [Task Name]

## What
[What this will accomplish — specific, measurable]

## Steps
### Step 1: [Name]
- Files: [which files created/modified]
- What: [exactly what will be done]

### Step 2: [Name]
[Same structure]

## Files to Create/Modify
- `path/to/file.py` — [purpose]
- `path/to/file.tsx` — [purpose]

## Verification
- [ ] [How to confirm it works]
- [ ] All tests pass
- [ ] No lint errors
```

---

## BUILD_HISTORY.md Entry Format

Each task/session gets logged:

```markdown
## Session [N] — [YYYY-MM-DD]
**Task:** [One sentence]

**Files changed:**
- `path/to/file1.py` — what changed
- `path/to/file2.tsx` — what changed

**Tests:** [X pass / Y fail / Z new tests added]
**Commit:** [commit hash — message]
**Issues:** [Problems found, or "None"]

**Next:** [Clear task for next session]
```

---

## Quality Checklist

Every task must pass:
- [ ] All new code has tests
- [ ] All tests pass (existing + new)
- [ ] Linting clean (ruff/eslint)
- [ ] Formatting clean (black/prettier)
- [ ] Git committed
