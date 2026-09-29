# Clean-up pass — the background repair, requeries, materials everywhere, dates, leftovers

28 Sep 2026. Worktree off main at `599a468d`; direct to main, one commit per item (item 1 is two: the code, then its migration results). Dev only.

> **⚠️ THE FORTNIGHT VIEW IS NOT ON ANY LIVE PAGE.** No route in the app renders it. `DeskBelow`, its only real host, is mounted nowhere, and `DiaryCarousel` appears only in the dev-server lab `#/diary-lab`, which is given no activities. Anything said below about the Fortnight view is held by a unit test (`addedRowsAgree.test.ts`), never by a screenshot of the app.

## Commits and the deployed build

| Item | Commit | What |
|---|---|---|
| 1 | `c392a58d` | The runtime repair is deleted. Reconstructed steps are flagged and never outrank a real event. "Added" rows are keyed by id. Dev rules. |
| 1 | `d8526708` | The migrations applied on the harness account; the Fortnight view's duplicate-hiding is removed. |
| 2 | `448a1653` | A requery explains itself, with a link to the earlier query. |
| 3 | `ef455fb0` | The materials treatments on every surface that shows a query's history or header. |
| 4 | `ce3ebab7` | One date formatter; "Sep", never "Sept". |
| 5 | `aac4507c` | Already done in `949e8f25b`; only the comments that outlived it are removed. |

- **Dev hosting:** deployed from a clean worktree of `aac4507c`. It serves `index-BJkCjPPu.js` and `index-BZpmqtO7.css`, checked with curl.
- **Dev rules:** deployed from `c392a58d`. The release updateTime moved from `16:00:04Z` to `17:23:52Z`. The only change is `reconstructed` (only `true` is valid) on the per-query log.
- **Prod rules and hosting are Nick's.**

## 1 · The background repair

**What it was.** `db.tsx` 1350–1502 re-ran 1.5 seconds after *any* change to agents, activities, manuscripts or queries, all session long. On every run it read the log of each closed query, then wrote three things:
- agent "Added" rows, matched by name;
- manuscript "Added" rows;
- a status step for any query with none.

**Reads saved (1f).** One run read **38 query logs, 121 document reads**, on the 83-query harness account. It then ran again after every save, every snapshot and every page change. **Now: 0.**
- Nothing remains to run "once per session". A backfill on reload would bring back an "Added" row the writer had deleted, which 1g forbids.
- The historical gaps are closed once, by the migration below.

**1c: reconstructed steps.**
- A log row with `reconstructed: true` sorts by its date, but decides the status and the last status change only while the log holds no real status-bearing step.
- Only the flag counts, never the `act-status-` id, so a row held for your ruling behaves exactly as before.
- Tracking and the To-do/quick-card rails draw it as **"Recorded from the imported status"**, with the drained ghost ring, no status fill, and the status as the sub-line.

**1d.** `addAgent` writes `act-added-agent-<id>`.

**1g.**
- An "Added" row the writer deletes stays deleted.
- A step deleted in Tracking stays deleted.
- The Tracking delete path's re-delete workaround and its comment are removed. The comment in ResponseJourney that described the heal race is corrected.

### Migration counts — `tests/e2e/migrateRecordCleanup.mts` (harness account, dev)

Each migration was dry-run first (`audit-before.json`), then applied. It was run a second time (**changing nothing**), reverted (the audit after revert **equals the audit before, byte for byte**), and applied again (`audit-after.json`). No mode recalculates the status. 1a and 1b re-read every touched query and stop if a stored status or date moved; none did.

| | Dry run | Applied |
|---|---|---|
| **1a** queries past Queried with no status step | **0** (the runtime repair had already filled them all) | 0 written |
| **1b** reconstructed steps | **31** | — |
| · the only record of the query's status | 22 | **22 flagged** `reconstructed` and kept |
| · beside real events, removing changes nothing | **0** | 0 removed |
| · beside real events, removing would move a date | **9** | **HELD**, see below |
| **1e** "Added" rows | 45 agent · 12 manuscript | — |
| · duplicates (e.g. renamed agents) | 0 | 0 |
| · for agents / manuscripts that no longer exist | 9 · 7 | **13 removed**. The 3 for the packages session's `pkg21-` agents were left under the standing rule; that session has since removed them itself. |
| · an agent or manuscript missing its row | 1 (`clv-fx-never`) · 0 | 1 written, dated from its own `dateAdded` |

- The first 1b apply stopped partway with a Node error, most likely a write denied while the new rules were still propagating. Its backup had been written first, and the second run completed the remaining 13.

### 1b — held for your ruling (nothing applied)

Removing any of these would change **no status**, but it would move dates (and, for two of them, the responded flag or the revision round). In every case the reconstructed step is the only record of that stage's date.

| Query | Current status | The step | If removed |
|---|---|---|---|
| `rj-dupe` | Full Requested | Full Requested | fullRequestedDate and responseReceivedAt 8 Sep → none |
| `seed-cal-passed865-q` | Full Requested | Full Requested | fullRequestedDate and responseReceivedAt 17 Mar 2024 → none |
| `seed-pkgq-3` | Full Requested | Full Requested | fullRequestedDate and responseReceivedAt 20 Jun → none |
| `seed-pkgq-4` | Partial Requested | Partial Requested | partialRequestedDate and responseReceivedAt 25 Jun → none |
| `seed-query-7` | Partial Requested | Partial Requested | partialRequestedDate and responseReceivedAt 28 May → none |
| `seed-query-8` | Partial Sent | Partial Sent | hasAgentResponded true → false; partialSentDate 1 Jun → none |
| `seed-query-9` | Full Requested | Full Requested | fullRequestedDate and responseReceivedAt 5 Jun → none |
| `seed-query-10` | Full Sent | Full Sent | hasAgentResponded true → false; fullSentDate 9 Jun → none |
| `seed-query-11` | Revise & Resubmit | Revise & Resubmit | revisionRound 2 → 1; responseReceivedAt 13 Jun → none |

All nine are fixture queries. They are held, unflagged, and behave exactly as before.

### 1e — the Fortnight view

- Its duplicate-hiding code is removed, and a unit test holds that it and the dashboard feed count the same "Added" rows, a duplicate included. The test goes red against the old code.
- **⚠️ The Fortnight view is on no live page.** `DeskBelow` is mounted nowhere, and `DiaryCarousel` only appears in the dev-server lab `#/diary-lab`, which is given no activities. So the side-by-side screenshot you asked for can't be taken from the app, and the unit test stands in for it.

### Tests (each proved red first)

- `reconstructedStep.test.ts` (6): a reconstructed step dated after a real event doesn't decide the status; it is labelled in Tracking and on the rails. Red by mutation.
- `recordRepairGone.test.ts` (4): no effect writes a step or an "Added" row; **no effect on the data lists reads a query log, so a save triggers no repair reads**; `addAgent` keys by id; the workaround is gone. Red against the old code.
- `addedRowsAgree.test.ts` (2). Red against the old Fortnight code.
- `recordCleanup.measure.ts` (5 rendered):
  - a renamed agent still has **one** "Added" row;
  - a deleted "Added" row stays gone after a reload;
  - a Tracking step deleted stays gone past 1.5 seconds, and **Undo restores it**;
  - the old race made deterministic: a step gone while the stored status still reads it is not written back.
  - Red on a build of the old code for three of them. The Tracking case alone cannot go red, because the old repair only fired on a log with no status step at all and the old delete path re-deleted anything that came back. That is why the deterministic case was added.
- The migrations: run twice → the second changes nothing; reverted → identical to before. Run and recorded above.

### Flag, not changed

`seed.mjs` writes queries with a status and an empty log. With the runtime repair gone, a re-seeded account needs `--apply-1a` run again, or the next recalculation of such a query drops it to Queried. `seed.mjs` is off-limits, so this is reported rather than fixed.

## 2 · Requeries explain themselves

- **`lib/requery.ts` is the one check**, used by the log and by every reader. The earlier query must be:
  - the same agent and the same manuscript;
  - not the query itself;
  - closed (passed, no reply, withdrawn or signed);
  - sent **strictly earlier**;
  - still existing. An undone or deleted query isn't in the list, so it is never named.
  If several qualify, the latest one is used. The line is worked out when it is read, never stored.
- **Found:** the log used the first closed match in list order, with **no date test**, so a later closed query could be named as the "previous" one. It now calls the same check with the date being logged.
- **Shown on:**
  - the dashboard feed — the link opens the earlier query's card;
  - Tracking — above the materials box;
  - the quick card;
  - the To-do pane.
  The wording is "Requery · previously passed 3 Jul", or "previously closed 12 Aug, no reply", or "previously withdrawn…".
- **Tests:** `requery.test.ts` (12), one per case: another book, another agent, itself, live, later, deleted, the latest of several, the wording, and the feed row. Each rule is red by mutation. The self-exclusion is proved on its own with a later send date, because the date test alone also excludes a query from being its own previous one.

## 3 · The materials treatments everywhere

**Sweep:** the chip and box (`SentChip` / `SentBox`) were used only in the Query Centre's open card and its Tracking.

**Now also in:**

| Place | Header chip | Box |
|---|---|---|
| Dashboard quick card | under the agent | on the send entry, and at the top of the Materials tab (its "Sent" row read `materialsWanted`, which a package send clears, so a package query said "Nothing recorded") |
| Query Centre fan cards | ✓ | the fan draws no tabs |
| To-do pane | beneath the agent | on the send entry |
| Calendar drawer | under the agency | under the journey's first node |
| Contact list profile | above the query trail | above the query trail |
| Query Centre drawer, under 900px (QueryPanel) | under the name | its Tracking already had it |

- Every place uses the one shared component. On the timelines it reaches the send entry through a new `extra` slot, via SendExtras.
- The old three-column arm of Tracking (`Queries.tsx` ~7785) has been unreachable since the Query Centre became the grid page, so it was left as it is.

**Test:** `materialsEverywhere.measure.ts` plants three queries (package, individual, unrecorded) and removes them afterwards. **All five surfaces show the right chip and box for each (15 assertions).** Each surface's case goes red on a build of the previous commit.

## 4 · Dates

- **`lib/dates.ts`:** `formatDate` formats exactly as the platform would, then swaps in a fixed three-letter month. `MONTHS_SHORT` is the one month table.
- **Every change is listed in `dates-changes.md`:**
  - 92 short-month calls in 60 files, rewritten by a codemod on the TypeScript parser with the receiver and options untouched;
  - 24 private month tables;
  - `boardWindow`'s table, which said "Sept" (the Calendar's month band);
  - two sample strings in `queryEmptyCopy`;
  - the packages page's material line "saved 2 Sept" (`packagesPage.ts` `shortDate`). **The packages session was told first** and handed that file over.
- **Locks:**
  - `dates.test.ts` (6), red three ways: a call back on the platform formatter, "Sept" in a string, a second month table.
  - `noSept.measure.ts` sweeps every workspace route plus a September query's Tracking: 23 routes, 4 of which show a September date, so the sweep has something to catch. **On the previous build it goes red on three:** the Calendar ("AUG SEPT OCT"), packages ("SAVED 2 SEPT") and Tracking ("5 SEPT").
- **Retargeted, each with its reason stated:** four unit tests asserted the old "Sept".
- **⚠️ A slip of mine, repaired before committing.**
  - While routing the month tables, a script used the table as a grep pattern, which matched as a regex character class. It inserted a stray import into ~580 files, one inside an object literal in `brand.tsx` and one in a CSS file.
  - Nothing was committed. Exactly those lines were removed, no file was left with only a whitespace change, and the build, tsc and the full suite were then green.

## 5 · Leftovers from the v1.1 rulings

Both were already done in **`949e8f25b`**: the unreachable note sheet in `HousekeepingSweep`, and `RecordingCalendar` with 53 unused classes (109 rules). That commit proved it with tsc, the build and before/after screenshots of every route at 1440. `aac4507c` removes only the comments that still described them as live. The minified stylesheet is byte-identical before and after, so no route changes.

## Screenshots (`reports/cleanup/shots/`)

- `before-feed-entry.png` / `after-feed-entry.png`: the feed row, with "Requery · previously passed 3 Jul" added.
- `before-quick-card.png` / `after-quick-card.png`: "Requery sent · 23 SEPT · VIA EMAIL" and nothing else, against the chip, the requery link, the dashed individual box and "23 SEP".
- `after-tracking-page.png` and `after-tracking-reconstructed.png`: `rej-query-1`, whose only record is a flagged step, reading "Recorded from the imported status" with a drained ring.
  - Also visible in that shot: the step (2 Aug) sits above "Query sent" (12 Aug). That fixture's recorded change predates its own send date, and Tracking always pins the send as the first entry. It's older behaviour, reported here and not changed.
- The feed and Fortnight side by side: not possible, because the Fortnight view isn't on a live page (see 1e).

## The test run against dev (`SA_E2E_BASE_URL=dev`, serving `index-BJkCjPPu.js`)

| Suite | Result |
|---|---|
| `recordCleanup` (item 1) | 5 passed · 6 assertions |
| `materialsEverywhere` (item 3) | 6 passed · 15 assertions |
| `noSept` (item 4) | 2 passed · 23 routes, 5 showing a September date, none saying "Sept" |
| `packagesPartB` (regression) | 6 passed · 44 assertions |
| `packagesJourney` (regression) | 11 passed · 94 assertions |

- Unit gates for every commit: tsc, the production build and full Vitest were green (8,243 tests at `aac4507c`).
- Every planted fixture was removed in its own run. One residue row was found and removed: `act-added-agent-rq-agent`, which the before build's runtime repair wrote for the screenshot fixture after it had been removed. No `rc-`, `me-` or `rq-` data remains.

---

# Follow-up on Nick's rulings (28 Sep)

## 1 · The nine held steps are flagged

- `migrateRecordCleanup.mts --flag-held` adds `reconstructed: true` (and its `eventKey`) to the nine, and removes nothing.
- **Before each write it proves the flag moves nothing.** The app's derivation with and without the flag must agree on every field, or it stops. After the writes, the stored query is re-read, and a change to any status or date stops it.
- **Result:** 9 flagged. The derivation was identical for each, and no stored status or date moved. A second run flagged 0.
- **All 31 reconstructed steps on the account are now flagged.** The backup is `backup-flag-held-*.json`.
- Six of the nine were on queries `seed.mjs` writes (`seed-query-7…11`, `seed-cal-passed865-q`), so the re-seed below replaced them with its own flagged steps. The other three (`rj-dupe`, `seed-pkgq-3`, `seed-pkgq-4`) keep their flagged step.

## 2 · `seed.mjs` writes each query's history instead of an empty log

- **What it writes.** Every query the seeder writes gets dated steps, one for each stage the seeder already dates on the document:
  - the send;
  - each request and each send;
  - the closing.

  They are flagged `reconstructed`, because a seeded history stands in for one exactly as an imported history does. **This is a deliberate step past the ruling's "first step".** With a single step, the next recalculation would have erased the fixture's other stage dates (a Full Sent query's `partialRequestedDate`, for example). With one step per dated stage, a recalculation reproduces the document's status **and** its stage dates.
- **The Calendar fixtures** date only the send, so their status step is placed a minute after it, which keeps the order unambiguous.
- **Reversible.** The seeder clears only the seeded queries' own logs, and writes a backup of every document it removes to `reports/seed/steps-backup-*.json` **before** deleting anything. `node tests/e2e/seed.mjs --revert-steps <backup>` removes the steps and restores the old documents.
- **Test: `tests/e2e/seedCheck.mts`.** Seed, then derive exactly what a recalculation would write:
  - no status may change;
  - no log may be empty;
  - no stored stage date may change.

  | State | Result |
  |---|---|
  | The account as it stood | **Red:** 3 empty logs, 9 statuses would change (e.g. `seed-query-7` Partial Requested → No Response). Logs had drifted through earlier test runs. |
  | After seeding | **Green:** 28 seeded queries, 0 empty, 0 status changes, 0 stage-date changes. The seeder replaced 160 accumulated log documents with 60 dated steps. |
  | After `--revert-steps` | **Red again**, with exactly the original 3 and 9. The revert restored the account exactly. |
  | After seeding again, and a second time | **Green** both times. |

- **⚠️ One other change in `seed.mjs`, flagged because the ruling said nothing else would change.** The seeder could not run at all: its no-window agents batch recomputed the immutable `dateAdded` from today, so every run after the first day was refused. The unmodified seeder fails the same way today. It now keeps the stored value where there is one, which is the same fix the file's other agent batches already carry. Without it the steps could not be tested.

## 3 · The stray-import accident — confirmed clean

- **The import line across the whole tree** (`git grep`, CSS included):
  - 24 files import `MONTHS_SHORT`, and every one uses it beyond the import. They are the 24 month tables.
  - Every one of those import lines sits among its file's imports.
  - The only other files that mention it are `lib/dates.ts`, `lib/dates.test.ts`, `Queries.tsx` (a local alias of the same table), and these two reports.
  - **No CSS file mentions it.**
- **`git diff ef455fb0 aac4507c`** (the commit before item 4, to the end of the pass):
  - **96 files, exactly the intended set, with none outside it and none missing:**
    - the 60 codemod files;
    - the 24 month tables;
    - `dates.ts` and `dates.test.ts`;
    - `noSept`;
    - `packageResults`, `EmailImportReview`, `queryEmptyCopy` and `boardWindow`;
    - the 4 retargeted tests;
    - `dates-changes.md`;
    - item 5's three comment files.
  - All 96 have a real, non-whitespace change.
  - `src/lib/brand.tsx` and `queryCentreGrid.css`, the two files the accident actually damaged, are **unchanged** across that range.

## 4 · The Fortnight view

Stated at the top of this report. The unit test stands.

## 5 · The Tracking ordering quirk

Left as it is, as ruled.
