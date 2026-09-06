# Settle the checkout — inventory (read-only)

Taken 6 Sep 2026, 22:00–22:12. **Nothing was changed to produce this.**

⚠️ **STOP CONDITION HIT. Another session is editing the Query Centre RIGHT NOW** — not "was
recently", but during this inventory. The dirty set grew from **6 files to 11** between my first
`git status` at 22:00 and my last at 22:11, and one of the files they are editing is one **I**
created hours ago. Those eleven paths are therefore **not committed by me**, per the brief. Detail
in §1a.

Everything else in the checkout is genuinely abandoned and safe to preserve. Nothing anywhere is
at risk of loss today: no path is untracked-and-unique except report images and two measurement
files, and every worktree's WIP still exists on disk.

---

## 1 · `git status --porcelain` — the primary checkout

`HEAD` is `main` at `9fb3a31c`. **50 commits ahead of `origin/main`, 0 behind.** Nothing staged.
`main..HEAD` and `HEAD..main` are both empty (HEAD *is* main).

### 1a · Modified — all eleven are ONE live stream, and it is not mine

| path | ± | stream | finished or mid-edit |
|---|---|---|---|
| `src/components/Queries.tsx` | 211 | Query Centre · toolbar v2 | **MID-EDIT** |
| `src/components/queries/QueryListView.tsx` | 280 | Query Centre · toolbar v2 | **MID-EDIT** |
| `src/components/queries/respondDesk.test.tsx` | 145 | Query Centre · toolbar v2 | **MID-EDIT** |
| `src/components/queries/QueryCentreGrid.tsx` | 8 | Query Centre · toolbar v2 | **MID-EDIT** |
| `src/components/queries/queryCentreGrid.css` | 9 | Query Centre · toolbar v2 | **MID-EDIT** |
| `src/components/queries/queryListView.css` | 15 | Query Centre · toolbar v2 | **MID-EDIT** |
| `src/lib/queryCentreGrid.ts` | 31 | Query Centre · toolbar v2 | **MID-EDIT** |
| `src/lib/queryCentreGrid.test.ts` | 12 | Query Centre · toolbar v2 | **MID-EDIT** |
| `src/components/shell/F12Shell.tsx` | 48 | Query Centre · toolbar v2 | **MID-EDIT** |
| `src/components/shell/f12.css` | 78 | Query Centre · toolbar v2 | **MID-EDIT** |
| `src/components/shared/ToolbarButton.tsx` | 17 | **mine, being extended by them** | **MID-EDIT** |

604 insertions, 250 deletions. **The tree typechecks clean** (`tsc --noEmit`, exit 0) — which is
why "it compiles" is not the test for whether someone is mid-edit.

**The evidence that this is live, in three independent forms:**

1. **The set grew while I watched.** 22:00 → six files. 22:11 → eleven. `QueryCentreGrid.tsx`,
   `QueryListView.tsx`, both grid stylesheets and `ToolbarButton.tsx` all appeared inside those
   eleven minutes.
2. **Modification times inside the last four seconds.** `src/lib/queryCentreGrid.ts` was written at
   22:06:27 with the wall clock reading 22:06:31.
3. **The content names an unfinished round.** `ToolbarButton.tsx` — the shared component I extracted
   for the QC-chassis round — has gained a `disabled`/`title` pair whose comment reads
   *"⚠️ ADDITIVE (toolbar v2, §2), and the Query Centre's board is why"*. A numbered section of a
   round in progress, written by someone who has read my extraction and is building on it.

That third point is the one that settles it. Committing these under my name would put ten files of
somebody else's half-finished §2 into `main` with a message about settling a checkout, and it would
do so *while they are still typing into them*.

### 1b · Untracked — 93 report images, no source

| path | count | stream | judgement |
|---|---|---|---|
| `reports/masthead-rebuild/*.png` | 84 | masthead rebuild | finished output, safe to commit |
| `reports/illustrated-masthead/*.png` | 4 | illustrated masthead | finished output |
| `reports/calendar-v58/`, `-v63/`, `-v54/`, `-v40/` | 5 | calendar rounds | finished output |

Screenshots dropped by finished measurement runs. No source file is untracked anywhere in the
primary checkout.

---

## 2 · `git stash list` — two, both 21 June 2026, both stale

| ref | branch it was taken on | contents |
|---|---|---|
| `stash@{0}` | `fix/dashboard-skeleton` | *"parked: whatsLive.css (parallel rules-tests work)"* |
| `stash@{1}` | `chore/rules-tests` | rules-tests WIP, 6 files |

Both were taken on branches that **no longer exist** (the 8 Jul consolidation retired every feature
branch). They are 11 weeks old and have survived that consolidation, so nothing is waiting on them.
**Action: preserve to `wip/` branches so the stash list empties** — a stash is invisible to `git
log` and is exactly the kind of thing that is lost by accident.

---

## 3 · `git worktree list` — five, two carrying real work

| worktree | HEAD | ancestor of `main`? | dirty | last touched | judgement |
|---|---|---|---|---|---|
| `/Users/nickphysick/ScriptAlly-app` | `9fb3a31c` `main` | — | 11 + 93 | now | **live, another session** |
| `/private/tmp/sa-n1` | `43a7222b` detached | yes | 9 M + 3 ?? | **4 Sep 23:32** | abandoned, **holds unique work** |
| `/private/tmp/sa-p5` | `0a677cb9` detached | yes | 7 ?? | **4 Sep 23:54** | abandoned, holds two measurement files |
| `/Users/nickphysick/scriptally-analytics` | `bc7435fb` `feat/analytics` | — | clean | — | clean, leave |
| `/Users/nickphysick/ScriptAlly-pkgband` | `aa4bcb9e` detached | — | 26 ?? | 21 Aug | images + run logs only |
| `/Users/nickphysick/ScriptAlly-ptr` | `e9f8381b` detached | — | node_modules only | — | nothing to preserve |

### sa-n1 — the one worktree with source that exists nowhere else

Its HEAD is an ancestor of `main`, so its *commits* are safe; its **working tree is not**. Each of
its twelve paths, compared against `main`:

| path | vs `main` |
|---|---|
| `src/components/Queries.tsx` | **differs** |
| `src/components/queries/QueryPanel.tsx` | **differs** |
| `src/components/queries/queryCentreGrid.css` | **differs** |
| `src/components/queries/queryPanel.css` | **differs** |
| `src/components/queries/queryPanel.test.ts` | **differs** |
| `src/lib/queryCardFacts.ts` | **differs** |
| `src/lib/queryCardFacts.test.ts` | **differs** |
| `src/lib/queryCentrePane.test.ts` | **differs** |
| `reports/query-centre-stuckbar.json` | **differs** |
| `src/lib/queryPanel.test.ts` | **NOT ON MAIN AT ALL** |
| `src/lib/todoMenu.ts` | identical — landed |
| `tests/e2e/queryCentreStuckBar.measure.ts` | identical — landed |

Eight source files of divergence plus a spec that exists in no commit anywhere. Untouched since
4 Sep 23:32 — two days, and `main` has moved a long way since. **Action: commit inside the worktree
to `wip/qc-stuckbar-2026-09-06`. Do not delete the worktree.**

### sa-p5 — two measurement files, otherwise images

`tests/e2e/createReach.measure.ts` and `tests/e2e/queryCentreFinish.measure.ts` are untracked there
and absent from `main`. Same treatment, same date, same reasoning.

---

## 4 · Contracts — `design-refs/`

`scripts/check-design-refs.mjs`: **✓ 39 checked, all unchanged.** No enrolled ref has drifted, so
nothing written against a `design-refs/` path is citing a file that has since moved underneath it.

Against `~/Downloads` (710 `.html` files there; 36 share a name with an enrolled ref):

- **34 are byte-identical** to the tree copy — including all five contracts of the last two rounds
  (`todo-belongs` `d1ed2441`, `todo-sort-filter` `4c34f165`, `todo-qc-style` `ee08dd45`,
  `todo-card-options` `9429e341`, `todo-reference-card` `a6af4eb1`). The three QC-chassis contracts
  I am about to build against are confirmed current.
- **2 differ**, and neither is mine or stale in the dangerous direction:
  - `action-journey.html` — tree `5e1d8bd6`, Downloads `29b23300`. The tree copy was **committed by
    the live session earlier today**; the Downloads copy is the older download.
  - `manuscripts-promos.html` — tree `7e6b73b7`, Downloads `0928c0b9`.

Both are enrolled at their tree hash and the guard passes, so no run is reading a changed file
under an unchanged name. Flagged for their owners; **not** something to resolve from here.

---

## 5 · What I will and will not do

**Will not:** commit any of the eleven modified source files. They are one live session's
in-progress §2 and the brief's stop condition covers them exactly.

**Will:**

1. `wip/stash-dashboard-skeleton-2026-09-06` and `wip/stash-rules-tests-2026-09-06` — the two
   stashes, so the stash list empties and nothing is destroyed.
2. `wip/qc-stuckbar-2026-09-06` inside `sa-n1`; `wip/qc-finish-2026-09-06` inside `sa-p5`. Both
   committed **in their own worktrees**, both worktrees kept.
3. `reports/` PNGs committed to `main` from the primary checkout.
4. Deploy dev from a **clean detached checkout of `main`'s tip** — which is the only way the
   deploy can be honest while eleven of someone else's files are dirty here.
