# Calendar — dedupe, names, floor

**Session:** `calendar` · 21 Aug 2026 · deployed dev site, signed in, Playwright.
Prior: `reports/calendar-record-layer.md`, `reports/calendar-fixes.md`.

Step 0: `git status --porcelain src/components/todo/` → **empty**, no other session mid-edit.
Level with `main`. Baseline `tsc` **0 errors**.

---

## Phase 0 — RECON

### 1. What links a done card to the activity its completion logged

**They are the same `Activity` row.** The linkage is not a heuristic — it is a document id.

The calendar's done items are **not `BoardCard`s at all**. `calendarDays` builds them straight from
the activity feed (`todoCalendar.ts`, the "completed" block):

```ts
for (const a of input.activities) {
  if (!CLEARING_ACTIVITY_TYPES.has(a.activityType)) continue;
  const ymd = isoToYmd(a.date);
  if (!ymd || !inRange.has(ymd)) continue;
  day(ymd).items.push({
    key: `cal-done-act-${a.id ?? `${a.queryId}-${a.date}`}`,
    ymd, label: terseDoneLabel(a, agn ? agentPrimary(agn) : undefined),
    family: "done", struck: true,
  });
}
```

and `recordDays` walks **the same array**, emitting `activityId: act.id` per item. So one activity
produces one done pip *and* one record pip, from one source, on one day.

Observed on the deployed page, 12 August, day panel expanded:

```
COUNT: 12 ITEMS · 6 ON THE RECORD
  Done:          ["Closed David Marsh — no response" ×5, "Rejected — David Marsh"]
  On the record: ["Closed · David Marsh" ×6]
```

**Twelve items are six activities counted twice.** Exactly 1:1, as the ruling describes.

> The card side of the question is moot for the calendar, but recorded for completeness: a `BoardCard`
> (`todoBoard.ts:85`) carries `taskType`, `relatedRecordId`, `agentId`, `msTitle`, `userTaskId` and
> `whenMs` — enough for a queryId + type + day match had one been needed. It is not needed here.

### 2. Is the linkage deterministic? — **Yes, completely**

The match is on `Activity.id`, a Firestore document id. **A nudge and a holding reply logged on the
same day for one query cannot collide**, because they are different documents with different ids.
The ambiguity the pack asked about does not arise, so nothing is left undeduped for safety.

Two cases where the ids cannot match, and both fail **safe** (the done card survives):

- **An activity with no `id`.** The existing key already guards this with `a.id ?? …`; dedupe is
  conditional on a real id, so a fallback-keyed done item is never hidden.
- **An activity the record layer excluded** — an orphan (its query is gone), or a `STATUS_CHANGED`
  or `MATERIALS_SENT` carrying no `resultingStatus`. No record entry exists, so nothing supersedes
  it and the done card stays. This is the load-bearing case: it is why matching on ids rather than
  on task *type* is correct.

### 3. Which done items are in the dedupe set, exhaustively

`CLEARING_ACTIVITY_TYPES` (`clearedToday.ts:28`) is exactly four:

| Activity type | In `RECORD_TYPES`? | Deduped? |
|---|---|---|
| `QUERY_SENT` | yes — `{ "Query sent", out }` | **yes** |
| `NUDGE_SENT` | yes — `{ "Nudge sent", out }` | **yes** |
| `MATERIALS_SENT` | `BY_STATUS` | **yes**, when `resultingStatus` resolves; else no record entry, so no |
| `STATUS_CHANGED` | `BY_STATUS` | **yes**, when `resultingStatus` resolves; else no |

**Never deduped:**

- **User tasks.** `cal-done-task-${t.id}` comes from `input.userTasks`, has no activity and no
  `activityId`. "Book the library room" keeps its struck done card, exactly per the ruling.
- **Housekeeping.** It has no action date and never reaches the calendar at all
  (`cardActionYmd` returns null for the `hk` stream).
- **Live cards.** Only the `done` family is a dedupe candidate; nothing waiting is ever hidden.

### The shape the fix takes from this

`dedupeAgainstRecord(items, recordItems)` matches on `activityId`, so it needs the done item to
**carry** the id rather than bury it in its React key — parsing a key would be a second encoding of
the same fact, and the `??` fallback would make the parse lossy. `CalendarItem` gains an optional
`activityId`, set only where a done item was built from an activity.

**And the record-off behaviour falls out with no branch.** The page already computes
`recordFor(ymd)`, which returns `[]` when the layer is hidden, so passing it to
`dedupeAgainstRecord` supersedes nothing and every done card returns. One call site, both states,
no `if (showRecord)` anywhere — which is what stops the two states drifting apart.
