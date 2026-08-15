# The event date gap — recording that something happened on a day other than today

**Status: TRACKED, NOT BUILT.** Written 15 Aug at Nick's request, after two journeys hit the same
wall in one pack. No code changed. This exists so the decision can be made once, with the scope
visible, rather than re-derived by whoever hits it third.

---

## The one-sentence version

Some write paths accept the date the event happened and some stamp `new Date()` — so back-dating
works in three journeys and is impossible in two, and nothing in the code says which is which until
you try.

## It is NOT "the activity primitives take no event date"

That was my own first phrasing in the journeys report, and it is wrong in a way worth correcting,
because it makes the job sound bigger and more uniform than it is. **The primitives are split**:

| Primitive | Takes an event date? | What the journeys can do |
|---|---|---|
| `recordMaterialsSent` | **Yes** — `sentDate: string` ([db.tsx:252](../src/lib/db.tsx#L252)) | Send and Resubmit back-date correctly today |
| `logNudge` → `buildNudgeWrites` | **Yes** — `eventDate` ([logNudge.ts:36](../src/lib/logNudge.ts)) | Chase back-dates correctly today |
| `updateQueryStatus` | **No** — stamps `const dateStr = new Date().toISOString()` ([db.tsx:1707](../src/lib/db.tsx#L1707)) | **Close cannot back-date** |
| `recordOfferDecision` | **No** | An offer answered last week records as answered today |

So this is not a missing capability. It is an **inconsistency**: the same concept exists under two
names in two paths and is absent from two more. That is the thing worth fixing, and it is why the
fix is smaller than it sounds — the pattern is already in the codebase twice, and `journeyEventISO`
([todoWalk.ts:170](../src/lib/todoWalk.ts)) already exists as the shared noon-normalisation rule
both existing callers go through.

## What is blocked right now

1. **The close journey cannot back-date.** Its `When` step offers "When their window closed", and
   the chosen day rides in the activity's `systemNotes` while the entry itself is stamped today.
   The step says so on screen, so nothing lies — but the writer picks a date and the record files it
   under another one.
2. **The chase's "Don't remind me" was removed** (`916f501`). Its problem is adjacent rather than
   identical: `checkBackDate` is *required* by `NudgeInput`, so the activity stored
   `"Follow-up reminder set for {date}"` even when the writer had asked for no reminder. That line
   is composed in `buildNudgeWrites` and **persisted**, not derived at render — so it cannot be
   suppressed at display time.
3. **Every journey that follows.** Anything recording an event the writer is catching up on — and
   catching up is the normal case for this whole surface — inherits whichever half of the split its
   primitive sits on.

## What would have to change

Three separable pieces. **(a) alone unblocks the close journey**, which is the live cost.

### (a) `updateQueryStatus` takes an optional event date — the small, high-value change

- `src/lib/db.tsx` — `updateQueryStatus(id, newStatus, systemNotes?, eventDate?)`. The body already
  computes `const dateStr = new Date().toISOString()` in one place and uses it for the activity and
  the skipped-status back-fill; it becomes `journeyEventISO(eventDate, new Date().toISOString())`.
  ⚠️ The **skipped-status sequence** (Queried → Partial Requested → …) fabricates intermediate
  activities from that same stamp — decide deliberately whether those inherit the back-date or stay
  at write time. They are not the event the writer described.
- `src/lib/recomputeQuery.ts` — **no change expected, and that is the point.** It derives
  `lastStatusChange`, `rejectedDate` and `responseReceivedAt` *from the activity dates*, so a
  correctly back-dated activity produces correctly back-dated derived fields for free. This is the
  single strongest argument for doing it here rather than anywhere else.
- `src/components/todo/FocusFlow.tsx` — the close journey passes `sentDate`; the note in
  `systemNotes` explaining the discrepancy comes back out, as does the on-screen line under the
  `When` step.
- Callers to re-check (all keep working — the parameter is optional): `sweepDone`, the board's
  quick-✓, `RecordResponseScreen`, the Sunday review's staged close.

### (b) `NudgeInput.checkBackDate` becomes optional — what "Don't remind me" needs

- `src/lib/logNudge.ts` — `checkBackDate?: string`. When absent: `details` omits the reminder
  clause, `nested.reminderDate` is **omitted** (not `undefined` — Firestore rejects `undefined`
  inside maps), and `queryUpdates` drops `nudgeDate`.
- `src/lib/db.tsx` — `logNudge`'s `args` type widens. ⚠️ It forwards `args` wholesale to
  `buildNudgeWrites`, so the *runtime* already passes fields the declared type omits (`eventDate`
  flows through today only because excess-property checks don't apply to a variable). The declared
  type is narrower than reality and should be corrected in the same pass.
- `src/lib/todoWalk.ts` — the `nudge` payload and `nudgeWriteArgs`.
- **Check the derived "Follow-up reminder" node** in `QuerySlideInPanel`, which renders off
  `nudgeDate` while it is in the future. Absent `nudgeDate` must render nothing, not a bad date.
- `src/lib/logNudge.test.ts` locks.

### (c) `recordOfferDecision` — same shape as (a), lower urgency

No journey currently back-dates an offer decision, so this is consistency work rather than a fix.
Worth doing in the same pass if (a) is done, and not worth a pass of its own.

## What it unblocks

- The close journey's `When` step becomes true rather than annotated.
- "Don't remind me" returns to the chase's Check back segment (needs **(b)**).
- Every future journey gets back-dating by default instead of case by case.
- Historical clean-up and any future import path that needs to say when something actually happened.

## Two things this note is deliberately NOT

- **Not a rules change.** No new stored fields on any document; the prod rules queue is unaffected.
- **Not urgent.** Nothing is currently wrong on screen. The close journey states its own limitation,
  and the one thing that stated something untrue has been removed rather than left running.

---

## Unrelated residue found in the same audit, recorded so it is not lost

**The assisted-fill stale response.** `FocusFlow`'s `resetScratch` now clears `assisting` alongside
`assistAt` and `assistMsg` (`916f501`), so advancing mid-fetch no longer leaves the next group's
button stuck reading "Searching…". What is **not** fixed: a fetch that resolves after the walk has
advanced still calls `setFound` against whichever item is now on screen. That needs a generation
guard (capture the item key at fetch time, discard the response if it no longer matches) — a small
change, but a different one, and half-fixing it would be worse than leaving it named here.
