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

---

## Phases 1–4 — done, deployed, measured

**https://scriptally-dev.web.app** → Tasks → Calendar.

### The three rulings, before → after (deployed dev, both runs)

| | before | after |
|---|---|---|
| **1. Sends showing twice** — 12 Aug chip | **12** (6 activities, 12 pips) | **6** |
| **2. Record pip text** | `"Holding reply"` | `"Closed · David Marsh"` |
| **3. Cap at 1000px** — `rowPx` / max pips | `66.00` / **1** | `96.00` / **2** |

### Caps at all four widths

| width | rowPx before → after | cellH | cols | max pips before → after | day 12 |
|---|---|---|---|---|---|
| 1000 | 66.00 → **96.00** | 65 → 95 | 1 | **1 → 2** | chip 6, shown 2, +4 |
| 1280 | 102.17 → 102.17 | 101 | 2 | 2 → 2 | chip 6, shown 2, +4 |
| 1440 | 102.17 → 102.17 | 101 | 2 | 2 → 2 | chip 6, shown 2, +4 |
| 1920 | 102.17 → 102.17 | 101 | 2 | 2 → 2 | chip 6, shown 2, +4 |

**What the floor change actually was:** two halves, and only together.
`CAL_CELL_FLOOR = 2` states the rule; `.cal-grid { min-height: 420px → 600px }` at the collapsed
width supplies the room. **600 is derived, not chosen** — a folding cell needs
`2 × CAL_PIP_H + CAL_MORE_H = 62px`, so `rowPx ≥ 33 + 62 = 95`, so `6 × 95 + 13 = 583`; 600 carries
the margin. The constant cannot create space, so if the two ever disagree the cell **overflows**
(pips are `flex: none`) rather than squashing — loudly, and the acceptance run asserts against it at
every width. Both halves are mutation-verified: reverting either goes red on its own test.

### Acceptance, on the deployed page

```
@1440 OK — 6 populated cells, panel 370×662, count "6 ITEMS"
@1920 OK — 6 populated cells, panel 370×662, count "6 ITEMS"
@1000 OK — one column, grid 600px, panel 640×325
```

Plus, asserted at all four widths: **chip = shown + overflow** in every populated cell.

### The toggle — the ruling's own test

Neutral click first (the plate's collapse-on-engagement moves the tool row otherwise):

```
ON : 12→chip 6 (2 rec, +4) · 13→5 (2 rec, +3) · 17→2 (2 rec) · 18→3 (3 rec) · 20→6 · 1→5
OFF: 12→chip 6 (0 rec, +4) · 13→5 (0 rec, +3) · 17→2 (0 rec)  ·  —      · 20→6 · 1→5
```

**12 August reads 6 in both states** — the record entries when the layer is on, the restored done
cards when it is off. Never doubled, never emptied. 18 August is absent with the record off because
all three of its items are holding replies, which are not a clearing activity and so never produced
a done card in the first place. Reconciliation holds in both states.

### Live-asset verification

`/assets/index-CgvgbQQl.css` and `/assets/index-tNdhMGUv.js`, fetched from the deployed site:
grid floor 600 ✓, collision resets still present ✓, dedupe in the bundle ✓, named record pip ✓.

---

## FLAGS FOR NICK

### 1. The linkage, and what was left undeduped — **nothing**

The match is `Activity.id`. The calendar's done items are **not `BoardCard`s**: `calendarDays`
builds them straight from the activity feed, and `recordDays` walks the same array — so a send is
one document rendered twice. A nudge and a holding reply on one query on one day are different
documents and cannot collide, so **no ambiguous pair exists and nothing was left undeduped for
safety**.

Three cases fail **safe**, keeping the done card, and all three are tested: an activity with no
`id`; an orphan whose query is gone; a `STATUS_CHANGED` or `MATERIALS_SENT` carrying no
`resultingStatus`. That last one is why the match is on ids rather than on task *type* — matching
by type would have hidden them.

### 2. Before/after caps — above. The floor change was the constant **and** the CSS min-height.

### 3. What the dedupe changed in the panel counts

**Every populated day roughly halved**, which is the point, but two things are worth your eye on
real data:

- **12 August still reads 6 with the record off.** Those are the six done cards returning. So the
  day genuinely holds six closes of David Marsh — the dedupe removed a *duplicate*, not a real item.
  Six closes for one agent on one day looks like test-data noise rather than a bug in the projection,
  but you would know better than I would.
- **18 August vanishes when the record is hidden.** Correct — holding replies are not a clearing
  activity, so they never had a done card to fall back to. Worth knowing it is by design: a day
  whose only content is agent replies is *empty* on the work layer.

### 4. Cross-session observations

- **Sixteen files of other sessions' uncommitted work rode along in this deploy** — Account
  settings, Submission packages (including four untracked new files: `MaterialModal.tsx`,
  `packagesFlow.css`, `materialDraft.ts(.test)`, `pkgFlow.measure.ts`) and the To-do session's
  `ToDoPage.tsx` / `TaskPaneBody.tsx` / `taskPanePort.test.tsx`. At build time the To-do work had
  **4 tsc errors** (`'materials' does not exist in type 'SendBodyValues'`) — `vite build` does not
  typecheck, so the bundle built anyway. By the end of the run their tree had gone green and the
  full suite was **341 files / 5830 passed / 0 failed**, tsc **0**. Nothing of theirs was touched.
- **A useful guard appeared mid-run from another session:** `tests/e2e/bundleGuard.ts` refuses to
  measure a local preview whose `dist/` is older than `src/`, naming the exact trap ("Measuring now
  would report your edit as absent"). It caught me once, correctly.
- **The local preview server would not stay up** — `vite preview` exited twice under
  `preview_start`, so the before/after numbers were taken against the **deployed** site either side
  of the deploy rather than against a local build. That is stronger evidence, not weaker, but it
  means dev briefly carried the un-deduped page between the two runs.
- **The 21px chassis defect is untouched**, as instructed — `workspacePageGrid.css` belongs to
  `tasks-chassis`. The day panel's foot is still below the fold on this page.
