# Port plan — merging `claude-il` into `main` (6 Aug 2026)

**This document is the conflict charter.** It was written *before* the merge and is the authority
for every resolution in it. Where the merge deviates from this plan, the deviation is recorded at
the foot with its reason.

## What happened

Two sessions ran the same pack — `~/Downloads/todo-workspace-prompt.md` — at the same time, in two
worktrees, neither knowing about the other. `main` (this tree) and `claude-il`
(`/Users/nickphysick/ScriptAlly-il`) both branched from **`9033b04`** on 5 Aug.

| | commits since base | what it carries |
|---|---|---|
| `main` | 3 | the sweep-tool removal; a Phase 0B run; a Phase 1a run (routes, nav section, counting law) |
| `claude-il` | 29 | the whole app-shell rebuild (double-decker, mega-menus, decoupled rail, polish pass) **and** its own further-along run of the same pack |

`claude-il` is the line that survives. It is ten times the work and further through the pack. Three
of `main`'s commits are being merged for four specific things, named below.

**Direction:** `claude-il` merges **into `main`**, in this tree, so `main` ends as the sole line and
`claude-il` retires. Nothing is ever written into the `claude-il` worktree.

## The charter

1. **`claude-il` is the base wherever the two collide.** Its pages, its extractions and its
   `dedupeAgentCards` stand. `dedupeAgentCards` **supersedes** main's duplicate-row fix.
2. **`main` wins on exactly four items**, and only these:
   - **the `kind` facet actually copied in `derivedCard`** — the cause. `claude-il` guarded the
     symptom; its guard is KEPT as belt-and-braces.
   - **the `agent.name` fallback** — `db.tsx:667` on their numbering, plus the three `${a.name}`
     sibling sites.
   - **the `clearedToday` `queryId` dedupe** — a *separate* bug from the row duplication, so it
     stands alongside `dedupeAgentCards`, not instead of it.
   - **the four-group nav + fifth rail rib** — Nick's call this session. `claude-il` still files
     To-do under Querying with a four-rib rail.
3. **The counting law is not assumed equivalent.** Procedure below. One module survives; the loser
   is **deleted**, not left stranded.
4. Full gates on the merge commit, then `reports/STATE.md`, then a dev deploy.

## Uncontested — lands with no conflict

`claude-il` never touches these, so `main`'s versions apply as-is. Two of the four charter items
land here for free:

- `src/components/shell/shellV2Nav.ts` + `shellV2Nav.test.ts` — **the four-group nav + fifth rib**
- `src/lib/clearedToday.ts` + `clearedToday.test.ts` — **the queryId dedupe**
- `src/lib/shellSidebar.ts` + `shellSidebar.test.ts` — `LedgerTiles.actionable`, `deskNotice`'s
  narrowed input *(subject to the counting-law verdict — see below)*
- `src/marketing/routeTiers.ts` — the three new To-do paths
- `src/lib/todoWorkspaceP0B.test.ts` — main's source-level locks
- `src/components/RecomputeSweep.tsx` — **deleted** by main, untouched by them, so the deletion
  applies silently. ⚠️ Its `App.tsx` import and route still exist on their side and MUST be removed
  by hand during the App.tsx resolution, or the build breaks on a missing module.
- `reports/recompute-sweep.md`, `src/lib/recomputeQuery.test.ts` — main only.

The three design refs (`todo-audit.md`, `todo-ecosystem.html`, `todo-workspace-pages.html`) were
added by **both** sides and are **byte-identical** (same source files, same copy). No conflict.

## The seven conflicts, and who wins each

| # | File | Resolution |
|---|---|---|
| 1 | `src/App.tsx` | **Theirs**, plus two edits: strip the `RecomputeSweep` import + hash route (see above); delete main's `TodoComingPage` mount — their `TodoPlaceholderPage` supersedes it. |
| 2 | `src/lib/todoBoard.ts` | **Theirs** as base. Port in **`kind: c.kind` inside `derivedCard`** — the one line that is the whole cause. Keep their `dedupeAgentCards`. `silentDays` **converged** on both sides (same fix, same placement, same reasoning) — take theirs, no port needed. Main's `actionableCount` per the counting-law procedure. |
| 3 | `src/components/shell/shellV2Nav.ts` *(not a conflict, listed for completeness)* | Main — the nav shape. |
| 4 | `src/components/shell/ShellSidebar.tsx` | **Theirs** as base (shell rebuild). Port in the counting-law read and the **group-row dot + count**, adapted to whatever the rebuilt component's structure is. If the rebuild has moved the nav out of this component, the port follows the nav to its new home. |
| 5 | `src/components/shell/ShellV2.tsx` | **Theirs** as base. Port in the **fifth rib's icon** (`RAIL_ICONS.todo`), the four page icons, and `todo` in `FLYOUT_SECTIONS`. Same adaptation caveat. |
| 6 | `src/components/shell/shellV2Smoke.test.tsx` | Neither — **reconcile to the merged source**. A test file is not a side to pick; it is rewritten to assert what the merged shell actually does. |
| 7 | `src/components/todo/ToDoPage.tsx` | **Theirs** wholesale. Main's only change here was the KIND pill guard, which their commit already made. |
| 8 | `src/lib/searchPalette.ts` | **Union.** Both indexed the To-do pages; keep one entry per real route, no duplicates, and whatever else either side added. |
| 9 | `src/lib/db.tsx` | Auto-merges. ⚠️ **Verify after**: `aName = agentPrimary(agent)` survived and no `${a.name}` remains. |

**Deleted as superseded:** `src/components/todo/TodoComingPage.tsx` and `todoComing.css` — their
`TodoPlaceholderPage.tsx` does the same job and is further along.

## The counting-law procedure (charter item 3)

Two implementations of one rule:

- **main** — `actionableCount(board, gaps)` in `todoBoard.ts`, returning a single number.
- **claude-il** — `todoCounts(board, gaps, snoozed)` in `todoCount.ts`, returning the full
  `{urgent, housekeeping, yours, notes, snoozed, actionable}` shape the side container's LISTS rows
  need, plus `todoBadgeCount`.

Read side by side the `actionable` formulas look identical (`urgent + gaps + nt-lane tasks`), and
both files claim in prose to guard the double-count. **Prose is not a test.** So:

1. Write **one** promoted-task double-count fixture: a user task dated TODAY, which the assembler
   promotes into the `do` lane. The correct answer is that it is counted **once**.
2. Run it against **both** modules.
3. Keep whichever passes. **If both pass, keep `todoCount.ts` and delete `actionableCount`** — it
   is the richer shape and the side container already reads it.
4. The loser is removed in the merge commit, and every caller repointed. One module, one rule.

## Verification before the merge commit

- `tsc --noEmit` 0 · production build · full Vitest, with `set -o pipefail`.
- Charter spot-checks, by grep, on the merged tree: `kind: c.kind` present in `derivedCard`;
  `agentPrimary` in the engine and no `${a.name}`; `spokenFor` in `clearedToday`; the five-rib
  `SHELL_RAIL`; `dedupeAgentCards` still present.

## Deviations from this plan

Three, all discovered during resolution and all resolved toward the charter's intent rather than
its letter.

**1. `claude-il` had already built the four-group nav — better placed than main's.** The charter
gave main the nav on the assumption that `claude-il` still filed To-do under Querying. It does, in
`shellV2Nav.ts` — but that model is no longer the app's IA. The shell rebuild moved the navigation
into `WorkspaceShell`, which takes the IA as a **prop** from `workspaceSections()`, and there To-do
is already an expandable group of four children carrying its count and urgency flag, in a five-entry
rail. So main did not "win" this item; both lines reached the same answer independently, and
`claude-il`'s is the live one. Main's `shellV2Nav.ts` change was kept regardless, because that
module is **still read** — by the <768px mobile bar's breadcrumb and by `AppShell`'s `routeSec`, so
without it `/todo/today` would crumb to nothing on a phone.

**2. Main's rail/panel ports went into retired code.** `claude-il` deleted the rail, its flyouts and
the side panel from `ShellV2.tsx` (superseded by `WorkspaceShell`), so main's `RAIL_ICONS.todo`, the
four page icons and `FLYOUT_SECTIONS` addition had nowhere to land — they were ports into a block
that no longer exists. Taken as theirs, deleted with the block. Related and **flagged for a later
sweep, not done here**: `ShellSidebarBody` is no longer mounted anywhere in the app — only a test
renders it — so main's group-row dot and count now sit in a live file that nothing displays. It is
harmless and internally consistent; deleting a component the other line retired is not this merge's
business.

**3. The counting-law bake-off: both passed, so theirs survives — but main's TEST did not.** Run
before the merge against both implementations, on one fixture (a task dated today, which the
assembler promotes into the urgent lane; correct answer: counted once). **Both passed**, including
the anchor proving the fixture genuinely promotes, so neither passed vacuously. Per the charter,
`todoCount.ts` is kept and `actionableCount` is **deleted**, along with `LedgerTiles.actionable`
and the narrowed `deskNotice` signature that existed only to serve it.

Main's *test*, however, was kept and repointed, because it is stronger than the one it joins: the
law's own suite (`todoWorkspace.test.ts`) exercises `todoCounts` against **hand-built board
objects**, which proves the sum but never its premise — that the assembler promotes at all. If
promotion silently stopped, every one of those tests would still pass while the badge went wrong.
Main's version runs the real `assembleBoard` and states the anchor explicitly. It now sits in
`todoBoard.test.ts` pointed at `todoCounts`, complementing rather than duplicating.

**One test reconciled, neither side's:** `shellV2Smoke`'s crumb case expected `<b>To-do</b>` for
`/todo`. Both lines' IA labels that page **"To-do list"** (`TODO_ROUTES` and `shellV2Nav` agree), so
the expectation was stale against `claude-il`'s own nav, not a real disagreement. Updated to the
merged truth, with `/todo/today` added.
