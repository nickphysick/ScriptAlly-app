# To-do list v58.2 — the figures tell the truth

Built overnight, 21–22 Nov 2026. Desktop To-do list only. There are no colour or layout changes. The phone's figure functions, `recomputeQuery`, the seed and the page header's counts are untouched.

## 1. Step 0 and false premises

- **Branch:** dev served `index-C2XX1fR5.js`, built from `dev/cr1-qc163-db3-acv2-cr5-qcc-acv21-nu1-cr11-acv211-nu11-td58-td581` @ `1191045d4`. That branch contains To-do list v58.1: the "v58.1" block at the foot of `todoWs58.css`, and every desk header navy. `todo-list-v58-2` was cut from it, so no merge was needed.
- **The brief said A1 must "expose which source `taskDue`'s chase case used". It already does.** `taskDue` returns a `source` on every `DueFact` (`src/lib/taskDue.ts:36–57`, chase case `:244–251`):
  - a hold returns `"hold"` (`:210`);
  - `nudgeDate` returns `"reminder"` before any nudge, or `"check-in"` after one;
  - otherwise it returns `"window"`.

  The only gap was carrying the source to `trayFigure`. `TrayItem.dueSource` and `WsTask.dueSource` now do that.
- **The chase case has three sources besides the window, not two.** `nudgeDate` means a planned nudge (`"reminder"`) before any nudge, and a booked check-in (`"check-in"`) after one. All three writer-set sources read "since your reminder" (decision 3).
- **The step06 table, re-checked on this branch.** Every row of "Where each figure counts from" still holds:
  - `trayFigure` is at `src/lib/todoWs.ts:361` before this work.
  - `waitAnchorMs` is at `src/lib/todoBuckets.ts:521`: send `:529–530`, rr `:532`, chase/close `:538–541`.
  - `taskDue` is at `src/lib/taskDue.ts:202`: hold `:210`, decide/arrived `:231`, chase `:244–251`.
  - `dueDays` is at `todoWs.ts:166–167`.

  One correction: an R&R's task is bucket **"decide"** (`kindOf`, `todoWs.ts:130`), not "send". Its anchor is the decide case's `lastStatusChange`, the same date the table gives.
- **A request counted from `lastStatusChange` is not always a "restart".** v55 (D7) made that fallback on purpose, for records written straight to a request status (`todoBuckets.ts:524–528`). It counts from the status's last move, which a later status write can also move. v58.2 replaces it with the log, as ruled.

## 2. A0 — the two dev records: not read

Nick's dev records are in his own account. The only credentials this session has are the harness account's (`harness@scriptally.test`, from `.env.local`). Reading Nick's account needs his sign-in, which is wider access than this, so **A0 was skipped** as the brief allows.

What I did read, read-only, as the harness account on `scriptally-dev`:
- one filtered query for agents named "William Tan" and one for "Greg Panetta";
- the matching agent's one query, and that query's activity;
- 4 document reads in all, with nothing written.

The harness account has a William Tan at **Penrose & Lyle** (query `cv25-q-02`, Rejected), not Foxglove, and no Greg Panetta. Nothing else was read. The throwaway script was deleted and never committed.

So A6.3 is answered from the code (section 4), not from the records.

## 3. What changed

| Phase | Commit | What |
|---|---|---|
| A1 | `54c6893f6` | a nudge's words follow its source |
| A2 | `8f43495aa` | an offer counts from the day it came in |
| A3 | `c5c2eec93` | an own task's words |
| A4 | `059313c30` | a request with no stored request date counts from the log |
| A6 | `b204c32a5` | locks |
| A6 | (the commit that carries this report) | measurement spec, after shots and readings, this report |

- **A1** (`todoTray.ts`, `todoWs.ts`): the tray item carries `due.source`, and `trayFigure`'s nudge case reads it.
  - Past a hold, a planned nudge or a check-in: "{n} day(s) since your reminder".
  - Past the reply window: "{n} day(s) past expected".
  - Not yet reached: "{n} days left". The day itself: "Today". No date: the waiting figure.
  - Which date wins is `taskDue`'s, unchanged.
- **A2:** an offer reads "{n} day(s) since it came in", in calendar days.
  - It counts from `offerDate`, else `lastStatusChange`. The same day reads "Today"; with neither, there is no figure.
  - An offer no longer reads its due dial, so a hold on an offer never turns it into "past expected" or "days left".
- **A3:** an own task past its date reads "{n} day(s) past its date". "days left" and "Today" stay.
- **A4** (`requestAskedMs`, `todoTray.ts`): applies to a partial or full request, and to an R&R.
  - It reads the stored request date first (an R&R has none).
  - Otherwise it takes the **earliest** matching request in the query's activity log, after `dropSupersededProvisional`.
  - Otherwise it returns null, and the row shows no figure.
  - `trayItem.waitMs`, which the row's figure counts from, reads it. `lastStatusChange` is no longer a fallback for these.
  - It is a pure read. `anchorMs` (the tray's sorts) and `waitAnchorMs` (the due dial, the card's "Asked on") are unchanged.
- **A5:** the desk chip (`deskChip`) already read `trayFigure`, so it changed with the row, and a lock now holds it to the row for every kind.

## 4. A6.3 — what "Nudge William" and "Send Greg your partial" will read on dev (from the code)

- **Nudge William**, which read "115 days past expected" from 29 Jul:
  - If 29 Jul is a hold, or William's `nudgeDate` (a planned nudge or a booked check-in), it will read **"116 days since your reminder"** (one day on).
  - If it is a `responseDeadline` stored as 29 Jul, that is the reply window, and it will still read **"… days past expected"**.
  - Which of these holds needs his record (section 2).
- **Send Greg your partial**, which read "3 days waiting" and restarted:
  - If his top-level activity log holds the partial request (28 Jun on his Tracking tab), it will read **about "147 days waiting"**, counted from 28 Jun, and no later write moves it.
  - If the request exists only in the Tracking tab's mirror log (see A4 below), the row will show **no figure** rather than a wrong one.

## 5. A4 — why a record whose log has the request has no derived request date

**There are two activity logs, and the card and the derivation read different ones.**

| | The Tracking tab | `recomputeQuery` |
|---|---|---|
| Function | `buildTimelineRows`, `src/components/reading-pane/QueryTimeline.tsx:230` (the dedupe at `:245–250`) | `derivePipelineDates`, `src/lib/queryDerivation.ts:247–260` |
| Log it reads | `users/{uid}/queries/{id}/activity` | `users/{uid}/activities` |
| Fields | `type`, `createdAt` | `resultingStatus`, `date` (`orderedStatusBearing`, `:150–160`) |
| Which entry per status | the earliest | the latest |

The app writes both in one batch (`db.tsx:2692–2693`), so for anything logged through the app they agree.

A record can still show a request on its card and have no request date when:

1. **The request is only in the mirror.** Seed fixtures, and older or imported records, wrote the query's `activity` subcollection but not a matching top-level `activities` entry.
   - In the seed: `seed-cal-passed865-q`, `seed-query-20`, `seed-query-7`, `seed-query-9`, `rj-dupe`, `msv12-q-3`, `msv12-q-4` have the request only in the mirror.
   - Most have a stored date anyway, written by hand. `seed-cal-passed865-q` has neither.
2. **The record was written without `recomputeQuery`.** A top-level request entry exists, but the derived fields were never refreshed.
   - In the seed: `cor-move-a` and `seed-query-11` (the R&R).
3. **The two logs keep different entries.** Even where both logs hold the request, the dates can differ: the card shows the earliest, the field holds the latest.

For Greg the likely cause is 1 or 2. His record says "partial sent" on 14 Oct while its status is still Partial requested, which is the shape of a record not recomputed since. Confirming it needs his record. Not fixed here, as ruled.

## 6. A5 — who else reads the figure

- **The desk chip:** reads `trayFigure`, so it is the same as the row for every kind (locked).
- **The page header's "{n} past expected"** (`breakdownOf`, `todoWs.ts:417` → `WsHeader56` and `WsSlim56`) counts every task, except Gone quiet, whose `dueDays` is below 0. On the seed that is **29**:

  | Tasks | Count | Why `dueDays` is below 0 |
  |---|---|---|
  | sends | 11 | their due day is the day the agent asked, which is always past |
  | own tasks past their date | 8 | |
  | nudges past the reply window | 4 | |
  | nudges past a hold | 3 | |
  | nudges past a planned nudge | 2 | |
  | offer | 1 | its due day is the day it came in |

  So **only 4 of the 29 are past an agent's reply window.** Reminders, offers, own tasks and requests are all included. Left alone, as ruled.
- **`startReason`** (`todoWs.ts:533`) still says "{n} days past expected" for any negative `dueDays`. Nothing outside its tests calls it, so no page shows it. Left alone.
- **The phone** (`dayBit`, `dueChip`, both `todoWs.ts`; left alone, as ruled) still says:
  - "{n} days past expected" for a nudge past a reminder or hold (the desktop says "since your reminder");
  - for an offer, it counts from the offer's dial ("arrived" or a hold), not `offerDate` (the desktop says "since it came in");
  - "{n} days past expected" for an own task past its date (the desktop says "past its date");
  - a request with no stored date still counts from `lastStatusChange` there, through `dueDays`/`waitAnchorMs` (the desktop counts from the log).

## 7. A6.2 — the agreement table, re-run over the emulator seed

The same throwaway chain as v58.1's Step 0.6 (never committed), run at 00:01 on 22 Nov. "Before" is v58.1's run at 19:04 on 21 Nov; numbers one day higher are the clock, not a change.

**Now agree, because the words changed:**

| Task | Before | Now | Counts from |
|---|---|---|---|
| Nudge Alasdair | 48 days past expected | 49 days since your reminder | hold, 4 Oct |
| Nudge Marcus | 78 days past expected | 79 days since your reminder | hold, 4 Sep |
| Nudge Tom | 78 days past expected | 79 days since your reminder | hold, 4 Sep |
| Nudge Imogen | 64 days past expected | 65 days since your reminder | `nudgeDate`, 18 Sep |
| Nudge Hester | 40 days past expected | 41 days since your reminder | `nudgeDate`, 12 Oct |
| Answer Tom's offer | 91 days past expected | 92 days since it came in | `lastStatusChange`, 22 Aug |
| Answer Noah's offer | none | 95 days since it came in | `offerDate`, 19 Aug (it has no `lastStatusChange`) |
| 8 own tasks past their date | "{n} days past expected" | "{n} days past its date" | their `dueDate` |

**Now agree, because the date changed (A4):**

| Task | Before | Now | Counts from |
|---|---|---|---|
| Send Marcus your partial (`cor-move-a`) | none | 76 days waiting | the logged request, 7 Sep. **Seed:** the log also has the partial sent on 21 and 23 Aug, before it was asked for |
| Send Iris your revision (`seed-query-11`) | none | 147 days waiting | the logged R&R, 28 Jun. **Seed:** logged before the query was sent, 8 Jul |
| Send Jonathan your full / Clara / Marcus (Bloomsbury Quill) (`cv25-q-09`, `-06`, `-07`) | 58 / 80 / 72 days waiting | **no figure** | No stored request date and no logged request. The old figure counted from `lastStatusChange`, which equals `dateSent`. **Seed** |

**Unchanged and agreeing** (window nudges, stored request dates):

| Task | Figure |
|---|---|
| Nudge Wren | 49 days past expected |
| Nudge Devendra | 38 days past expected |
| Nudge Mira | 22 days past expected |
| Nudge Douglas | 33 days past expected |
| Send Theo / Tobias / Imogen / Edda / David / Rachel / Ana / Marcus (full) | from their stored request dates |
| Every Gone quiet row | as before |

**Still at odds — all seed, as expected:**

| Task | Why |
|---|---|
| Send Ottoline your full (`seed-cal-passed865-q`) | no figure: the request is only in the mirror log, and there is no stored date |
| Send Marcus your full (`seed-pkgq-3`) | asked before it was sent; sent but still Full requested |
| Send Tobias your full (`rj-dupe`), Send Ana your full (`seed-query-9`) | sent while still requested |
| Cormac's / Joan's / Tobias Quint's gone quiet | a nudge logged but not stored in `lastNudgeSentDate` |
| Elinor's / Sam's / Peter's / Ana's gone quiet | sends logged but not stored |
| Imogen's / Devendra's gone quiet | closed in the log, open in the status |

## 8. A6.4 — tray titles that wrap to two lines

| Size | Before | After |
|---|---|---|
| 1512 (tray 394) | 8 of 53 | **10 of 53** |
| 1280 (tray 340) | 14 of 53 | **17 of 53** |

- **Before** is v58.1's after run, on the same code with the same seed, measured on 21 Nov.
- **After** is `tests/e2e/todoV582.measure.ts` on the emulator.
- **Every new wrap comes from the new words or new figures**, row by row against v58.1's readings:

  | Size | Rows that now wrap | Why |
  |---|---|---|
  | 1512 | Nudge Alasdair; Answer Noah's offer | "49 days since your reminder" is longer than "48 days past expected"; Noah's offer had no figure before, now "95 days since it came in" |
  | 1280 | Nudge Alasdair, Marcus, Imogen and Hester; Answer Noah's offer; Send Marcus your partial (`cor-move-a`) | the same; on the 340px tray the figure stacks, and the column is as wide as its words, so "since your reminder" takes more width than "past expected". `cor-move-a` now has a figure |
  | 1280 | Send Clara / Marcus / Jonathan (Bloomsbury Quill) **unwrapped** | they lost their figure (A4) |

- The wordings are ruled and Part A makes no layout changes, so this is left for Nick (section 12).

## 9. A6.5 — screenshots (1512)

`after/nudge-window-open-1512.png`, `after/nudge-reminder-open-1512.png`, `after/offer-open-1512.png` and `after/own-open-1512.png`.

In each, the desk chip's text was read off the page and asserted equal to the row's:

| Open | Row | Chip |
|---|---|---|
| Nudge Wren (window) | 49 days past expected | 49 days past expected |
| Nudge Marcus (a hold) | 79 days since your reminder | 79 days since your reminder |
| Answer Tom's offer | 92 days since it came in | 92 days since it came in |
| Chase the Blaine partial (own) | 60 days past its date | 60 days past its date |

The first run of this test failed on my probe, which read only the chip's `<b>` ("49"). The probe now reads the chip's whole text; re-run, 2 passed.

## 10. Locks, and red-then-green

`src/lib/todoWs582.test.ts`, 16 cases. Each population is asserted non-empty first. Each fix was removed in turn and the file re-run, then everything was restored and run green, 16 of 16.

| Fix removed | Locks that failed |
|---|---|
| A1: the nudge back to `dueFigure` | both A1 cases |
| A2: the offer back to its due dial | all 3 A2 cases, plus the 2 A5 cases (the offer fixtures lost their figure) |
| A3: the own task back to `dueFigure` | the A3 case |
| A4: `waitMs` back to the old anchor | all 5 A4 `trayItem` cases |
| A5: `deskChip` reading the phone's `dueChip` | the chip-equals-row case |

No existing test pinned the old wording for these kinds, so none needed updating.

## 11. Baseline against final

| Gate | Baseline (before A1) | Final |
|---|---|---|
| `tsc --noEmit` (8 GB heap) | 0 errors | 0 errors |
| `vite build --mode development` | clean, 4,086 modules | clean, 4,086 modules |
| Vitest | 4 failed / 13,061 passed / 4 skipped | 4 failed / 13,077 passed / 4 skipped (+16: the new locks) |

The 4 failures are the same at both ends: `events.test` ×2 and `firestoreTarget` ×2, which also failed in v58.1's baseline.

A plain `vite build` (production mode) builds only the public pages (417 modules). The app is built in development mode, so that is the gate used.

## 12. Decisions made without Nick

1. A snooze that has come back (a hold) on a nudge reads "since your reminder". This was not ruled individually.
2. A planned nudge (`nudgeDate` before any nudge) and a booked check-in (`nudgeDate` after one) both read "since your reminder", since both are dates the writer set.
3. An offer's day count is in calendar days (the same day reads "Today"), like the due figures. Request figures still count whole 24-hour days, as before.
4. The offer's figure ignores a hold on the offer, so a hold never makes it say "left" or "past expected".
5. A4 reads the top-level `activities` log, the one the page already holds and `recomputeQuery` derives from. It does not read the Tracking tab's per-query mirror, which the page doesn't load: one listener per query would cost reads on every load. Where only the mirror has the request, the row shows no figure.
6. A4 takes the **earliest** logged request, as the Tracking tab shows, though `recomputeQuery`'s stored date is the latest.
7. The tray's sort order (`anchorMs`) and the card's "Asked on" (`waitAnchorMs`) were left on the old anchor. Only the figure moved. A request with no stored date can therefore sort by one date and count from another.
8. Wrapped titles rose (8 → 10 at 1512, 14 → 17 at 1280; section 8) because the ruled words are longer, and I changed no layout to absorb it. **Nick:** shorten the words, or let the stacked figure's words wrap onto two lines?

## 13. Seen and left alone

- The header's "past expected" count (section 6) counts 25 tasks that are not past any reply window.
- The phone's wording (section 6).
- `startReason` still says "past expected" for any negative due day; nothing outside its tests calls it.
- Three seed sends (`cv25-q-06`, `-07`, `-09`) now show no figure, because their records hold no request at all.
- There are 7 worktrees besides the primary, over CLAUDE.md's 5. All belong to other sessions, so none was touched.
