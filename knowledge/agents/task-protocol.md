# Task Execution Protocol

Follow these steps for every coding task.

## Step 1: Load Knowledge Index

**Tool:** Read
**Action:** Read `knowledge/README.md` to understand the project structure and available knowledge files.

## Step 2: Identify Relevant Documents

**Tool:** Read, Glob
**Action:** Determine which knowledge files are relevant to the task (features, rules, decisions, workflows).

## Step 3: Load Relevant Documents

**Tool:** Read
**Action:** Read each identified knowledge file in full.

## Step 4: Inspect Source Files

**Tool:** Read, Grep, Glob
**Action:** Find and read the source files that implement the feature or area being changed.

## Step 5: Compare Intent vs. Implementation

**Tool:** Read (already loaded)
**Action:** Compare what the knowledge docs say should exist with what the code actually does.

## Step 6: Report Conflicts

**Tool:** None (output to user)
**Action:** If there are discrepancies, report them clearly before making any changes.

## Step 7: Make the Change

**Tool:** Edit, Write
**Action:** Make the smallest correct implementation change.

## Step 8: Verify

**Tool:** Bash
**Action:** Run `npm run lint && npm run build`. If either fails, fix the errors before proceeding.

## Step 9: Update Knowledge Documents

**Tool:** Edit, Write
**Action:** Update all affected knowledge files to reflect the new behavior.

## Step 10: Record Architectural Decisions

**Tool:** Write
**Action:** If the change is architecture-level, create a new ADR in `knowledge/decisions/`.

## Step 11: Update Memory

**Tool:** Edit
**Action:** Update `memory/known-bugs.md`, `memory/current-priorities.md`, and `memory/lessons-learned.md` if applicable.

## Step 12: Commit and Push

**Tool:** Bash
**Action:** Stage changes, commit with a descriptive message, and push to main.

## Step 13: Checkpoint

**Tool:** Bash
**Action:** If a milestone was reached, create a checkpoint tag:
```bash
npm run checkpoint
git push origin checkpoint-YYYY-MM-DD-description
```

---

**Last Updated:** 2026-07-20 (c12bd44)
