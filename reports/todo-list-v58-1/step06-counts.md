## 2. Step 0.6 — the two counts (read-only; nothing changed)

How it was checked: the To-do list's own chain (db.tsx's task generator → `assembleBoardColumns` → `trayItem` → `wsTasks` → `trayFigure`) was run over the emulator's seed (`tests/emulator-seed/harness.json`) on 21 Nov, in a throwaway test that was never committed. That gave 105 tasks; 51 housekeeping gaps and 1 batch show no figure. Each figure's date was set beside the query's stored fields and its activity log. The card's Tracking tab is `buildTimelineRows` (`src/components/reading-pane/QueryTimeline.tsx:245`): the activity log, deduped to the earliest entry per status, plus a "Query sent" row made from `dateSent` (`:259`). Dev's own records (William Tan at Foxglove, Greg Panetta) are not in the seed, and I did not read dev Firestore, because live reads are opt-in. The two dev cases are explained from the code below.

### Where each figure counts from

`trayFigure` (`src/lib/todoWs.ts:361`) reads one of two dates:
- **waitMs**, the wait anchor. `waitAnchorMs` (`src/lib/todoBuckets.ts:521`) computes it, by way of `listRowInputs` (`src/lib/taskCardFacts.ts:146`) and `trayItem` (`src/lib/todoTray.ts:220, 252`).
- **dueDays**, days to or past `dial.ymd` (`todoWs.ts:166–167`). It comes from `dueFor` → `taskDue` (`src/lib/taskDue.ts:202`). A writer's snooze (a "hold") beats everything else for any kind (`taskDue.ts:210`).

| Kind | Counts from (field · file:line) | What the words claim | Agree? |
|---|---|---|---|
| send | `partialRequestedDate` / `fullRequestedDate`; if absent, `lastStatusChange` (`todoBuckets.ts:529–530`) | "{n} days waiting", since the agent asked | **Only when a request date is stored.** The `lastStatusChange` fallback counts from any later status write, not from the request. |
| rr | `lastStatusChange` (`todoBuckets.ts:532`) | "{n} days waiting", since the R&R came in | Only while the last status change *was* the R&R. |
| nudge | `dueDays` from `taskDue` "chase" (`taskDue.ts:245–253`), the first of: a hold; `nudgeDate` (the writer's planned nudge, or a booked check-in); the reply window (`responseDeadline`, else `dateSent` + `responseTimeWeeks`). With no date at all: waitMs, the latest of sent, nudged or replied (`todoBuckets.ts:538–541`). | "{n} days past expected", past the agent's reply date | **Only when the source is the window.** For a hold or a `nudgeDate` it counts days past *that* date. |
| quiet | waitMs: the latest of `fullSentDate`, `partialSentDate`, `lastNudgeSentDate`, `responseReceivedAt`, `dateSent` (`todoBuckets.ts:538–541`; `todoWs.ts:168`) | "{n} days quiet", since the last contact | Yes, when the stored fields match the log. |
| offer | `dueDays` from `taskDue` "decide" = `lastStatusChange`, the day it arrived (`taskDue.ts:231`) | "{n} days past expected" | **No.** It counts days since the offer arrived. Nothing about an offer is "expected". `offerDate` is never read. |
| own | `dueDays` from the task's own `dueDate` (`todoWs.ts:166`) | "{n} days left" / "{n} days past expected" | Days left: yes. "Past expected" for the writer's own due date is the wrong word: nothing was expected of anyone. |
| other | `dueDays` from its bucket's `taskDue` case; else waitMs | "{n} days left / past expected", or "{n} days waiting" | Follows the bucket (none in the seed shows a figure). |

### The two dev cases, from the code
- **Nudge William, "115 days past expected" = days since 29 Jul, the send day.** A nudge says "past expected" for any date `taskDue` returns, so 29 Jul is the nudge's due day: a hold, a `nudgeDate`, or a `responseDeadline` stored as 29 Jul. The window can't give it, because it is `dateSent` + weeks and is never the send day itself unless `responseDeadline` equals `dateSent`. Most likely `nudgeDate` or `responseDeadline` holds 29 Jul. **Code** (the words claim the reply date whatever the source), possibly also **data**: reading his record would settle which field.
- **Send Greg your partial, "3 days waiting", rising 1, 2, 3.** A send counts from `partialRequestedDate`, or from `lastStatusChange` when there is none. "Asked 28 Jun" on the card means the log has the request, but the stored request date is missing, so the figure counts from a status write about 18 Nov. His record also contradicts itself: "You sent your partial" on 14 Oct while the status is still Partial requested. **Seed/data** (the record contradicts itself) **and code**: the fallback trusts `lastStatusChange`, which any later write moves.

### Every seed task whose figure counts from a different date than its card shows

| Task (query id) | Figure | Counts from | Card's Tracking shows | Seed or code |
|---|---|---|---|---|
| Nudge Alasdair (seed-cal-bang-q) | 48 days past expected | 4 Oct (a hold) | Reply window 9 Dec (16 weeks), not yet passed. Nudge logged 20 Sep; `lastNudgeSentDate` not stored | **Code** (hold labelled as the reply date); **seed** (logged nudge not in the derived field) |
| Nudge Marcus (seed-query-3) | 78 days past expected | 4 Sep (a hold) | Window 4 Oct; nudge logged 21 Aug, not stored | **Code**; **seed** |
| Nudge Tom (seed-query-2) | 78 days past expected | 4 Sep (a hold) | Window 27 Oct; a nudge logged 21 Aug, before the query was sent (1 Sep) | **Code**; **seed** (nudge before the send) |
| Nudge Imogen (thin-q-remind) | 64 days past expected | 18 Sep (`nudgeDate`, the planned nudge) | Window 16 Oct; nudges logged 21 and 25 Aug | **Code** (planned nudge labelled as the reply date); **seed** |
| Nudge Hester (seed-cal-soon-q) | 40 days past expected | 12 Oct (`nudgeDate`) | Window 1 Dec, not yet passed | **Code** |
| Answer Tom's offer (cv25-q-08) | 91 days past expected | 22 Aug (offer arrived) | "Query sent 22 Aug" (no log; `dateSent` = `lastStatusChange`) | **Code** (an offer has no expected date); **seed** (sent and offered at the same instant) |
| Answer Noah's offer (seed-query-12) | none | nothing: `lastStatusChange` absent | `offerDate` 19 Aug stored; the log has only "Full sent 14 Aug" | **Code** (`offerDate` unread); **seed** (no offer in the log) |
| Send Iris your revision (seed-query-11) | none | nothing: `lastStatusChange` absent | R&R logged 28 Jun, before the query was sent (8 Jul); revision resubmitted 23 Aug, status still R&R | **Seed** |
| Send Marcus your full (seed-pkgq-3) | 154 days waiting | 20 Jun (`fullRequestedDate`) | Query sent 25 Jun; full requested 9 Jul; full sent 21 and 23 Aug, status still Full requested | **Seed** (asked before it was sent; sent but still requested) |
| Send Marcus your partial (cor-move-a) | none | nothing: no request date, no `lastStatusChange` | Partial requested 7 Sep (logged); partial sent 21 and 23 Aug, before the request | **Seed** |
| Send Ottoline your full (seed-cal-passed865-q) | none | nothing | Full sent 20 Sep, status still Full requested | **Seed** |
| Send Tobias your full (rj-dupe) | 73 days waiting | 9 Sep (`fullRequestedDate`) | Agrees on the date, but full sent 16 and 21 Sep, status still Full requested | **Seed** (Greg's shape) |
| Send Ana your full (seed-query-9) | 94 days waiting | 19 Aug (`fullRequestedDate`) | No request in the log; full sent 21 Aug, status still Full requested | **Seed** |
| Send Jonathan your full / Clara / Marcus (Bloomsbury Quill) (cv25-q-09, -06, -07) | 58 / 80 / 72 days waiting | `lastStatusChange` = `dateSent` | "Query sent" on the same day as the request; no log | **Seed** (sent and asked at the same instant: William's shape on a send) |
| Cormac's / Joan's / Tobias Quint's gone quiet (seed-cal-passed20-q, seed-query-5, thin-q-chase) | 102 / 115 / 122 days quiet | `dateSent` | A nudge logged later (20 Sep / 21 Aug / 21 Aug), not stored in `lastNudgeSentDate` | **Seed** |
| Elinor's / Sam's gone quiet (cor-pair, cor-undo) | 105 / 140 days quiet | `dateSent` | Partial sent 2 Sep / full sent 9 Sep, logged; no sent dates stored. Sam's log names Rachel Lin | **Seed** |
| Peter's / Ana's gone quiet (seed-pkgq-10, seed-pkgq-9) | 120 / 125 days quiet | Stored `partialSentDate` / `fullSentDate` = `dateSent` | Partial sent 7 Aug / full sent 2 Aug (logged) | **Seed** |
| Imogen's / Devendra's gone quiet (thin-q-cohort-3, -4) | 244 / 235 days quiet | `dateSent` | Agrees, but the log closes them No response on 21 Aug while the status is Queried | **Seed** (contradiction, same date) |
| Every own task with a past due date (8) | "{n} days past expected" | Its `dueDate` | No card | **Code** (words): an own task is past due, not past expected |

Agree (nothing to report): Theo, Edda, Imogen Vale, David, Rachel (send); Wren, Devendra, Mira, Douglas (nudge, window); the other quiet rows.

### What I'd change in a follow-up (not done here)
1. **The nudge's words follow its source.** "past expected" only for the window. For a planned nudge or check-in, something like "{n} days past your nudge date". For a hold, the hold's own words. Alternatively, count every nudge from the window, so the number always means the reply date. That is Nick's call, because it changes the copy.
2. **An offer counts as "{n} days since it came in"**, read from `offerDate` first and `lastStatusChange` second.
3. **A request with no stored request date reads it from the log** (its earliest request event, through `recomputeQuery`), rather than from `lastStatusChange`. Or, better: find why the derived field is missing on a record whose log has the request. That is Greg's case, and should be checked on his record with Nick's opt-in.
4. **Own tasks say "{n} days past due".**
5. **The seed:** about 20 records contradict their own logs. Sent while still requested, a request before the send, nudges logged but not derived, closed in the log but open in the status. Most come from fixtures written without `recomputeQuery`. A one-off pass through `recomputeQuery` over the snapshot would clear most of them, but the seed is out of scope here.
