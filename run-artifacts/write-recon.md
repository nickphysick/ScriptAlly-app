# Phase 0 — where does each answer end up?

Traced on `665fa8d5`, from the primary press to the Firestore field. **Nothing built yet.**

## The table

| Answer | Persists today? | Where it stops |
|---|---|---|
| **unit + count** | ❌ **No** | Collected into the flow's `materials` prefill and shown in the RECEIPT LINE (`receiptLine`, `todoWalk.ts:252`). `markSentWriteArgs` returns four fields and `materials` is not one; `recordMaterialsSent` never writes `materialsWanted`. The answer reaches a *sentence*, not a *record*. |
| **"anything else" text** | ❌ **No** | Never leaves the pane. `paneBody.also` is not in the prefill at all — `setFlowPrefill` sends `sentDate` and `materials` only. |
| **when it was sent** | ✅ **Yes** | `setFlowPrefill({ sentDate })` → `FocusFlow`'s `sentDate` state → `markSentWriteArgs` → `recordMaterialsSent({ sentDate })` → `partialSentDate` / `fullSentDate`. |
| **when a reply is expected** | ❌ **No** | Never enters the payload. `FocusFlowProps.prefill` is `{ sentDate?, method?, materials? }` — no field for it — and `markSentWriteArgs` does not carry it. `recordMaterialsSent` **accepts** `writerExpectedDate` and writes it (`db.tsx:2171`); nobody on this path passes it. |
| **the nudge reminder** | ❌ **No** | Same two breaks. `recordMaterialsSent` accepts `nudgeDate` and writes it (`db.tsx:2172`); nothing on the To-do path passes it. |

**So: one of five persists.** The other four are collected, displayed in the will-record strip, and
discarded on commit.

## Where exactly each one stops

Two links, both still exactly as the pane round named them:

- **`FocusFlow`'s prefill shape** (`FocusFlow.tsx:136`) — `{ sentDate?, method?, materials? }`.
  No member for the expectation, the reminder, or the free text.
- **`markSentWriteArgs`** (`todoWalk.ts:200`) — returns
  `{ queryId, targetStatus, sentDate, isResubmit }`. `StagedPayload`'s `mark-sent` member *does*
  carry `materials`, and `markSentWriteArgs` drops it: the only consumer of `p.materials` is
  `receiptLine`.

**Neither link has moved.** The destination has been ready throughout — `recordMaterialsSent` takes
both date fields, writes them, and both are already in the query update allowlist, so **no rules
deploy is involved.**

⚠️ **And `materialsWanted` is a third gap, not named in the pane round.** The unit + count answer has
no writer at all on this path. The only place the send flow writes `materialsWanted` is
`FocusFlow.tsx:1098`, which is the **correction sheet's** row editor — a different surface.

## The reminder: is there any path from a stored reminder to a task?

**No.** `nudgeDate` and `sendReminderDate` are written and read elsewhere (the Query Centre's
timeline projection, the nudge flow's resurface), but **nothing in the To-do derivation reads
either.** Confirmed by grep across `todoBoard.ts`, `todoBuckets.ts` and `taskPrecedence.ts`.

The board's nudge suggestion comes from `replyTask` (`taskPrecedence.ts:116`), which decides from:

- `reminderScheduled` — a boolean, and it means the OPPOSITE of what this round needs: a booked
  reminder makes `replyTask` return `"none"`, because the writer has already dealt with it. It is
  fed from `scheduledReminder(userTasks, …)` — a **UserTask**, not a query field.
- `responseDeadline` / `responseTimeWeeks` — the agency's window, plus a grace period.

So a reminder date stored on the QUERY has no reader, and the one input that sounds like it
(`reminderScheduled`) suppresses the suggestion rather than raising one.

⚠️ **This makes Phase 2 larger than "build the board read".** There is no field for it to read yet,
and the natural home — `replyTask` — currently uses the concept in the opposite direction. Whether
the reminder should raise a task through `replyTask` at all, or through the `UserTask` path
`scheduledReminder` already reads, is a design question this recon surfaces rather than settles.

## What this means for the round

Phases 1 and 2 are both live. Phase 1 is bigger than the brief assumed — **three** answers to carry,
not two, because the unit + count has no writer either.

Recorded before building, per the brief.

**My gate baseline, before any edit:** tsc 0 errors · 6,143 passing, 0 failing, 2 skipped, 359 files.

---

# Phase 2 — STOP AND REPORT, per the brief's first constraint

> *"If that needs more than a type flag, stop and report rather than shipping it in the wrong group."*

It needs more than a type flag, and the reason is a stated law rather than an oversight.

## The blocking law

`cardBucket`'s **first** branch, before any task type is consulted:

```
if (c.userTaskId || c.nature || c.stream === "nt") return "note";
```

Its own comment says why it is first: *"A writer's own item is a Note whatever else it looks like"*,
and the ordering of the branches is documented as *"the order of their certainty"*. A `UserTask` is
a Note **by definition**, not by default.

## Where the same guard is restated — eight sites, seven files

| File | What it decides |
|---|---|
| `todoBuckets.ts:57` | the bucket → the **pill** |
| `todoBuckets.ts:158` | `taskDeed` → the **deed is the writer's own words** |
| `todoBuckets.ts:347` | `anchorNoun` → the tile reads **Added**, not Queried |
| `todoFamily.ts:50` | `liveFamily` → the **group is "yours"** |
| `taskPaneJourney.tsx:123` | `isNote` → the pane's note journey |
| `todoHandoff.ts:365` | no tiles, no story card |
| `todoCalendar.ts:139` | dated-work-versus-note on the calendar |
| `todoCalendar.ts:153` | the calendar's pip kind |

All three things the constraint asks for — the Nudge **pill**, the nudge **deed**, and the nudge
**group** — are decided by that guard, in three different files. A flag on `UserTask` changes none
of them; it would have to be threaded into all eight, and the first one contradicts a law written in
its own comment.

## What that means

Not "harder than expected" — **the design decision is upstream of the code.** Either:

- **the law softens** — "a writer's own item is a Note *unless it declares a cause*" — which is a
  real change to how this page classifies everything, and eight sites deep; or
- **the reminder is not a `UserTask`** after all, and the third argument for the UserTask path (a
  stored intention rendering as a task) turns out to hold for storage but not for classification.

Both are yours, not mine at 2am. The recon stands; Phase 2 is not built.

⚠️ **And one correction to the table above:** `FocusFlow.tsx:1098` writes **`Agent.materialsWanted`**
— the agency's requirements — not the query's. The query's materials writer is
`commitMaterialsFromPane` (`ToDoPage.tsx:2909`) via `updateQuery`, which is what Phase 1 reuses.
