# Settle the checkout, deploy dev — report

**Nothing was lost.** Every uncommitted thing in the checkout is now either committed or preserved
on a branch, and the one set of files I did not touch was left alone on purpose and has since been
committed by its own author.

Inventory: `run-artifacts/settle-inventory.md`. Deployed to https://scriptally-dev.web.app.

---

## The finding that shaped the whole job

⚠️ **A second session was editing the Query Centre throughout this run** — not "recently", *during*.
Three independent signals, gathered before anything was committed:

1. The dirty set **grew from 6 files to 11** between 22:00 and 22:11.
2. `src/lib/queryCentreGrid.ts` had an mtime of **22:06:27 against a wall clock of 22:06:31**.
3. `src/components/shared/ToolbarButton.tsx` — a file **I** created for the QC-chassis round hours
   earlier — had gained a `disabled`/`title` pair whose comment read *"⚠️ ADDITIVE (toolbar v2, §2),
   and the Query Centre's board is why"*. A numbered section of a round in progress.

So those eleven files were **not committed by me**, per the brief's stop condition.

**That call was vindicated eight minutes later.** At 22:14 the other session committed them itself
as `03deb076 toolbar v2 §§1–2 — the popovers get the app's chassis as a VARIANT, and Group groups
the view it is showing`, and immediately began writing `tests/e2e/queryViews.measure.ts` (mtime 13
seconds old when I looked). Had I committed at 22:06 I would have landed a half-finished §2 under a
message about settling a checkout, taken their authorship, and split their round across two commits
— while they were still typing into the files.

**The general form, worth keeping:** *the working tree compiling is not evidence that nobody is
mid-edit.* `tsc --noEmit` was **exit 0** on their half-written state. What actually identifies a
live session is mtimes against the clock, the dirty set changing under repeated observation, and
content that names an unfinished unit of work.

---

## What was committed, and where

| # | what | where | SHA |
|---|---|---|---|
| 1 | `stash@{0}` — whatsLive.css, parked 21 Jun on a branch that no longer exists | branch `wip/stash-dashboard-skeleton-2026-09-06` | `876ecb92` |
| 2 | `stash@{1}` — rules-tests WIP, 6 files, 937 insertions | branch `wip/stash-rules-tests-2026-09-06` | `701850e3` |
| 3 | sa-n1's abandoned working tree — 12 paths | `wip/qc-stuckbar-2026-09-06`, **in that worktree** | `8042036d` |
| 4 | sa-p5's untracked measurements | `wip/qc-finish-2026-09-06`, **in that worktree** | in-worktree |
| 5 | pkgband's 3.4MB of run output | `wip/pkgband-artefacts-2026-09-06`, **in that worktree** | in-worktree |
| 6 | 134 report PNGs from four finished rounds | `main` | `74919916` |

**The stash list is empty** and both branch SHAs are byte-identical to the stash commits that were
dropped — checked by diffing each branch against its own parent *before* dropping anything.

**No worktree was deleted.** All five survive, three of them now clean instead of dirty.

### The one thing that would genuinely have been lost

`sa-n1` held **`src/lib/queryPanel.test.ts`, which exists in no commit anywhere in the repository**,
plus eight source files whose content differs from `main`. It had sat untouched since 4 Sep 23:32
while `main` moved a long way. Two of its twelve paths had already landed and are identical to
main; those are included so the commit is the whole worktree rather than an edited selection of it.

`sa-p5` was the same shape, smaller: two measurement files (`createReach.measure.ts`,
`queryCentreFinish.measure.ts`) in no commit anywhere.

---

## Verification

The deploy source was a **clean detached worktree at `main`'s tip**, never this checkout — which
mattered more than usual today, with another session's files dirty here. Following the recorded
`cd X && …` failure, the `cd` carried an explicit stop and the clean-tree check ran *after* it, so
the gate provably ran in the directory I thought it did:

```
pwd: /tmp/sa-deploy   HEAD: 74919916 == main   tree: CLEAN
```

| gate | result |
|---|---|
| `tsc --noEmit` | **exit 0** |
| full vitest | **7,443 passed, 3 skipped, 0 failed** |
| `build:dev` | clean — **grepped, not tailed**; zero `error`/`[WARNING]`/`css-syntax` lines; build-target check confirms it targets `scriptally-dev` with the prod project absent |
| `paneMounts.measure.ts` | **2 passed** — both panes mount, both consoles silent |
| `qcPanel.measure.ts` | **red by design** — see below |

⚠️ **One vitest file failed on the first run and it was my worktree's fault, not the code's.**
`functions/src/email.test.ts` could not resolve `firebase-functions/params` because `functions/`
carries its **own** `node_modules` and I had symlinked only the root one. Confirmed rather than
assumed: with the second symlink in place the file passes 9/9. The 7,443 above includes it.

### `qcPanel` — red, and correctly so

It fails with the message I wrote into it during the tightened round: *"the Query Centre half is
unmeasurable — its card class is mid-rebuild (log-sheet stream)"*. This is a **standing red that
names its own cause**, not a regression: my only commit to `main` added PNGs and cannot have
touched it.

**I found the new class and deliberately did not re-anchor to it.** The Query Centre's card is now
**`.qcc`** (54 on the page). Measured, the two gaps are **QC 55px · To-do 32px**. But `.qcc` is a
grid **item** where `.tlc` is the page's **container** — they are not counterparts, so pointing the
lock at it would replace a clearly-labelled "unmeasurable" with a confidently-wrong parity claim
between two different kinds of thing. That is the fault this repo already records as asserting a
plausible number about the wrong subject.

**For whoever owns it:** the law needs *re-stating*, not re-pointing — against the Query Centre's
grid container, not its cards — and it should be done by the stream that is mid-round in those
files, which committed again during this run.

### Deploy

Hosting only. **No rules change was found in the inventory** — the eleven live files were all
`src/` and tests, and `firestore.rules` was untouched by everything I saw.

```
firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev
```

**Served bundle matches the build exactly**: `index-CxfoU9CN.js` · `index-nTmLnki7.css`, confirmed
by curling the deployed site and comparing against `dist/assets`.

### The four pages, on dev, signed in

Screenshots in `reports/settle/`; log in `run-artifacts/settle/walk.txt`. Each asserts its
**population first** (>200 characters of ink, no error boundary) so "no console errors" cannot be
satisfied by a blank page:

```
todo      /todo                  heading="To-do list"          ink=3220  boundary=false  consoleErrors=0
queries   /queries               heading="Query Centre"        ink=7472  boundary=false  consoleErrors=0
packages  /manuscripts/packages  heading="Submission packages" ink=1196  boundary=false  consoleErrors=0
calendar  /todo/calendar         heading="Calendar"            ink=3608  boundary=false  consoleErrors=0
```

**All four clean.** The QC-chassis Phase 1 work is visibly live: `/todo` renders the Query Centre's
header, seven stat tiles, and the shared toolbar row with the Grid/Board switch — beside `/queries`
running the same chassis with the other stream's toolbar v2 on it.

---

## Two things the walk turned up, for Job 2

**1 · ⚠️ `/todo` states two different totals.** The stat tile reads **ALL TASKS 29** and the rail
badge agrees at **29**; the list card's footer reads **27 TASKS · 18 NEED YOU NOW**. The 18 agrees
with the section heading, so only the total disagrees. This is the *two numbers both called To-do*
fault this repo has closed once already, and it is **inside Phase 1's own surface** — the tiles are
what Phase 1 added. Phase 1's measurement must reconcile the tile total against the card's footer,
not merely assert the partition.

Encouragingly the partition itself holds on the deployed page: 9 + 9 + 6 + 3 + 2 = **29** = All,
with Urgent (6) correctly outside the sum as a lens.

**2 · The calendar clips its cards mid-word** at the timeline column's right edge ("Par…", "Rev…",
"Kwa"). Another stream's surface and possibly deliberate — flagged, not touched.

---

## A correction to `CLAUDE.md`, found by hitting it

The file records that `vite preview` **binds IPv4 only**, so `localhost` resolving to `::1` fails.
On this machine today it was the **exact opposite**: the server bound `[::1]` alone, `127.0.0.1`
refused the connection, and `localhost` worked.

```
node  17878  IPv6  TCP [::1]:4178 (LISTEN)
```

The durable rule is not a family, it is: **ask which family it bound before assuming** —
`lsof -nP -iTCP:<port> -sTCP:LISTEN`. Recorded here rather than edited into the standing note,
because one machine on one day is not enough to overturn a rule that was itself measured.
