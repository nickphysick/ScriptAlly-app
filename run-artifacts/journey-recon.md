# Journey round — Phase 0 recon

Read-only. No commit. Answers the five questions the later phases assume, plus what recon found
that the brief does not.

---

## 1 · Snooze — the primitive, and can the pane call it?

**Yes, and it already does.** Nothing new is needed.

| | |
|---|---|
| **Pure helpers** | `src/lib/todoActions.ts` — `snoozeVia(card)`, `clampSnooze`, `clampSnoozeDays`, `snoozeCeilingDays`, `snoozeDateLabel(days)`, `snoozeWhenLabel(days)` |
| **The caller** | `snoozeCard(card, days, when)` — `ToDoPage.tsx:619`. **Already takes a caller-supplied label** (`when`), so Phase 3's journey-specific wording needs no signature change |
| **Two write paths, chosen by the card** | `snoozeVia` returns `user-task-flag` (writer's own item) · `dismiss-task` (engine-raised) · `none` |
| **Storage — writer's item** | `upsertTaskFlag({ taskType: USER_TASK_FLAG_TYPE, queryId: userTaskId }, { snoozedUntil, bumpSnooze })` |
| **Storage — engine item** | `dismissTask(taskType, relatedRecordId, "fixed snooze", days)` → the same `TaskFlag.snoozedUntil` |
| **Field** | `TaskFlag.snoozedUntil` (ISO). Ceilings: `SNOOZE_MAX_DAYS`, `OFFER_SNOOZE_MAX_DAYS` — clamped in `lib/`, not at the call site |
| **Readers** | `todoColumns.snoozedCards`, `todoListPage.snoozedCount`, `taskFlags` (incl. the legacy `DismissedTask` migration), the board derivation, the snoozed filter and the ⋯ menu's tiers |
| **Undo** | already built — `upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true })`, a full restore including the ×n counter |

**Nothing stops Phase 3.** The pane's action-bar Snooze already routes here through
`host.onSnooze` → `AnchoredPanel` + `SnoozeDial` → `snoozeCard`. A fork intent calls the same
function.

## 2 · Close reasons — can withdrawn and no-response be told apart?

**Yes. The model already carries three, each with its own `QueryStatus`.** Nothing has to be
invented and nothing gets mapped onto its neighbour.

`src/lib/todoJourneys.ts` — `CLOSE_REASONS`:

| reason | writes | |
|---|---|---|
| `no_reply` | `QueryStatus.NO_RESPONSE` | silence past a stated window |
| `off_record` | `QueryStatus.REJECTED` | a pass you saw but never logged |
| `withdrawn` | `QueryStatus.WITHDRAWN` | you pulled it yourself |

`commitCloseFromPane` (`useTaskCommit.tsx:239`) already looks the reason up and calls
`updateQueryStatus(q.id, target.status, …)`, with an undo arm restoring the prior status.

**⚠️ WHAT IS ACTUALLY BROKEN IS THE PANE'S SUPPLY, NOT THE MODEL.** `paneCommit.ts:178` reads
`reason: kind === "close" ? "no_reply" : null` — a **hard-coded** reason. So today every close from
the pane is a no-response close whatever the writer meant, and the plumbing to vary it is complete
and unused. Phases 4 and 5 supply the reason; nothing downstream needs changing.

**Response-rate check.** `WITHDRAWN` is absent from both `AGENT_RESPONSE_STATUSES`
(`queryDerivation.ts`) and `LEGACY_RESPONSE_STATUSES` (`dashboardStats.ts`), so a withdrawn query
never counts as a response — the brief's assertion about rejection counts holds exactly.

**⚠️ BUT IT IS STILL IN THE DENOMINATOR.** `responseRatePercent = responsesReceived / queries.length`
counts every query, so withdrawing one *lowers* your response rate — a number made worse by a
decision you made, about a query the agent never got a fair chance to answer. Whether the
denominator should exclude withdrawn queries is a **product question outside this round's scope**;
it is flagged, not changed, because `responseRatePercent` is read by the dashboard and analytics.

## 3 · Nudge check-in — writable from a nudge journey, and does a task come back?

**Yes to both, and the mechanism is not the one the question implies.**

`logNudge(queryId, { checkBackDate, note?, eventDate? })` (`db.tsx:399`, builder in
`lib/logNudge.ts`) writes, in one isolated path:

- a **non-status** `NUDGE_SENT` activity (no `resultingStatus`, so `recomputeQuery` ignores it)
- `nudgeDate = checkBackISO` and `lastNudgeSentDate = eventISO`
- a **custom-date `DismissedTask`** whose `resurfaceDate` is the check-back

**The returning task is the hide-and-resurface, not a fresh derivation.** The `nudge_overdue` task
is derived from the agent's window (`db.tsx:929`, the `reply === "nudge"` arm) and is *hidden* until
`resurfaceDate`. So a check-in date does produce a task on that date — via suppression expiring, not
via `nudgeDate` being read as a trigger. Phase 5's assertion ("a check-in task appears on the chosen
date and not before") is satisfiable, and this is the mechanism it must assert against.

It never touches `status` or `responseDeadline` and never counts as a response — so Phase 5's
"a nudge does not move the query's status" is already true of the primitive.

## 4 · Task resolution by cause

**Derived tasks resolve themselves; flags are the exception.**

Every task in `calculatedTasks` is **re-derived per render from the query's own status**
(`db.tsx` ~line 800 onward): `partial_requested`, `full_requested`, `revise_resubmit`,
`nudge_overdue`, `no_response_close`, the materials gaps. Record a reply elsewhere and the status
moves, so the task simply **stops being generated** — nothing lingers and nothing needs dismissing.

`TaskFlag.resolvedAt` exists for the cases derivation cannot answer, and has exactly two live
writers: `commitFixFromPane` (an agent-record gap, resolved after the write lands) and the nudge
reconciliation (`db.tsx:2983` — the last nudge deleted resolves `nudge_overdue`).

**So Phase 8's "the pane advances to the next task" is safe**: the completed card leaves the derived
board on its own.

## 5 · The journey union — and it is **two** unions that disagree

**This is the finding that most affects Phase 1.** There is no single journey union today.

| | `paneJourney.JourneyKind` | `paneGate.JourneyKind` |
|---|---|---|
| members | `send · chase · close · offer · note · fix · materials` | `send · decide · chase · close · fix · bulk · note` |
| `offer` / `decide` | `offer` | `decide` |
| the fill-in | `materials` | **`fix`** |
| the agent-record gap | **`fix`** | *(also `fix`)* |
| the cohort | *(absent)* | `bulk` |

**⚠️ `fix` NAMES TWO DIFFERENT JOURNEYS.** In `paneJourney` it is the agent-record gap; in `paneGate`
it is the materials fill-in. They are separate acts with separate writers, and one word covers both
depending on which file you are reading. `paneCommit.ts` already carries a comment noting `"bulk"` is
not a `JourneyKind` at all.

### What each journey has today

| journey | deed template | required list | commit path |
|---|---|---|---|
| send | ✅ `deedSentence` | ✅ `unit · when · expect · remind` | ✅ |
| close | ✅ | ✅ `when` | ✅ |
| chase (nudge) | ✅ | ❌ **`[]`** — asks nothing | ✅ |
| fill-in (gate `fix`) | ✅ | ✅ `unit · when` | ✅ (`materials`) |
| note | ✅ (the writer's words) | ✅ `[]` — by decision | ✅ |
| bulk | ✅ (cohort form) | ✅ `rows` | ✅ (own committer) |
| offer / decide | ❌ **none** (declared fall-through to the short deed) | ❌ `[]` | ❌ hands off to the takeover |
| agent gap (`paneJourney` `fix`) | ✅ | — | ❌ hands off |

**Two journeys have no template, no required list and no commit path: `offer`/`decide` and the
agent-record gap.** Both are declared hand-offs rather than omissions.

**⚠️ AND THE CHASE'S EMPTY REQUIRED LIST IS THE BUG PHASE 5 NAMES.** `requiredFor("chase")` is `[]`,
and `paneCommitValues` supplies `checkBackDays: DEFAULT_CHECKBACK_DAYS` — so **a nudge logged from
the pane today writes a check-in date the writer never chose.** Phase 5's "*if nothing comes back…*
is required" turns an invented default into an answer.

---

## What Phase 1 has to reconcile

1. **One union.** Two disagreeing unions, with `fix` meaning different journeys in each.
2. **`bulk` is not in either** — it is decided by the card and handled beside the union.
3. **Per-flow required lists.** The current list is per *journey*; the fork makes it per *flow*, and
   `chase` and `decide` currently have none at all.
4. **The close reason must become a flow's `writes`**, not a constant in `paneCommitValues`.
5. **`checkBackDays` must stop being a default** and become an answer.

## Standing hazards this round will meet

- **Every workspace page stays mounted** — the pane's ids are `idPrefix`-scoped for this reason, and
  a fork's option ids will need the same treatment.
- **`.tpn` appears three times in the document** — any `page.evaluate` picks the visible one by
  measuring it.
- **A crashing lock is not a failing lock** — the fork means `.tpn .q` can legitimately be absent, so
  every existing probe that dereferences a ledger row needs a guard, not a throw.
- **Nine earlier measurement files already address retired classes** (reported at the end of the
  workspace round); the fork will add to that set. Reported, not churned.
