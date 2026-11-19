# Query card audit v1: where a query's parts disagree

Read-only. No source file, store or deploy was touched. The readings came from the emulator seeded with the harness
account (`tests/emulator-seed/harness.json`, the dev seed data) by `tests/e2e/audit/qcAudit.measure.ts`, and are in
`raw/`. Branch `query-card-audit-v1`.

## 1. False premises

1. **There is no list row.** The Query Centre's "List" view is the grid of cards (Query Centre v154 onwards), so the
   grid card is the list row. Birds-eye is the other view, and was read.
2. **The phone's query page could not be reached by script.** At 390 × 844, `/queries` is the phone hub. Pressing
   an agent's name in its list did not open the query, by the visible name or by the row. The phone's list rows
   were read for every live query instead: status, age, and the group counts.
3. **"The Dashboard row where it has one":** only 2 of 88 queries appear on the Dashboard, as to-do rows
   (Jonathan Marsh, Clara Beaumont). Both agree with the grid.
4. **"No 'they' for an agent" (check 11)** conflicts with CLAUDE.md, which allows they/them for an agent. It is moot
   here: no card, footer or grid text uses he, she or they for an agent.
5. **Two statuses have no seed query:** Resubmitted and Signed. The audit cannot speak for them.
6. **Check 8's arrow chip:** each footer action was pressed. The grid card's arrow chip ("→ Send your full") was
   read, not pressed: it opens the card, where the footer was pressed.

## 2. The base, and the seed queries by status

- **Base:** `dev/tct1-sv1-qc161` @ 003562e45, which dev serves (`index-uSsspMoT.js`). It is Query card v161 merged
  onto Search v1 and To-do card thread v1, and contains v161 (a passed reminder is not a nudge).
- **Seed:** 88 queries.

| Status | Queries |
|---|---|
| Queried | 38 |
| Rejected | 15 |
| Partial Sent | 8 |
| Full Sent | 8 |
| Full Requested | 7 |
| Partial Requested | 6 |
| Offer | 2 |
| No Response | 2 |
| Revise & Resubmit | 1 |
| Withdrawn | 1 |
| Resubmitted, Signed | none |

**Read for each query:**
- the grid card: its words, track, Next box, paperclip and its popover, and group;
- the slide-in card at 1512 × 982 and 1280 × 800: strip, label, Day, footer, the unfolded thread, and the Agent,
  Materials and Notes tabs, with clipping and overflow checked;
- Birds-eye's bar (70 rows; closed queries are not drawn there);
- the To-do desk's card (45 queries have a task);
- the Dashboard (2 rows);
- the phone list (64 live rows).

## 3. The findings

47 findings across 28 queries. Each row gives the query, the check, what the surfaces showed, and the cause.

| Query | # | What each surface showed | Cause | Shot |
|---|---|---|---|---|
| msv12-q-8 (Douglas Renner, No Response) | 1 | label 'Closed with no reply' · grid track label 'No reply' | **logic** — STAGE_NAME (lib/qcSummary) 'Closed with no reply' vs the grid's track label (slipTrack, lib/qc153) 'No reply' | shots/msv12-q-8.png |
| seed-query-18 (Sam Okoro, No Response) | 1 | label 'Closed with no reply' · grid track label 'No reply' | **logic** — STAGE_NAME (lib/qcSummary) 'Closed with no reply' vs the grid's track label (slipTrack, lib/qc153) 'No reply' | shots/seed-query-18.png |
| cv25-q-06 (Clara Beaumont, Partial Requested) | 3 | grid says asked 78 days ago · no request step in the thread | **seed** — the request's activity / stageStartMs (lib/qc154) | shots/cv25-q-06.png |
| cv25-q-07 (Marcus Reed, Partial Requested) | 3 | grid says asked 70 days ago · no request step in the thread | **seed** — the request's activity / stageStartMs (lib/qc154) | shots/cv25-q-07.png |
| cv25-q-09 (Jonathan Marsh, Full Requested) | 3 | grid says asked 56 days ago · no request step in the thread | **seed** — the request's activity / stageStartMs (lib/qc154) | shots/cv25-q-09.png |
| msv12-q-3 (Edda Voss, Partial Requested) | 3 | grid says asked 68 days ago · the request step 6 Sep (74 days) | **seed** — query.partialRequestedDate / fullRequestedDate vs the request activity's createdAt | shots/msv12-q-3.png |
| msv12-q-4 (Theo Abara, Full Requested) | 3 | grid says asked 61 days ago · the request step 7 Sep (73 days) | **seed** — query.partialRequestedDate / fullRequestedDate vs the request activity's createdAt | shots/msv12-q-4.png |
| rj-dupe (Tobias Hark, Full Requested) | 3 | grid says asked 71 days ago · the request step 8 Sep (72 days) | **seed** — query.partialRequestedDate / fullRequestedDate vs the request activity's createdAt | shots/rj-dupe.png |
| rj-send (Imogen Vale, Full Requested) | 3 | grid says asked 68 days ago · the request step 11 Sep (69 days) | **seed** — query.partialRequestedDate / fullRequestedDate vs the request activity's createdAt | shots/rj-send.png |
| seed-pkgq-3 (Marcus Reed, Full Requested) | 3 | grid says asked 147 days ago · the request step 20 Jun (152 days) | **seed** — query.fullRequestedDate (20 Jun) is before query.dateSent (25 Jun) | shots/seed-pkgq-3.png |
| seed-query-11 (Iris Kwan, Revise & Resubmit) | 3 | grid says asked 134 days ago · the request step 19 Aug (92 days) | **logic** — materialGroups (lib/qc1533) and nextBox154 (lib/qc154): a Revise & resubmit's ask is dated stageStartMs, which falls back to the send date | shots/seed-query-11.png |
| thin-q-close (Rosalind Vale, Queried) | 3 | Birds-eye 'since 27 Sep 418 days over': 27 Sep is 53 days ago, the year left out | **display** — QcBirds150's current label: the date has no year | shots/thin-q-close.png shots/thin-q-close-birds.png |
| cv25-q-01 (Eleanor Whitfield, Rejected) | 4 | status Rejected · no step for it in the thread (['You sent Eleanor your query']) | **seed** — the query's status and date fields, with only a 'Queried' activity behind them | shots/cv25-q-01.png |
| cv25-q-02 (William Tan, Rejected) | 4 | status Rejected · no step for it in the thread (['You sent William your query']) | **seed** — the query's status and date fields, with only a 'Queried' activity behind them | shots/cv25-q-02.png |
| cv25-q-05 (Sophie Dunn, Partial Sent) | 4 | status Partial Sent · no step for it in the thread (['You sent Sophie your query']) | **seed** — the query's status and date fields, with only a 'Queried' activity behind them | shots/cv25-q-05.png |
| cv25-q-06 (Clara Beaumont, Partial Requested) | 4 | status Partial Requested · no step for it in the thread (['You sent Clara your query']) | **seed** — the query's status and date fields, with only a 'Queried' activity behind them | shots/cv25-q-06.png |
| cv25-q-07 (Marcus Reed, Partial Requested) | 4 | status Partial Requested · no step for it in the thread (['You sent Marcus your query']) | **seed** — the query's status and date fields, with only a 'Queried' activity behind them | shots/cv25-q-07.png |
| cv25-q-08 (Tom Ellery, Offer) | 4 | status Offer · no step for it in the thread (['You sent Tom your query']) | **seed** — the query's status and date fields, with only a 'Queried' activity behind them | shots/cv25-q-08.png |
| cv25-q-09 (Jonathan Marsh, Full Requested) | 4 | status Full Requested · no step for it in the thread (['You sent Jonathan your query']) | **seed** — the query's status and date fields, with only a 'Queried' activity behind them | shots/cv25-q-09.png |
| cv25-q-10 (Aisha Kapoor, Full Sent) | 4 | status Full Sent · no step for it in the thread (['You sent Aisha your query']) | **seed** — the query's status and date fields, with only a 'Queried' activity behind them | shots/cv25-q-10.png |
| cv25-q-11 (Hester Quinn, Partial Sent) | 4 | status Partial Sent · no step for it in the thread (['You sent Hester your query']) | **seed** — the query's status and date fields, with only a 'Queried' activity behind them | shots/cv25-q-11.png |
| cv25-q-12 (George Ashworth, Rejected) | 4 | status Rejected · no step for it in the thread (['You sent George your query']) | **seed** — the query's status and date fields, with only a 'Queried' activity behind them | shots/cv25-q-12.png |
| rj-dupe (Tobias Hark, Full Requested) | 4 | status Full Requested · a send of the full after the request in the thread | **seed** — status Full Requested beside a later 'Full Sent' activity | shots/rj-dupe.png |
| seed-pkgq-3 (Marcus Reed, Full Requested) | 4 | status Full Requested · a send of the full after the request in the thread | **seed** — status Full Requested beside a later 'Full Sent' activity | shots/seed-pkgq-3.png |
| rej-query-1 (Imogen Rackham, Rejected) | 5 | a step before the query was sent (12 Aug): ['2 Aug', '12 Aug'] | **seed** — the activity's createdAt is before query.dateSent | shots/rej-query-1.png |
| seed-pkgq-3 (Marcus Reed, Full Requested) | 5 | a step before the query was sent (25 Jun): ['20 Jun', '25 Jun', '21 Aug'] | **seed** — the activity's createdAt is before query.dateSent | shots/seed-pkgq-3.png |
| seed-pkgq-4 (Priya Nair, Partial Sent) | 5 | a step before the query was sent (30 Jun): ['25 Jun', '30 Jun', '20 Aug'] | **seed** — the activity's createdAt is before query.dateSent | shots/seed-pkgq-4.png |
| seed-pkgq-5 (Joan Whitfield, Rejected) | 5 | a step before the query was sent (15 Jun): ['10 Jun', '15 Jun'] | **seed** — the activity's createdAt is before query.dateSent | shots/seed-pkgq-5.png |
| seed-pkgq-6 (Sam Okoro, Rejected) | 5 | a step before the query was sent (17 Jun): ['12 Jun', '17 Jun'] | **seed** — the activity's createdAt is before query.dateSent | shots/seed-pkgq-6.png |
| seed-pkgq-8 (David Marsh, Rejected) | 5 | a step before the query was sent (10 Jul): ['5 Jul', '10 Jul'] | **seed** — the activity's createdAt is before query.dateSent | shots/seed-pkgq-8.png |
| cv25-q-05 (Sophie Dunn, Partial Sent) | 7 | the grid's paperclip: 'Sent 3 Jun Partial' · no such step in the thread | **seed** — query.partialSentDate / status, with no activity behind it | shots/cv25-q-05.png |
| cv25-q-06 (Clara Beaumont, Partial Requested) | 7 | the grid's paperclip: 'Asked 2 Sep Partial · asked' · no such step in the thread | **seed** — query.partialRequestedDate / status, with no activity behind it | shots/cv25-q-06.png |
| cv25-q-07 (Marcus Reed, Partial Requested) | 7 | the grid's paperclip: 'Asked 10 Sep Partial · asked' · no such step in the thread | **seed** — query.partialRequestedDate / status, with no activity behind it | shots/cv25-q-07.png |
| cv25-q-09 (Jonathan Marsh, Full Requested) | 7 | the grid's paperclip: 'Asked 24 Sep Full manuscript · asked' · no such step in the thread | **seed** — query.fullRequestedDate / status, with no activity behind it | shots/cv25-q-09.png |
| cv25-q-10 (Aisha Kapoor, Full Sent) | 7 | the grid's paperclip: 'Sent 3 Jun Full manuscript' · no such step in the thread | **seed** — query.fullSentDate / status, with no activity behind it | shots/cv25-q-10.png |
| cv25-q-11 (Hester Quinn, Partial Sent) | 7 | the grid's paperclip: 'Sent 12 Jul Partial' · no such step in the thread | **seed** — query.partialSentDate / status, with no activity behind it | shots/cv25-q-11.png |
| msv12-q-3 (Edda Voss, Partial Requested) | 7 | the grid's paperclip: 'Asked 12 Sep First 50 pages · asked' · the thread's step ['6 Sep'] | **seed** — query.partialRequestedDate vs the activity's createdAt | shots/msv12-q-3.png |
| msv12-q-4 (Theo Abara, Full Requested) | 7 | the grid's paperclip: 'Asked 19 Sep Full manuscript · asked' · the thread's step ['7 Sep'] | **seed** — query.fullRequestedDate vs the activity's createdAt | shots/msv12-q-4.png |
| msv12-q-5 (Sun-hee Park, Full Sent) | 7 | the grid's paperclip: 'Sent 24 Jul Full manuscript' · the thread's step ['1 Jul'] | **seed** — query.fullSentDate vs the activity's createdAt | shots/msv12-q-5.png |
| rj-dupe (Tobias Hark, Full Requested) | 7 | the grid's paperclip: 'Asked 9 Sep Full manuscript · asked' · the thread's step ['8 Sep'] | **seed** — query.fullRequestedDate vs the activity's createdAt | shots/rj-dupe.png |
| rj-send (Imogen Vale, Full Requested) | 7 | the grid's paperclip: 'Asked 12 Sep Full manuscript · asked' · the thread's step ['11 Sep'] | **seed** — query.fullRequestedDate vs the activity's createdAt | shots/rj-send.png |
| seed-pkgq-4 (Priya Nair, Partial Sent) | 7 | the grid's paperclip: 'Sent 23 Aug Partial' · the thread's step ['20 Aug'] | **seed** — query.partialSentDate vs the activity's createdAt | shots/seed-pkgq-4.png |
| seed-query-11 (Iris Kwan, Revise & Resubmit) | 7 | the grid's paperclip: 'Asked 8 Jul Revised manuscript · asked' · the thread's step ['19 Aug'] | **logic** — materialGroups (lib/qc1533) and nextBox154 (lib/qc154): a Revise & resubmit's ask is dated stageStartMs, which falls back to the send date | shots/seed-query-11.png |
| rj-send (Imogen Vale, Full Requested) | 12 | @1280 · tracking tab: overflows the card — button.qc152-fx '✎ Edit' | **display** — QcCard152 `.qc152-fx` (qcv152card.css): placed left: calc(100% + 8px) beside a wide reply | shots/rj-send.png shots/rj-send-edit-1280.png |
| seed-cal-passed865-q (Ottoline Frayn, Full Requested) | 12 | @1280 · tracking tab: overflows the card — button.qc152-fx '✎ Edit' | **display** — QcCard152 `.qc152-fx` (qcv152card.css): placed left: calc(100% + 8px) beside a wide reply | shots/seed-cal-passed865-q.png shots/seed-cal-passed865-q-edit-1280.png |
| thin-q-cohort-3 (Imogen Farr, Queried) | 12 | @1280 · agent tab: clipped — small. 'thin-ag-remind@example.test' | **display** — QcAgent158's contact row (an ellipsis on the email) | shots/thin-q-cohort-3.png |
| thin-q-remind (Imogen Farr, Queried) | 12 | @1280 · agent tab: clipped — small. 'thin-ag-remind@example.test' | **display** — QcAgent158's contact row (an ellipsis on the email) | shots/thin-q-remind.png |

## 4. The same findings by cause, most queries first

1. **seed: a status and date fields with nothing behind them in the activity log.** 10 queries, 19 findings.
   - Ten of the `cv25-q-01` to `-12` queries have only a "Queried" activity. Their status (Rejected, Partial or Full sent
     or requested, Offer) and date fields (`partialSentDate`, `fullSentDate` and others) have no step.
   - The grid reads the fields ("asked 56 days ago", the paperclip's "Sent 3 Jun: Partial"); the thread reads the
     activity, so it shows the query step alone.
   - Checks 3, 4 and 7. Jonathan Marsh (`cv25-q-09`) is one of these.
2. **seed: a step dated before the query was sent.** 6 queries, 7 findings, checks 5 and 3.
   - The pass comes before the query on `rej-query-1`, `seed-pkgq-5`, `-6` and `-8`.
   - The request comes before the query on `seed-pkgq-3` and `-4`. On `seed-pkgq-3` the grid's "asked 147 days ago"
     is the send date, because the request field (20 Jun) is before it (25 Jun).
3. **seed: a request or send date field that disagrees with its activity.** 6 queries, 10 findings, checks 3 and 7.
   - `msv12-q-3`, `-4` and `-5` and `seed-pkgq-4` differ by 3 to 23 days.
   - `rj-dupe` and `rj-send` are exactly one day later in the field than in the activity, and both activities were
     saved late in the evening. That pattern may be the app writing the field's day differently from the step's
     (the request save, `planResponse`), not the seed; the writer to rule.
4. **seed: Full requested beside a later full sent.** 2 queries (`rj-dupe`, `seed-pkgq-3`), check 4.
   `seed-pkgq-3` is the query whose "Mark the full sent" re-stamps the step it already has (To-do card thread v1).
5. **display: the ✎ Edit beside a wide reply is cut off at 1280.** 2 queries, check 12.
   - Cause: QcCard152 `.qc152-fx`, placed `left: calc(100% + 8px)`.
   - It is seen on hover (`shots/*-edit-1280.png`).
6. **display: an email cut off by an ellipsis in the Agent tab at 1280.** 2 queries (`thin-ag-remind@example.test`),
   check 12. Cause: QcAgent158's contact row.
7. **logic: No Response is named two ways.** 2 queries, check 1. The slide-in's label says "Closed with no reply"
   (`STAGE_NAME`, lib/qcSummary); the grid card's track says "No reply" (`slipTrack`, lib/qc153).
8. **logic: a Revise & resubmit's ask is dated from the send.** 1 query (`seed-query-11`), 2 findings, checks 3 and 7.
   `materialGroups` (lib/qc1533) and `nextBox154` (lib/qc154) date it from `stageStartMs`, which falls back to the
   send date when there is no R&R date field. The grid says "asked 134 days ago"; the step is 19 Aug.
9. **display: Birds-eye's date has no year.** 1 query (`thin-q-close`), check 3. "Queried · overdue since 27 Sep" is
   27 Sep 2025, 418 days ago. Cause: QcBirds150's current label.

## 5. Checks that passed for every query

- **2:** the strip's word, the footer's lead, the grid's Next box and the group agree with the state, for all 88.
- **6:** the grid's Sent date, the thread's first step and the Materials tab's "With the query" date agree, for all.
- **8:** every footer action opens the journey its label names. The primary is the one the state's rule leads with,
  and Cancel returns the card as it was (one query per status, 10 statuses, no error).
- **9:** the To-do desk's card shows the Query Centre's thread for every one of the 45 queries with a task.
- **10, as far as it could be read:** the phone list's status label and the group counts agree with the desk: 24 with
  you, 5 with the agent, 41 gone quiet, 18 closed.
- **11:** every agent is named by first name; no he, she or they for an agent anywhere read.
- **1, for Birds-eye:** every Birds-eye row's current segment matches the status.
- **5, in part:** no "x days later" is negative, no step is in the future, and "Day N" equals the days since sent.

## 6. Surfaces that could not be checked

- **The phone's query page** (§1.2): only its list rows were read. Check 10's dates and next action on the phone are
  not checked.
- **Statuses Resubmitted and Signed:** no seed query has them.
- **The grid card's arrow chip** was read, not pressed (§1.6).
- **Composer journeys beyond the footer's own** (tell, accept, decline, unpass): not pressed. They are reached from
  inside the offer and reopen composers, and nothing is saved in this audit.

## 7. Screenshots

`shots/`: one per query with a finding (`<query id>.png`, the slide-in card at 1512 × 982), plus:
- `rj-send-edit-1280.png` and `seed-cal-passed865-q-edit-1280.png`: the hovered ✎ Edit at 1280;
- `thin-q-close-birds.png`: the Birds-eye row.

The rest of the list is the writer's to rule on.
