# Correction UI — Step 0 recon

**Baseline at start: 351 files, 5,984 passing, 0 failures.** No calendar reds today.

⚠️ **This ends in a STOP.** Item 2 turns up a fault that changes Phase 1's plan.

---

## 1 · `editActivity` / `deleteActivity`

```
deleteActivity(id: string): Promise<void>
editActivity(queryId: string, activityId: string,
             patch: Partial<Pick<Activity, "description"|"details"|"date"|"resultingStatus">>): Promise<void>
```

**Both already recompute.** `deleteActivity` finds the target in the global feed, deletes the
global doc, deletes the same-id twin in the per-query subcollection (tolerating its absence), calls
`recompute(queryId)`, and for a `NUDGE_SENT` additionally re-derives `nudgeDate`/`lastNudgeSentDate`
from the remaining nudges and releases the `nudge_overdue` flag. `editActivity` maps the
Activity-shaped patch onto the subcollection's field names (`description`→`note`, `date`→`createdAt`
as a `Timestamp`, `resultingStatus`→`type` **and** `resultingStatus`), patches the authoritative doc,
best-effort patches the global twin, then recomputes.

**Callers today:** `deleteActivity` — five (the timeline's existing delete confirm in `Queries.tsx`,
plus nudge/record undo paths in `FocusFlow` and `ToDoPage`). `editActivity` — **exactly one**,
`TimelineComposer.tsx:230`, which passes `{ date, description }`.

⚠️ **A latent gap worth fixing when Phase 1 opens this file: `editActivity` accepts `details` in its
patch type and never maps it.** The subcollection patch handles description, date and
resultingStatus only, so a `details` edit reaches the global projection and never the authoritative
log — where nothing reads it. Harmless today because the one caller does not send it; a trap for
the correction form, which will.

## 2 · The same-day tiebreak — ⚠️ THE FINDING, AND IT BLOCKS PHASE 1 AS WRITTEN

There are **three** behaviours, not one:

| surface | tiebreak |
|---|---|
| `orderedStatusBearing` (the derivation) | **explicit and deterministic** — `time → doc id → original index`, and its own comment says why |
| Query Centre timeline (`buildTimelineRows`) | **none in the code.** Correct today only because the input arrives from `onSnapshot(..., orderBy('createdAt','asc'))` — which Firestore completes with `__name__` — and `Array#sort` is stable |
| To-do focus sheet (`FocusFlow.sheetTimeline`) | **none, over an unsorted array.** It maps the GLOBAL `activities` feed with no sort, so same-day order is whatever the snapshot delivered |

So the derivation and the Query Centre agree **by accident of two mechanisms coinciding**, and the
focus sheet can already disagree with both about the same query.

⚠️ **Why this blocks Phase 1.** The consequence preview must sort a *proposed* array — one that never
came from Firestore. `buildTimelineRows` would order its same-day events by the order I hand it,
while the saved outcome's order comes back from `orderBy`. **Preview and outcome could differ on
precisely the case a correction most often creates: moving an event onto a day that already has
one.** Phase 5's headline check would then fail for a reason that is nothing to do with the
correction engine.

**Proposed plan change, for Nick:** give `buildTimelineRows` the derivation's explicit tiebreak
(`time → id → index`) before building the preview, so all three surfaces state the same rule rather
than inheriting it. Additive, and it makes the focus sheet deterministic as a side effect.

## 3 · Mark closed is an EVENT ⇒ Reopen falls out free

The close menu calls `updateQueryStatus(id, REJECTED | WITHDRAWN | NO_RESPONSE)`, which writes an
activity carrying `resultingStatus: newStatus` to **both** stores under one id and then recomputes;
no stored closed flag exists, and status is derived from the log like everything else.

⚠️ **So deleting that closing event IS Reopen, and the parked reopen CTA needs no separate work** —
the delete path already exists and already recomputes. Plan-positive.

## 4 · What imports produce as a first event

`impliedRungs` initialises its set with `QUERIED` **unconditionally** and walks `LADDER` in order, so
a Smart-Import query's first rung is always Queried even when imported at Partial Sent (the ladder
back-fills the intermediate rungs). Its date may be `null` when no send date was parsed, in which
case the rung is seeded `dateProvisional`.

⚠️ **But the root guard must still be by POSITION, and for a sharper reason than the pack gives:
`buildTimelineRows` SYNTHESISES a root when no Queried rung exists** —
`statusEvents.unshift({ type: QUERIED, createdAt: query.dateSent })` — and that row carries **no
`activityId`** (the builder's own comment says "synthesised root has no id"). So the earliest row on
screen may have **no document behind it at all**. The ⋯ must handle that row: nothing to edit,
nothing to delete, and the guard cannot key on type because the synthesised row's type is exactly
`QUERIED`.

## 5 · Stale caches — none found

Both stores are live `onSnapshot` subscriptions: the global feed (`db.tsx`) and the per-query
activity subcollection (`Queries.tsx`, ordered `createdAt asc`, resubscribed per selection). Derived
query fields are written by `recompute` to the query doc, which its own snapshot delivers back.
`Queries.tsx` holds exactly **one** `useMemo`, so there is no derived-state cache to invalidate.
An edited log propagates on its own; nothing needs manual busting.

## 6 · `TimelineRows` consumers — two, and the second is the focus sheet

`QueryTimeline` (Query Centre) and **`FocusFlow.sheetTimeline` (the To-do focus sheet)**, confirmed
at `FocusFlow.tsx:33/356/358`. So the ⋯ must be an opt-in prop, **off by default**, exactly as the
pack specifies — FocusFlow passes `<TimelineRows rows={rows} />` with no other props and would
inherit anything defaulted on.

---

## Stop

Items 3, 4, 5 and 6 confirm the plan or improve it. **Item 2 changes it**: the preview cannot honestly
promise "timeline membership and order" until `buildTimelineRows` states its own tiebreak. That is a
small additive change and I recommend it as Phase 1's first act — but it is a change to a shared
spine file that the pack did not ask for, so it wants Nick's word before it lands.
