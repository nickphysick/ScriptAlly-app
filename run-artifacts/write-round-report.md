# To-do pane — do the answers actually get saved?

**Answer: one of five did.** Four were collected, stated in the will-record strip, and discarded on
commit. Three now persist; the fourth is blocked on a decision that turned out to be upstream of the
code.

**Measured: 18 of 18 green** — `tests/e2e/deedRound.measure.ts` → `run-artifacts/deed-round.txt`.
**Recon:** `run-artifacts/write-recon.md` (the point of the round).
**Not deployed.**

---

## Phase 0 — the table

| Answer | Persisted before? | Now | Route |
|---|---|---|---|
| **unit + count** | ❌ reached the RECEIPT LINE only | ✅ | `commitMaterialsFromPane` → `updateQuery({ materialsWanted })` — the writer the single fill-in already calls |
| **"anything else" text** | ❌ never left the pane | ✅ | prefill → payload → the activity's `details`, before the derived phrase |
| **when it was sent** | ✅ | ✅ | unchanged |
| **when a reply is expected** | ❌ dropped at the takeover boundary | ✅ | payload member → `markSentWriteArgs` → `recordMaterialsSent({ writerExpectedDate })` |
| **the nudge reminder** | ❌ dropped at the same boundary | ⛔ **not built** | see Phase 2 |

**Where each one stopped:** the two links named by the pane round, both unmoved —
`FocusFlow`'s prefill shape (no member) and `markSentWriteArgs` (returned four fields). The
destination was ready throughout: `recordMaterialsSent` accepts and writes both date fields, and
both are already in the query update allowlist, so **no rules deploy was involved**.

**A third gap the pane round had not named:** the unit + count had no writer at all. It reached
`receiptLine` — a sentence — and never a record.

**Is there any path from a stored reminder to a task?** No. `nudgeDate` and `sendReminderDate` are
written and read elsewhere; nothing in the To-do derivation reads either. The board's nudge
suggestion comes from `replyTask`, whose one reminder-shaped input — `reminderScheduled` — means the
**opposite**: a booked reminder makes it return `"none"`, and it is fed from a `UserTask`.

---

## Phase 2 — stopped, on your own condition

> *"If that needs more than a type flag, stop and report rather than shipping it in the wrong group."*

It needs more than a type flag. `cardBucket`'s **first** branch is
`if (c.userTaskId || c.nature || c.stream === "nt") return "note"`, and its comment says why it is
first: *"A writer's own item is a Note whatever else it looks like."* A `UserTask` is a Note **by
definition**.

The same guard is restated at **eight sites across seven files** — it decides the pill
(`todoBuckets:57`), the deed (`:158`), the tile noun (`:347`), the group (`todoFamily:50`), the pane
journey (`taskPaneJourney:123`), the tiles and story (`todoHandoff:365`), and two calendar
behaviours. All three things your constraint asks for — Nudge pill, nudge deed, nudge group — are
decided by that guard, in three different files.

So the choice is: **soften the law** ("a Note *unless it declares a cause*"), eight sites deep, or
**the reminder is not a `UserTask`** and the third argument holds for storage but not for
classification. Both are yours.

---

## Per phase

| Phase | SHA | Measured |
|---|---|---|
| 1 · answers reach the write | `61089351` | 5 seam assertions, proved red |
| 2 · reminder → task | — | **stopped and reported** |
| 3 · the thin-cases fixture | `43668d7d` | re-runnable, verified twice |
| 4 · zero lead reads as words | `99e98aa4` | both cases on the page |
| 5 · the law | `99e98aa4` | — |

---

## False premises

1. **My own recon named the wrong writer.** `FocusFlow.tsx:1098` writes
   **`Agent.materialsWanted`** — the agency's requirements — not the query's. Caught before building
   on it; the query's writer is `commitMaterialsFromPane`.
2. **"Build the board read" assumed a reader existed to extend.** There is no field for it to read,
   and the natural home uses the concept in the opposite direction.
3. **The fixture snoozed its own subjects** — the first version suppressed the two journeys it
   existed to make reachable.
4. **Deterministic ids do not make a seed re-runnable.** The second run is an *update*, and update
   rules are a narrower allowlist than create. Delete-then-create is the fix.

---

## The assertions are at the seam

`paneWrite.test.ts` reads the payload the single write path receives, because **that is the only
place this fault was ever visible**. Nothing rendered wrongly: the pane collected five answers, the
strip stated them, the gate required two, and four were dropped. Proved red by deleting the
passthrough.

Unanswered is an **absent key** at every link, never a default — asserted in both directions. That
is the difference between "not asked" and "answered with today's date".

---

## What the fixture unblocks

The **chase** journey (never once measurable), the **cohort** table against a known count, the
**single fill-in** below the threshold, the **snoozed** group, and **Pro**-gated surfaces.

The **Close** journey is unblocked as DATA and now blocked on a derivation question instead: the
query is `Queried`, 400 days old, agency states 6 weeks and `noResponseMeansNo: true` — which
`taskPrecedence`'s own header calls the close case — and no Close row renders. Inputs verified in
Firestore. **A better place to be stuck**, and the next round starts from known-good data.

---

## Concurrency

The packages session was live throughout. `git add` swept `PackagesOnboarding.tsx` into my staged
set once — **the file count caught it** (7 where I expected 6); unstaged, untouched, never in a
commit of mine. Their `materialsBand.test.ts` is red in the shared tree because
`PackagesOverview.tsx` no longer exists; absent in my own worktree, so attributed and not chased.

Baseline recorded before any edit: **tsc 0 · 6,143 passing · 0 failing**. Closing, in my own
worktree: **tsc 0 · 6,131 passing · 0 failing**. Every phase gated in its own worktree.
