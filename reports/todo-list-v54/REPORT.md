# To-do list v54 — the page header, the pinned workspace, and housekeeping batches

Desktop only. Branch `todo-list-v54`, cut from the branch dev was serving when the run began,
`dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53` @ `a000d7154` (it carries v53; dev served `index-DtjKHDsx.js`).
Not merged to `main`. Dev: see §9. Prod untouched.

Refs: `design-refs/todo-list-v54/todo-desk-v15.html` (sha256 `3890f7f5…e64e`) and `todo-batch-v3.html`
(`dcee12f8…80fd`), both matching the brief and enrolled in `design-refs/.refhashes.json`. The hawk
`todo-hawk-desk.png` matched `b8efe537…7c345` (1000 × 1000) once Nick put it in Downloads (it was missing at first, which
stopped the run before any building).

## 1. False premises

1. **The armchair hawk is a PNG, not a WebP**, and has no conversion pipeline: `public/images/qc/qc-armchair-hawk.png`
   went in as supplied. The To-do page's own drawings (`mentor.webp`, `hour.webp`) are WebP in `public/images/todo/`, so
   the desk hawk is `public/images/todo/todo-desk-hawk.webp`: 480 × 480 (2× the 190px it is drawn at), `cwebp -q 86
   -alpha_q 100`, 48,592 bytes, transparent.
2. **The Query Centre's header components cannot be reused as they are.** `QcHeader1531` has the armchair hawk,
   "queries sent" and its two buttons built in, and `QcStageRing1531` is the rail's stage filter. Changing either was
   out of scope. What is reused is everything else: the To-do header wears the Query Centre's own classes
   (`qc1531-hd`, `-art`, `-t`, `-for`, `-acts`, `-b`, the ring's `-rb`/`-rsvg`/`-midn`/`-lg`…) under a `.qc151`
   wrapper so its page-scoped rules reach it unchanged, and the ring's geometry is `lib/qc1531`'s `RING_GEO`. Nothing
   in `queries/centre` was edited. `todoWs54.css` states only the differences (the wrapper's padding, a wider right
   column, the legend's note column, rust for "late").
3. **There were two sample models.** `SampleSpecPicker` sits on `agentMaterials` (what an agency ASKS for: units and
   amounts, several units at once, no start point). `lib/queryActions/sample.ts` has the start point and is what the
   Query Centre's log, sent, response and edit journeys pick with (`SampleControl`). Neither stored a start: the log
   journey's `materialsToQuery` wrote `{ material, type, quantity }` and dropped `sect`/`from`. D7's picker is built on
   `sample.ts`; `SampleSpecPicker` is unchanged (asks have no start).
4. **A section start could not be stored without new fields** (Step 0, item 4, a stop condition). Nick ruled (9 Nov):
   add optional `from`/`fromUnit` to `materialsWanted` items, an opening sample writing neither, one parser for both
   shapes, one wording for every place a sent sample is shown, and stop before touching the rules if they restrict an
   item's shape. **They do not**: `firestore.rules` checks only that `materialsWanted` is a list or map of 20 or fewer.
   No rules change.
5. **`sampleName` and `formatQueryMaterial` disagreed** about one of anything from the opening ("first 1 chapter"
   against "First chapter"), and `sampleName` named words counted from a word as a range ("words 20,000–25,000").
   Making them one function meant changing `sampleName` on both (§5).
6. **The tray's group headers are not sticky** (D3 names them). The rendered page held exactly one sticky element, the
   v54 workspace itself. There was nothing to fix; the one sticky header v54 adds (the batch table's) is built flush,
   and L3 sweeps every sticky element generically so a future one is held too.
7. **The mock's fourth material, "Bio", is one the app dropped on purpose** (CLAUDE.md, Agent list: Author bio and
   Full manuscript are stripped). The batch has the app's three: query letter, synopsis, opening sample.
8. **The emulator's batch is 63 queries**, so a batch of 6 or 14 (and L6's under-8 case) does not exist on it. A
   dev-only review aid, `window.__SA_TD54_BATCH = n` (`lib/todoBatchReviewAid`), keeps the batch's first n queries. It
   trims the board's own queue and invents nothing; the mode gate is at the call site and the production bundle
   does not contain it (grepped).
9. **"From {agency}'s guidelines, which don't say how much of a sample"**: the mock adds the clause to every agent
   whose guidelines name no sample amount, including those that ask for no sample at all. It is added only where the
   guidelines ask for a sample without an amount.
10. **"{n} late" on the Nudges line** is the most overdue nudge's days late, as the mock's "78 late" is. It reads as the
    brief writes it.
11. **The dev line needs `@sentry/react`**, which the primary checkout's `node_modules` lacks (as v53 found). The
    worktree used a thin `node_modules` (a symlink per package) plus `@sentry` 11.11.0 installed into the scratchpad.
    `.env.local` (the dev-only harness password) was copied in for the emulator and goes with the worktree.

## 2. Step 0

1. **What v53 built.** `TodoWorkspace` (`ws/`), `useWsCore`/`useWsBatch`, `wsFlows`, `WsPreview`, `todoWs.css`. The
   thin header was `.tws-hd` (title, the book in grey, "+ Add a task"); the tray's bar (`breakdownOf`) under the
   To do · Snoozed · Done tabs; the footer `.tws-wf` pinned under the questions box `.tws-wq` (which scrolls). The page
   never scrolled: `.tws` was a flex column `height: var(--tws-port)`, where `--tws-port` is the scroller's own
   `clientHeight` published by a `ResizeObserver` (never `100vh`); v53's L1 held `scrollHeight === clientHeight`.
2. **The Query Centre's header** (dev): `QcHeader1531` (`queries/centre/QcHeader1531.tsx`) and `QcStageRing1531`, both
   styled by `qcv1531.css` (most rules scoped under the page's `.qc151`). See false premise 2.
3. **Housekeeping today.** Kinds on the desk: "Fill in what you sent" (`materials_unrecorded` and
   `materials_unrecorded_bulk`, folded into one batch row, `key: "materials-batch"`, `kind: "batch"`, the queue oldest
   first), "What does {agent} want sent?" (a door to the agent card), reply time, wishlist, genres (`fix`). The batch
   ran through `useWsBatch` (`bRemaining`, `bCur`, skip) and `wsFlows`' `materialsFlow`: one query at a time, three
   tiles, written by `lib/materialsSweep`'s `recordSweepRow` → `toggleRowMaterial` → `sweepWrites` as the query's
   `materialsWanted` (strings, the sample with no amount). `fillFromAsks` and `copyFirstDown` existed for the page's
   bulk sweep (`BulkFillTable`, `PaneRecordSweep`), which the v53 desk does not mount. An agent's guidelines are its
   `materialsWanted` strings, read by `materialRowsFromAgent`.
4. **The sample model and picker.** See false premises 3 and 4.
5. **Where "the last choice" lives.** `users/{uid}.todoPrefs`, an unconstrained map written leaf by leaf
   (`updateUserPaths`). The choice is `todoPrefs.batchView` ("one" | "table"). No new collection, no rules change.

## 3. Commits

| Commit | Phases |
| --- | --- |
| `4e28ac004` | A — the page header (D1), the hawk WebP, the refs enrolled |
| `e00acaf46` | B — the header scrolls away, the workspace pins (D2); v53's L1 re-pointed |
| — | C — nothing to change (false premise 6); D3's rule is applied in G and held by L3 |
| `0cb08eddf` | D — the sample's storage, one parser, one writer, one wording; the picker; typed boxes in the drawer (D7) |
| `74f838003` | E, F, G — the batch band and switch, one at a time, all at once (D4, D5, D6, D8, D9) |
| `a39b8d09f` | H — the locks, the mutation runner, the screenshots, the re-pointed older cases |
| (report) | this report |

E, F and G share one component (`WsBatch54`), so they landed together.

## 4. Gates against the baseline

| Gate | Baseline (`a000d7154`) | Every v54 commit (A, B, D, E–G, H) | Merged dev branch |
| --- | --- | --- | --- |
| tsc (8 GB heap; the default heap aborts with exit 134 before and after) | 0 errors | 0 errors | 0 errors |
| `build:dev` | clean, no diagnostics | clean | clean |
| production build | clean | clean | — |
| Vitest | 4 failed / 11,731 passed / 3 skipped | 4 failed / 11,731 → 11,745 passed (+14 new) | 4 failed / 11,766 passed |

The four Vitest failures are the same four on every row (`functions/eval/generate.test.ts`, `emuGuard`,
`firestoreTarget` ×2), and the `firestoreTarget` offender list is unchanged (the new seeder goes through `fsTarget`).
Each run also reports one unhandled `Timeout calling "onTaskUpdate"`, the reporter's RPC under load, not a test.

**The older To-do suites** (todoV53, todoV52, todoWs, todoPhoneV1), on a fresh emulator:

| | Base (`a000d7154`), v53 + v52 | v54, all four suites |
| --- | --- | --- |
| Red | TD52 L1 "at most 1320 wide" (1512, 1920) | the same two; `todoWs` "the materials batch"; TD53 L4+L5 (1440) once; TD52 L14 once |
| Total | 2 failed / 38 passed | 5 failed / 62 passed |

- **TD52 L1 at 1512 and 1920, and `todoWs` "the materials batch"** were red on v53's own record and are red on the
  base: not v54. (`todoWs` was not run on the base here.)
- **TD53 L4+L5 at 1440** was red once in the 14-minute combined run: its 4-second wait for the logged stamp ran out. It
  passed in the v53-only run (26/26), in a targeted run at all three sizes (3/3), and in the base's combined run. I could
  not reproduce it and cannot rule v54 out entirely; it is recorded as intermittent.
- **TD52 L14 was a consequence of that red**, not a fault of its own: L4+L5 logs a real send and presses Undo after its
  stamp check, so when the check failed the send stayed logged and L14's "cleared this week" count read one more. L14
  passed on its own straight after the v53 suite on the same emulator.
- **Re-pointed by D2/D5**, with the reasons in `tests/e2e/RETIRED-todo-list-v54.md`: TD53 L1, L9 and the every-kind walk;
  TD52 L1 and the primary's reading (L6+L8, L7 ×6); `todoWs` "the workspace at". Each was red only because the page
  now scrolls by the header's height, or because the batch no longer ends on the check step.

## 5. D7 — the sample, stored and named

- `QueryMaterial` gains optional `from` and `fromUnit`. An opening sample writes neither: `sampleToMaterial` (one writer,
  `lib/sentSample`) is what the log journey and the batch both call. `sampleOfMaterials` (one parser) reads a
  structured item or a legacy string; anything without `from` is "from the opening".
- `formatQueryMaterial` (the card's paperclip, pills, timeline) names every structured sample through
  `capFirst(sampleName(sampleOfItem(item)))`, so "Reads as", the tile note, the table cell and the card cannot
  disagree. Opening samples read exactly as before (every existing `materials.test.ts` case passes unchanged).
- Wording changes in `sampleName`: one from the opening drops its numeral ("first chapter", the old pin in
  `queryActions.test.ts` updated); a run of words from a word reads "5,000 words from word 20,000".
- Unit: `src/lib/sentSample.test.ts` — an old record, a new opening sample (no `from` keys), chapters 4–6, pages 40–89,
  5,000 words from word 20,000, "first chapter" in both readers, 37 pages from page 40 → "pages 40–76".
- The drawer's `SampleControl` takes typed amounts and starts in its steppers (committed on blur or Enter).
- ⚠️ Phase D's commit used the `ssp-` class prefix, which the agent card's `SampleSpecPicker` already owns, so each
  picker's rules reached the other (the agent card's "What to send" would have been restyled). Found in the batch
  screenshots; the E–G commit renames the picker to `snt-`.

## 6. The locks — `tests/e2e/todoV54.measure.ts` (TD54)

**Green:** 18 cases on the final code (`tests/e2e/todoV54.measure.ts`, one worker, `npm run dev:emu`), and 18 again on the
merged dev branch. L1, L2 and L3 run at 1440 × 900, 1920 × 1080 and 1366 × 768; the rest at 1440, L12 at 390.
Readings: `reports/todo-list-v54/readings/`.

**Red first:** `tests/e2e/td54Mutate.sh`, each lock under its own break at 1440 (`reports/todo-list-v54/mutation-proofs.txt`).
Layout breaks are page-side (`TD54_MUTATE`); logic breaks are one line of the shipped code, changed in the worktree and
restored from a path-named backup.

| Lock | The break | The assertion that fired |
| --- | --- | --- |
| L1 the page scrolls by at most the header, then the frame fills the window | the workspace 80px taller | L1 · the page scrolls by no more than the header's height |
| L2 the footer is pinned on every step, header gone | the questions box stops scrolling | L2 · first task: the footer's bottom on the desk's |
| L3 nothing shows above a sticky header | the table view's 16px top padding back | L3 · TH. in DIV.tws-wq: flush with the box's top |
| L4 the new asset, on nothing | the armchair hawk on a grey box | L4 · the new asset |
| L5 need you = waiting + nudges + quiet; legend = tray | the legend says 99 nudges | L5 · need you = waiting + nudges + quiet |
| L6 under 8 / 8+ / saved / Quick fill | the threshold at 15 | L6 · 14 queries, no saved choice: all at once |
| L7 pre-filled (sample too); none saved | guidelines never pre-fill | L7 · pre-filled from the guidelines |
| L8 same-week + same-asks only; one Log; Undo all | the same-week rule off | L8 · pre-ticked = same week or same asks, and only those |
| L9 typed 37 pages from page 40 | the writer drops `from` | L9 · saved as 37 pages from page 40 |
| L10 Copy never overwrites | Copy overwrites filled rows | L10 · a filled row is never overwritten |
| L11 the mismatch note, answer kept | the note never shows | L11 · the note under the picker |
| L12 the phone unchanged | a v54 part injected on the phone | L12 · no v54 parts on the phone |

**What the locks caught on the way** (each fixed in the commit named):
- L7: an untouched row kept the agent's OLD guidelines when the first render came from Firestore's local cache (E–G:
  untouched rows are now derived).
- L8: Undo wrote `[]` where a query had no `materialsWanted` at all (E–G: it removes the field). L8 also first entered
  only the "asks for the same" branch; it now moves one send date to put the "same week" branch under test as well,
  and asserts each branch was entered.
- L9: Undo's 14 writes, one after another, were cut off when the page closed (E–G: they run together, and the lock
  waits for them to land).
- L4, L5: two breaks on a 100ms timer fired after an immediate read, so the locks went green under them; the breaks
  now apply at once as well.

## 7. D3 — every sticky header

The rendered page (computed `position: sticky` over every element in the To-do page) held one sticky element before v54:
none. After v54 it holds the workspace (`.tws-ws`, sticky by design, D2; its 12px is the window's margin) and the batch
table's four column headings. The headings stick at 0 in a box with no top padding (the tools row pays that space as
a margin), so nothing of the scrolled rows shows above them. L3 reads it at three sizes, with the box really scrolled:
each heading's top is flush with the box's top (gap 0), and the point 1px inside the box's top edge belongs to the
heading. **The tray's group headers are not sticky** and were not made so (false premise 6).

## 8. Screenshots

`reports/todo-list-v54/shots/`: `header-top-{1440,1366,1920}.png`, `pinned-{1440,1366,1920}.png`,
`batch6-one-at-a-time.png`, `batch6-did-the-same.png`, `batch6-no-guidelines.png`, `batch6-all-at-once.png`,
`sample-picker-section.png`, `batch14-all-at-once.png`, `batch14-sample-panel.png` (37 pages from page 40),
`batch14-one-at-a-time.png`.

## 9. Dev

- Dev was serving **`contact-list-v27` @ `393dcb17d`** (`index-BZZ8fY_4.js`) by the time v54 was ready: another session
  deployed Contact list v27 while this ran. Identified by the bundle's Sentry `release` stamp and its Contact list v27
  code. So v54 was merged onto THAT, as a new branch, rather than onto the branch v54 was cut from:
  **`dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53-cl27-td54` @ `c27ec62ec`** (pushed). The only conflict was the
  refs manifest (both sides added entries; all kept). Contact list v27 also widens the Query Centre header's selectors
  to `:is(.qc151, .cl27)`, so the To-do header's rules still match; the merged build was screenshotted and all 18 locks
  pass on it.
- Deployed from a clean scratchpad checkout of that pushed tip with `npm run deploy:dev` (hosting, then
  `functions:smartImportMap`, which is unchanged). **Dev serves `index-CnZfSAXv.js`**, the same name as the local
  build; the served chunk contains v54 and the hawk WebP returns 200.
- ⚠️ **Contact list v27's own branch does not contain v54.** If that session deploys its branch again, v54 leaves dev
  until it is merged in.
- Branch `todo-list-v54` (pushed) is not merged to `main`. Prod is untouched.

## 10. Not done, and why

- **"What does {agent} want sent?"** is unchanged: it is single-agent and was a door to the agent card on v53; D9 asks
  only that it has no view switch, which it never had.
- **A one-query "Fill in what you sent"** (a batch of one) is still v53's flow, writing through `sweepWrites`: D4–D9
  are about batches. Its sample therefore has no amount or start yet.
- **The batch's last log shows no milestone** ("Housekeeping's done") the way v53's stamp-then-on does: the batch logs
  on its own and leaves the board through the save.
- **`SampleSpecPicker`** (the agent card's asks picker) has no typed boxes: it picks what an agency asks for, and the
  brief's typed amount and start belong to the sample that went.
- **The query card's paperclip** shows the new wording through `formatQueryMaterial`; the batch's preview card itself is
  the query as stored (the mock's paperclip count on the "You sent" bubble is shown as the line under the card).
- **TD53 L4+L5 at 1440** is recorded as intermittent (§4).
- **The worktree** `../ScriptAlly-td54` and the scratchpad deploy checkout are removed at the end of the run; both
  `.env.local` copies go with them.
