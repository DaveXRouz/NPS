# Master Workflow — All Paths Through the 45-Session Build

> This is the map of EVERYTHING that can happen during the Oracle rebuild.
> Every terminal session, every workflow, every decision point, every connection.
> Claude Code reads this when the path forward isn't obvious.
>
> **Note:** The `.specs/` and `.session-specs/` directories have been archived and deleted.
> Session specs are no longer used. Plans are created inline per CLAUDE.md rules.

---

## THE BIG PICTURE

```
45 Sessions → 8 Blocks → 1 Working System

Each session follows:
  SPEC → APPROVE → EXECUTE → TEST → LOG → NEXT
```

The 45 sessions are NOT rigid. Sessions can:
- Complete faster than expected (merge two sessions into one)
- Take longer than expected (split one session across multiple terminals)
- Discover new work (add sessions to a block)
- Depend on each other (block until prerequisite is done)

This document maps ALL those paths.

---

## WORKFLOW 1: NORMAL SESSION (Happy Path)

This is the default. 80% of sessions follow this exact flow.

```
┌─────────────────────────────────────────────┐
│  DAVE OPENS TERMINAL                         │
│  Says: "continue" or "next" or "go"         │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  BOOT (silent, ~10 seconds)                  │
│  1. Read CLAUDE.md                           │
│  2. Read BUILD_HISTORY.md → find next session  │
│  3. Run .claude/startup.md checks            │
│  4. Show: "Continuing session N: [task]"     │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  CREATE PLAN                                 │
│  (Specs archived — plans created inline)     │
│                                              │
│  Create comprehensive plan → show to Dave    │
│  Dave approves → Go to EXECUTE               │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  PLAN CREATION                               │
│  1. Read logic/ docs for algorithms          │
│  2. Read CURRENT_STATE.md for gaps           │
│  3. Create comprehensive inline plan         │
│  4. Show plan to Dave                        │
│  5. Wait for approval                        │
│                                              │
│  Dave says "approved" → EXECUTE              │
│  Dave says "change X" → edit plan, re-show   │
│  Dave says "skip this" → Go to NEXT SESSION  │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  EXECUTE (Phase 2, silent)                   │
│  1. Follow spec step by step                 │
│  2. Write code → format → lint → test        │
│  3. Each file through quality pipeline       │
│  4. Git commit after each milestone          │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  SESSION END                                 │
│  1. Run full test suite for affected layers  │
│  2. Update BUILD_HISTORY.md                    │
│  3. Final git commit + push                  │
│  4. Define next session's task               │
│  5. Show summary to Dave                     │
└─────────────────────────────────────────────┘
```

---

## WORKFLOW 2: SPEC-ONLY SESSION (Dave asks for spec but not execution)

Dave says something like: "write the spec for session 7" or "plan session 13"

```
┌─────────────────────────────────────────────┐
│  DAVE ASKS FOR SPEC ONLY                     │
│  "Write the spec for session [N]"            │
│  "Plan the next session"                     │
│  "What would session 7 look like?"           │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  CONTEXT GATHERING                           │
│  1. Read CLAUDE.md → find block for [N]      │
│  2. Read BUILD_HISTORY.md → what's done so far │
│  3. Read logic/ → algorithms if applicable   │
│  4. Read CURRENT_STATE.md → gaps             │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  MODEL SELECTION FOR SPEC WRITING            │
│                                              │
│  Use Sonnet for spec creation (fast,         │
│  structured writing, cost-effective).        │
│  Use Opus only if the session involves       │
│  complex architecture or security decisions. │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  WRITE PLAN                                  │
│  (Inline — specs archived)                   │
│                                              │
│  Must include:                               │
│  - Session number + block name               │
│  - Objectives (specific, measurable)         │
│  - Prerequisites (what must exist)           │
│  - Files to create/modify (exact paths)      │
│  - Implementation steps (ordered)            │
│  - Tests to write                            │
│  - Acceptance criteria (2-min verification)  │
│  - Dependencies on other sessions            │
│  - Estimated effort (Low/Medium/High)        │
│  - Risk assessment                           │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  SHOW PLAN TO DAVE                           │
│                                              │
│  Dave reviews. Three outcomes:               │
│  ✅ "Approved" → plan saved, ready later     │
│  ✏️  "Change X" → edit and re-show           │
│  ▶️  "Do it now" → jump to EXECUTE workflow  │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  GIT COMMIT (if plan saved to file)           │
│  git commit -m "[plan] session N: [title]"   │
│  git push                                    │
└─────────────────────────────────────────────┘
```

---

## WORKFLOW 3: BATCH SPEC CREATION (Dave asks for multiple specs)

Dave says: "write specs for sessions 1 through 5" or "plan the whole Foundation block"

```
┌─────────────────────────────────────────────┐
│  DAVE ASKS FOR MULTIPLE SPECS                │
│  "Plan sessions 1-5"                         │
│  "Write all Foundation block specs"          │
│  "Spec out the next 3 sessions"             │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  CONTEXT GATHERING (same as Workflow 2)      │
│  But gather context for ALL sessions at once │
│  This prevents contradictions between specs  │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  PLAN THE BATCH                              │
│  Before writing any spec, create a brief     │
│  OUTLINE showing:                            │
│  - Session N: [one-line objective]           │
│  - Session N+1: [one-line objective]         │
│  - Session N+2: [one-line objective]         │
│  - Dependencies between them                 │
│  - What each session produces that the next  │
│    one needs                                 │
│                                              │
│  Show outline to Dave first.                 │
│  "Does this breakdown make sense?"           │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  WRITE SPECS (sequentially or with Tasks)    │
│                                              │
│  If < 4 specs: write sequentially            │
│  If 4+ specs: use Task tool (subagents)      │
│    Agent A: write SESSION_[N]_SPEC.md        │
│    Agent B: write SESSION_[N+1]_SPEC.md      │
│    Agent C: write SESSION_[N+2]_SPEC.md      │
│  Main: review all for consistency            │
│                                              │
│  CRITICAL: Each spec must list what it       │
│  RECEIVES from the previous session and      │
│  what it PRODUCES for the next session.      │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  SHOW ALL SPECS TO DAVE                      │
│  Present as a package, not one at a time.    │
│  Highlight the dependency chain.             │
│                                              │
│  Git commit all specs in one commit:         │
│  "[spec] sessions N-M: [block name]"         │
└─────────────────────────────────────────────┘
```

---

## WORKFLOW 4: SESSION OVERFLOW (Work is too big for one session)

A session turns out to need more work than expected. Context runs out, or the task is massive.

```
┌─────────────────────────────────────────────┐
│  DURING EXECUTION, ONE OF THESE HAPPENS:     │
│                                              │
│  A) Context hits 70% → auto-compact          │
│  B) After compaction, still too large        │
│  C) Spec has 15+ files to create/modify     │
│  D) Implementation reveals unexpected scope  │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  SPLIT DECISION                              │
│                                              │
│  Find the NATURAL BOUNDARY:                  │
│  - After a milestone that can be tested      │
│  - Between independent sub-features          │
│  - At a layer boundary (API done, frontend   │
│    next)                                     │
│                                              │
│  DO NOT split in the middle of a feature.    │
│  The split point must be a stable state.     │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  COMPLETE CURRENT PART                       │
│  1. Finish what's started (current milestone)│
│  2. Run tests on completed work              │
│  3. Git commit                               │
│  4. Update BUILD_HISTORY.md:                   │
│     - Mark session as "PARTIAL"              │
│     - List what was completed                │
│     - List what remains                      │
│     - Next: "Session [N] Part 2: [remaining]"│
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  CREATE CONTINUATION PLAN                    │
│  (Use 'b' suffix for continuations)          │
│                                              │
│  This plan covers ONLY the remaining work.   │
│  It starts with: "Continuation of Session N" │
│  Prerequisites: "Session N Part 1 completed" │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  TELL DAVE                                   │
│  "Session N is too large for one context.    │
│   Part 1 is done: [what was completed].      │
│   Part 2 spec created. Open new terminal     │
│   and say 'continue' to pick up."            │
└─────────────────────────────────────────────┘
```

**Naming convention for split sessions:**
```
Session 7    → original plan
Session 7b   → continuation (Part 2)
Session 7c   → rare third part
```

---

## WORKFLOW 5: SCOPE DISCOVERY (New work found during a session)

While working on Session 7, you discover something that needs a whole new session.

```
┌─────────────────────────────────────────────┐
│  DURING SESSION N, SOMETHING IS DISCOVERED:  │
│                                              │
│  - A file needs major refactoring            │
│  - A missing feature blocks the current work │
│  - A bug in a different layer                │
│  - A security issue that needs attention     │
│  - An architecture decision that affects     │
│    future sessions                           │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  TRIAGE: Is it blocking current session?     │
│                                              │
│  YES (blocks current work):                  │
│  → Fix it NOW as part of current session     │
│  → Note it in BUILD_HISTORY.md under "Issues"  │
│  → Add extra time to current session         │
│                                              │
│  NO (important but not blocking):            │
│  → Don't fix it now                          │
│  → Log it as a DISCOVERED TASK               │
│  → Continue current session                  │
└──────────────┬──────────────────────────────┘
               ▼ (if not blocking)
┌─────────────────────────────────────────────┐
│  LOG THE DISCOVERED TASK                     │
│                                              │
│  Add to BUILD_HISTORY.md → Stitching Issues:   │
│  | # | Issue | Layers | Status | Fix |       │
│  | 1 | [what] | [where] | 🔴 Open | [how] │ │
│                                              │
│  If it's big enough for its own session:     │
│  Add to BUILD_HISTORY.md → Session Log:        │
│  "Discovered: [task] needs its own session.  │
│   Recommend inserting after Session [M]."    │
│                                              │
│  Dave decides whether to:                    │
│  A) Add a new session to the current block   │
│  B) Defer to a later block                   │
│  C) Ignore if low priority                   │
└─────────────────────────────────────────────┘
```

**How new sessions get numbered:**
```
Original plan: Session 7, Session 8, Session 9
New session discovered after 7: Session 7.1

This avoids renumbering existing sessions.
```

---

## WORKFLOW 6: BLOCK TRANSITION (Moving from one block to the next)

When the last session of a block finishes, there's a checkpoint.

```
┌─────────────────────────────────────────────┐
│  LAST SESSION OF BLOCK COMPLETES             │
│  (e.g., Session 5 finishes Foundation block) │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  BLOCK COMPLETION CHECKLIST                  │
│                                              │
│  1. All sessions in block are complete       │
│  2. All tests pass (run full test suite)     │
│  3. No open Stitching Issues for this block  │
│  4. BUILD_HISTORY.md is current                │
│  5. All session tasks verified complete       │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  BLOCK REPORT TO DAVE                        │
│  Show a summary:                             │
│                                              │
│  "Foundation Block Complete (Sessions 1-5)"  │
│  - Files created: [count]                    │
│  - Files modified: [count]                   │
│  - Tests: [total passing]                    │
│  - Coverage: [estimate]                      │
│  - Discovered tasks: [list]                  │
│  - Ready for next block: [yes/no]            │
│                                              │
│  If discovered tasks exist:                  │
│  "Should we handle these before moving on?"  │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  NEXT BLOCK PREPARATION                      │
│                                              │
│  1. Update BUILD_HISTORY.md:                   │
│     "Current block: [next block name]"       │
│  2. Read next block's reference specs        │
│  3. Optionally: batch-create specs for next  │
│     block (Workflow 3)                        │
│  4. Start next session when Dave says "go"   │
└─────────────────────────────────────────────┘
```

---

## WORKFLOW 7: NEW TERMINAL SESSION (Context is fresh)

Dave closes the terminal and opens a new one. Everything must be reconstructed from files.

```
┌─────────────────────────────────────────────┐
│  NEW TERMINAL OPENED                         │
│  Context is empty. No memory of previous     │
│  conversation. Only files exist.             │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  BOOT SEQUENCE (from CLAUDE.md)              │
│  1. Read CLAUDE.md → full project rules      │
│  2. Read BUILD_HISTORY.md → find where we are  │
│     - How many sessions completed?           │
│     - What block are we in?                  │
│     - What does "Next:" say?                 │
│  3. Read .claude/startup.md → run checks     │
│  4. Show status line                         │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  WHAT DID DAVE SAY?                          │
│                                              │
│  "continue" / "next" / "go" / nothing:       │
│  → Follow the "Next:" field in BUILD_HISTORY   │
│  → Use Workflow 1 (Normal Session)           │
│                                              │
│  "write spec for session N":                 │
│  → Use Workflow 2 (Spec-Only)                │
│                                              │
│  "plan sessions N through M":                │
│  → Use Workflow 3 (Batch Specs)              │
│                                              │
│  Specific task (not session-related):        │
│  → Skip session flow, do the task directly   │
│  → Still follow quality pipeline             │
│  → Still git commit when done                │
│                                              │
│  "what's the status?":                       │
│  → Read BUILD_HISTORY.md → summarize           │
│  → Show current state summary                │
│  → Don't start any work                      │
└─────────────────────────────────────────────┘
```

**Critical rule for new terminals:**
Everything the AI needs to know is in the files. If it's not in CLAUDE.md, BUILD_HISTORY.md, or the spec files — it doesn't exist. Never assume context from a previous terminal.

---

## WORKFLOW 8: MULTI-SESSION SPEC PIPELINE (Factory Mode)

Dave wants to prepare specs ahead of execution — like a factory preparing blueprints.

```
TERMINAL A (Spec Factory):
  Session 6 spec → Session 7 spec → Session 8 spec → ...
  (All reviewed and approved)

TERMINAL B (Execution):
  Execute Session 6 → Execute Session 7 → Execute Session 8 → ...
  (Each reads pre-approved spec)

This lets Dave batch-approve specs while Claude executes them.
```

### Flow:

```
┌─────────────────────────────────────────────┐
│  SPEC FACTORY TERMINAL                       │
│  Dave: "Write specs for all Engine sessions" │
└──────────────┬──────────────────────────────┘
               ▼
│  1. Read block definition from CLAUDE.md     │
│  2. Read CURRENT_STATE.md for gaps    │
│  3. Create outline of all sessions in block  │
│  4. Dave approves outline                    │
│  5. Write each spec                          │
│  6. Dave reviews each spec                   │
│  7. Git commit all approved specs            │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  EXECUTION TERMINAL (separate session)       │
│  Dave: "go" or "continue"                    │
│                                              │
│  Boot → finds BUILD_HISTORY.md "Next" →        │
│  finds pre-written spec → shows plan →       │
│  Dave: "approved" → executes                 │
│                                              │
│  No spec creation needed — already done!     │
└─────────────────────────────────────────────┘
```

---

## WORKFLOW 9: ERROR DURING SESSION (Something breaks)

```
┌─────────────────────────────────────────────┐
│  ERROR ENCOUNTERED DURING EXECUTION          │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  3-STRIKE RULE (from CLAUDE.md)              │
│                                              │
│  Strike 1: Try to fix silently              │
│  Strike 2: Try different approach silently   │
│  Strike 3: Try one more time silently        │
│                                              │
│  All 3 fail?                                 │
│  → STOP execution                            │
│  → Tell Dave exactly what's wrong            │
│  → Show what was tried                       │
│  → Ask for guidance                          │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  RECOVERY OPTIONS (Dave decides):            │
│                                              │
│  A) "Try X instead" → Claude tries approach  │
│  B) "Skip this part" → Note in spec as       │
│     skipped, continue with rest              │
│  C) "Roll back" → git stash/revert, mark     │
│     session as incomplete                    │
│  D) "Open issue" → Log in Stitching Issues,  │
│     continue with workaround                 │
└─────────────────────────────────────────────┘
```

---

## CONNECTION MAP: How Everything Links

```
CLAUDE.md (master rules)
    │
    ├── .claude/startup.md (boot checks)
    ├── .claude/workflows.md (terminal modes)
    ├── .claude/templates.md (file templates)
    ├── .claude/master-workflow.md ← THIS FILE (all paths)
    │
    ├── BUILD_HISTORY.md (state tracker)
    │   ├── "Next:" field → drives Workflow 1
    │   ├── Session entries → history
    │   ├── Stitching Issues → discovered work
    │   └── Cross-Terminal Dependencies → multi-terminal
    │
    │
    ├── logic/ (algorithm docs)
    │   ├── FC60_ALGORITHM.md → math formulas
    │   ├── NUMEROLOGY_SYSTEMS.md → calculation systems
    │   ├── SCANNER_ORACLE_LOOP.md → collaboration pattern
    │   └── RECIPES.md → common task step-by-step
    │
    ├── CURRENT_STATE.md (current reality snapshot)
    │
    └── .project/ (project management playbooks)
```

### Information Flow:

```
Dave says "go"
    → CLAUDE.md tells Claude HOW to work
    → BUILD_HISTORY.md tells Claude WHAT to work on
    → logic/ tells Claude the ALGORITHMS
    → CURRENT_STATE.md tells Claude what ACTUALLY EXISTS
    → .claude/ files tell Claude HOW TO BEHAVE
```

---

## DECISION TREE: What to Do When

```
Dave opens terminal and says...

"continue" / "next" / "go"
    └─→ Read BUILD_HISTORY.md "Next:" field
        ├─→ Spec exists? → Execute (Workflow 1)
        └─→ No spec? → Create spec first (Workflow 2 → 1)

"write spec for session N"
    └─→ Workflow 2 (Spec-Only)

"plan sessions N to M" / "plan the [block] block"
    └─→ Workflow 3 (Batch Specs)

"what's the status?"
    └─→ Read BUILD_HISTORY.md → summarize

"fix [specific thing]"
    └─→ Skip session flow, fix directly, commit

"start session N" (out of order)
    └─→ Check prerequisites from BUILD_HISTORY
        ├─→ Prerequisites met → Execute (Workflow 1)
        └─→ Prerequisites missing → Warn Dave, suggest order

(says nothing)
    └─→ Boot → show status → wait for instruction
```

---

## SESSION NUMBERING RULES

```
Original sessions:    1, 2, 3, 4, 5, 6, 7, ...
Split continuations:  7b, 7c (same session, multiple parts)
Discovered sessions:  7.1, 7.2 (new work inserted after 7)
```

**Never renumber existing sessions.** If Session 12 discovers new work, it becomes 12.1, not a shift of 13-14-15.

---

## QUALITY CHECKPOINTS

### Every Session Must Pass:
- [ ] All new code has tests
- [ ] All tests pass (existing + new)
- [ ] Linting clean (ruff/eslint/clippy)
- [ ] Formatting clean (black/prettier/rustfmt)
- [ ] Pre-commit hook passes
- [ ] BUILD_HISTORY.md updated
- [ ] Git committed and pushed
- [ ] "Next:" field defined in BUILD_HISTORY.md

### Every Block Must Pass (end of block):
- [ ] All sessions in block complete
- [ ] No open Stitching Issues for this block
- [ ] Full test suite passes
- [ ] Block report shown to Dave
- [ ] Dave confirms ready for next block

### Project Completion Must Pass:
- [ ] All 45 sessions complete (including any .1 additions)
- [ ] All Stitching Issues resolved
- [ ] Full integration test suite passes
- [ ] docker-compose up starts everything healthy
- [ ] Production readiness checklist passes
- [ ] Dave does final review

---

## EXAMPLE: A REAL WORKFLOW SEQUENCE

Here's how a typical day might look:

```
Terminal 1: Dave says "plan the foundation block"
  → Claude creates outline for sessions 1-5
  → Dave approves
  → Claude writes SESSION_1_SPEC.md through SESSION_5_SPEC.md
  → Dave reviews each, approves with small edits
  → Claude commits all 5 specs
  → Done. Close terminal.

Terminal 2: Dave says "go"
  → Boot → BUILD_HISTORY.md says "Next: Session 1"
  → Spec exists: SESSION_1_SPEC.md
  → Claude shows plan based on spec
  → Dave: "approved"
  → Claude executes silently
  → Tests pass, commits, updates log
  → "Next: Session 2"
  → Done. Close terminal.

Terminal 3: Dave says "continue"
  → Boot → BUILD_HISTORY.md says "Next: Session 2"
  → Spec exists: SESSION_2_SPEC.md
  → Claude shows plan, Dave approves
  → Halfway through, context hits 70%
  → Claude auto-compacts, continues
  → Session 2 completes
  → "Next: Session 3"
  → Done. Close terminal.

Terminal 4: Dave says "next"
  → Boot → BUILD_HISTORY.md says "Next: Session 3"
  → Session 3 turns out to be HUGE
  → Claude splits: Session 3 Part 1 done
  → Creates SESSION_3b_SPEC.md for remaining work
  → "Next: Session 3 Part 2"
  → Done. Close terminal.

Terminal 5: Dave says "continue"
  → Boot → BUILD_HISTORY.md says "Next: Session 3 Part 2"
  → Spec exists: SESSION_3b_SPEC.md
  → Completes remaining work
  → "Next: Session 4"
  → Done. Close terminal.
```

---

## RULE: WHEN IN DOUBT

If this document doesn't cover a situation:

1. Read CLAUDE.md for operating rules
2. Read .claude/workflows.md for terminal behavior
3. Ask Dave — but propose a solution, don't just report the problem
4. Log the new situation in BUILD_HISTORY.md so future sessions know about it
5. Suggest adding it to this workflow document

The goal is: **every terminal session knows exactly what to do.** No guessing, no assumptions, no lost context.
