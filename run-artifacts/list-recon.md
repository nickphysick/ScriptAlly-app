# To-do list round — Phase 0 recon

Read against `main` at `d64824d3` (level with `main`, source clean, three other sessions live:
`qc-grid`, `dash`, a calendar stream). Contracts committed in `0b0fe849`.

## 1 · The due date — where each one lives today

**The rule the brief states:** every task carries one due date, the day it became the writer's to
act on — the date they set, else the task's own natural date. **Owner** says whose clock that date
is: `owed` (something is chasing the writer), `theirs` (the agent's clock), `none` (no clock runs).

Priority reads left to right; the first source that holds a date wins. "Harness" is a read-only
census of the dev harness account taken this morning (54 queries, 22 agents, 6 user tasks, 15 task
flags, 4 manuscripts).

| task (type · reason) | category | 1 · the date they set | 2 · the natural date | owner | harness today |
|---|---|---|---|---|---|
| `partial_requested` | Agent request | **hold** — `TaskFlag.snoozedUntil` on the card's own flag · then `Query.sendReminderDate` | **ask** — `Query.partialRequestedDate`, read through `waitAnchorMs` (the anchor the row's days and the ticket's *Asked on* already use) | `owed`, even with no date | 4 of 4 carry the ask date · 0 holds · 0 reminders |
| `full_requested` | Agent request | hold · then `sendReminderDate` | ask — `Query.fullRequestedDate` (same anchor) | `owed` | 3 of 3 carry it (seeded by `seedRequestDates.mjs`) |
| `revise_resubmit` | Agent request | hold · then `sendReminderDate` (*"Remind yourself to resubmit by"*) | ask — the R&R's arrival, `Query.lastStatusChange` (`waitAnchorMs`, decide) | `owed` | 1 R&R, **no `lastStatusChange`** → null |
| `offer_received` | Agent request | hold — the offer's *"I need time"* flag (it quiets the card, never hides it) | arrived — `lastStatusChange` (`waitAnchorMs`, decide) | `owed` | 1 offer, **no `lastStatusChange`** → null |
| `nudge_overdue` · `nudge-first` | Nudge | hold · then `Query.nudgeDate` — the writer's own *"remind me to nudge"*, which `replyTask` already raises the nudge on | **window** — `replyDeadlineMs` (stored `responseDeadline`, else `dateSent + responseTimeWeeks × 7`) | `theirs` | 0 stored deadlines, 22 of 22 agents state a window · 4 queries carry `nudgeDate` · **9 returned holds** on nudge flags |
| `nudge_overdue` · `nudge-again` | Gone quiet | hold | **check-in** — `Query.nudgeDate` as `buildNudgeWrites` writes it (`checkBackDate`) · else window | `theirs` | 1 query carries `lastNudgeSentDate` |
| `no_response_close` | Gone quiet | hold | check-in when the query has been chased · else window (the expected reply) | `theirs` | computed from `dateSent` + window |
| `materials_unrecorded` | Housekeeping | hold | — **nothing** | `owed` when held, else `none` | **2 returned holds** (4 Sep) → dated |
| `materials_unrecorded_bulk` | Housekeeping | hold | — nothing | `owed` / `none` | — |
| `data_quality_poor` | Housekeeping | hold | — nothing | `owed` / `none` | 1 muted flag (`MUTED_UNTIL`) — not a date |
| `querying_unstarted` · `dream_agent_unqueried` · `weekly_review` | Housekeeping | — | — | `none` | **never reach the board** — `boardStreamForTaskType` returns null for all three |
| user task, dated | Your task | hold — its `user_task` flag | **note** — `UserTask.dueDate` | `owed` | 2 dated, both past (23 Aug, 30 Aug) · none today or ahead |
| user task, dateless | — | — | — | `none` | never on the list — `boardEligible` drops `nature: "note"` |

### Where the writer's dates are written

- **hold** — every snooze is a `TaskFlag.snoozedUntil` instant: the pane's *Not yet — hold me to it*
  (`journeys.ts` send → `later` → `writes: snooze`), Nudge's *I'll give it a little longer* and
  Close's *Leave it open* (same writer), and the row's ⋯ snooze panel. All reach `snoozeCard` →
  `dismissTask("fixed snooze", days)` / `upsertTaskFlag`. The hold is read by the day, not the
  instant — `flagSleeps`/`flagReturnedToday` already draw the boundary that way. **Ignored:**
  `MUTED_UNTIL` (a mute is not a date) and a dismissed flag (dismissal is the later word).
- **`sendReminderDate`** — written by `recordResponse.ts` from `RecordResponseFocusForm` (still
  mounted in `Queries.tsx`) and the legacy modal. **The live Query Centre respond desk writes `""`**
  (`responseDraftToPayload`), so in practice this is set only by the older forms. It is the writer's
  own date and is honoured as one.
- **`nudgeDate`** — two meanings on one field, split by whether the query has been chased:
  never chased → the writer's planned nudge (`Queries.tsx:939`, the Query Centre's nudge desk);
  chased → the check-in `buildNudgeWrites` writes. The `reason` on the card already carries the
  split (`nudge-first` / `nudge-again`), so the derivation reads it rather than re-deciding.
- **`UserTask.dueDate`** — a `YYYY-MM-DD` day, taken as the local day it names (never parsed as UTC
  midnight, which lands on the previous day west of Greenwich).

### Considered and not used — each for a stated reason

- **`expectedSendDate`** (*"Expected by — when do they want it?"*) — the agent's deadline for the
  pages, not the day the request became the writer's. Using it would put a request asked in April
  with an expected-by in October under *Coming up*, against the Urgent lens that counts days since
  the ask. **Note:** the dashboard's fortnight panel (`fortnightEvents.ts:220`) does read
  `expectedSendDate || responseDeadline` as its "due" — a different question on a different
  surface, recorded so nobody reconciles the two by accident.
- **The offer's reply-by** (`responseDeadline` / `offerResponseDeadline`) — the brief's definition
  is the day it became the writer's, and the offer's arrival is the anchor the ticket's *Came in*
  and the board's wait already count from. `figureFor` uses the reply-by for the rail's countdown;
  that is a different figure with a different label.
- **`offerDate`** — the same fact as `lastStatusChange` on every write path; one anchor, not two.

### Which are MISSING

1. **The day a housekeeping gap was raised.** Every `fix` task comes from a `TaskFlag`, which carries
   `snoozedUntil`, `committedDate`, `skippedAt` and `resolvedAt` — every date except when it was
   created. `waitAnchorMs` already says so for `fix` (returns `NaN`). **No date is fabricated:**
   these rows say *none*. Adding `createdAt` to the flag is a data decision, not a display one.
2. **An offer or an R&R with no `lastStatusChange`.** The field exists and every live write path
   sets it (`recomputeQuery` derives it from the activity log); the harness's two decide queries
   were seeded without an activity and so have none. Honest null, dashed chip.
3. Nothing else. Every other source exists as a field with a live writer.

## 2 · `todoListView.ts` — is it additive?

**Yes, and the type system enforces the completeness of each addition:**

- `SortId` / `GroupingId` are unions, and `SORT_LABEL`, `SORT_DESC`, `GROUPING_LABEL`,
  `GROUPING_DESC` are `Record<…>`s over them — a new member fails to compile until it is labelled.
- `applyView`'s `order()` switch ends in `const unhandled: never` — a new sort fails to compile until
  it has a comparator. The regrouping path (`keyOf`) is a ternary chain and needs its own branch.
- `parseView` derives the accepted ids from the label records' keys, so the new ids parse with no
  change and an unknown one still falls back.
- `ViewFacts` needs two more accessors — the task text (so the Task head sorts by exactly what the
  cell prints, the rule the agency sort already follows) and the due fact. Two construction sites:
  `ToDoPage`'s `viewFacts` memo and the unit suite's `facts()`.
- `SortMenu` enumerates `GROUPING_LABEL` / `SORT_LABEL` keys, so the menu grows with the records; its
  **Reset** button writes `VIEW_DEFAULT`'s three, so it resets to whatever the default becomes.

**The persisted default today:** `VIEW_DEFAULT` = grouping `grouped` (Urgency), sort `needs-you`
(Priority), direction `asc`, all three urgency groups, all six types, no agents, snoozed and
dismissed off. It persists as `User.todoPrefs.listView` — the WHOLE `ListView`, written by
`setView` on any change (`ToDoPage.tsx:509`) — and is parsed per field, so a stored value wins field
by field.

⚠️ **The harness account stores exactly that old default** — `{grouping: "grouped", sort:
"needs-you", direction: "asc", …}` — because `setView` writes the whole object whenever any one
field changes. So the landing state will NOT appear on the harness account (nor on any account that
has touched a filter): a stored view wins, and nothing can tell a view the writer chose from one
written as a by-product. Two consequences, both deliberate:
- the thirty-odd e2e suites that assume Urgency heads keep their fixture;
- the landing-state measurement clears `todoPrefs.listView`, measures, and **restores the stored
  object exactly** in the same run.
A one-time migration (a version marker on the stored view) would change that for existing accounts;
it is not built — reported for a decision.

## 3 · Which suites read the current list rows

**Read the cells this round replaces** (Asked chip, Where it stands, Actions) — retargeted in the
phase that changes them:
- unit — `taskListWide.test.tsx` (the five cells `ltask`/`lag`/`lchip`/`lstands`/`lact`, one `.lact`
  per row) · `listCells.test.ts` (`listStands`, `listSub`, `dateChip`, `LIST_VERB`) ·
  `todoListView.test.ts` (the default's label and flags)
- e2e — `views.ts` + `viewsDiff.measure.ts` (the list parts table, now drawn from a superseded
  contract) · `viewsClaims.measure.ts` (L1–L4)

**Read the group heads** (`.grp` / `.g-lbl` / *Needs you now*) — safe while the harness keeps its
stored Urgency view, re-run in Phase 7: `calClosed56`, `completionLeaves`, `elemDiff`,
`frame2Recon`, `framePort`, `listPort`, `listWide`, `packA`, `qcChassis`, `tightened`, `tlAccept7`,
`tlGroups`, `tlNote`, `unitNext`, `viewPanels`, `views`, `viewsClaims` · unit `taskPanePort`,
`todoGroups`.

**Click `.tlc .row` to open a task** (34 files, most through `todoOpen.ts`) — the row element and its
click grammar survive this round; each is re-run rather than assumed.

**Do not read list rows at all, despite matching a grep:** `anatomy.ts` (`.ledger`, the pane's) and
`pkgBroadsheet.measure.ts` (`.stamp`, the packages page's).
