# .session-specs/ — Active Session Specifications

> This folder contains specs for the 45-session Oracle rebuild.
> Each spec is created BEFORE the session starts, approved by Dave, then executed.

---

## Naming Convention

```
SESSION_[N]_SPEC.md
```

Examples:

- `SESSION_1_SPEC.md` — Foundation: Database schema verification
- `SESSION_6_SPEC.md` — Calculation Engines: FC60 implementation
- `SESSION_13_SPEC.md` — AI & Reading Types: Wisdom AI setup

---

## Workflow

1. Claude reads SESSION_LOG.md to identify next session
2. Claude creates the spec file in this folder
3. Dave reviews and approves (or requests changes)
4. Claude executes the approved spec
5. Claude updates SESSION_LOG.md with results

---

## Quality Standard

Every spec MUST include:

- **Objectives** — what gets built (specific, measurable)
- **Files** — exact paths to create or modify
- **Acceptance criteria** — how to verify success
- **Tests** — what tests to write and expected outcomes
- **Dependencies** — what must exist from previous sessions

---

## Status

| Session | Spec            | Status  |
| ------- | --------------- | ------- |
| 1       | Not yet created | Pending |
| 2-45    | Not yet created | Pending |

---

## Reference

- Old specs from 16-session scaffolding: `.specs/` (READ-ONLY reference)
- Session tracker: `SESSION_LOG.md`
- Block definitions: `CLAUDE.md` → Current State → 45-Session Blocks
