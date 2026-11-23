# Log a query v2.2 — report

Mock v25 (approved 23 Nov). Ref: `design-refs/log-a-query-v2-2/`; `sha256sum -c` passes, and the HTML hashes to `1886dee2…fef18`.

| | |
|---|---|
| Branch | `log-a-query-v2-2`, pushed and **not merged** |
| Dev line | `dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2-laq21-mg1-pc3-laq22` @ `06dd2ded0` |
| Dev serves | **`index-B8eJzEuU.js`** at https://scriptally-dev.web.app |
| main / prod | Untouched |

**Back out:** redeploy `dev/…-laq21-mg1-pc3` (`89df401ee`, `index-BoV5x3Ge.js`).

## Tell Nick first

**Anything that assumed the old card?** No. This pass was built on Plumage colours v3 from the start: the base dev line held both v2.1 and v3.

**The card itself.** `QcCard154`, `QcMatTile` and their stylesheets are not edited. One card behaviour could only be fixed in the card, so it is reported, not fixed:

- **Escape after a hover-opened materials pop-up.** The tile's Escape closes the pop-up and puts focus back on the tile, and the tile's `onFocus` opens it again. So with the mouse, Escape never seems to close it, and never reaches the leave check.
- By keyboard it works: the first Escape closes the pop-up and the next is the leave check (measured).
- The fix belongs in `QcMatTile`: either don't reopen on a programmatic focus, or don't move focus when the pop-up was opened by the pointer.

## What landed

| Phase | Status | Commit |
|---|---|---|
| Ref pack | Committed | `0b6266107` |
| 1 · The journey round the new card | **Landed (measured)** | `2dd4c5bfa` |
| 2 · Notes, as the query card shows them | **Landed (measured)** | `602a0fde4` |
| 3 · One count of queries sent | **Landed (measured)**, red before and green after | `88515c05e` |
| 4 · Words | **Landed (unit-tested; the not-sent screen measured)** | `31b879676` |
| 5 · Tests | **Landed (measured)** | `faaef3fb2` |
| Measured: shots, readings, compare sheet, decisions | — | `06dd2ded0` |

### Phase 1 — the card

**The card runs the full width of the column on both screens (D4).** Review and logged both measure 951 → 1437 at 100% and 494 → 944 at 150%; on both screens that is the column's own left and right edge. The logged screen's column now has the review's 20px insets (`.laq-yay` padding changed from 22 to 20).

**Room for the label.** There is 18px above the card on the review and 22px on the logged screen. Clear space above the label is 15.2px on the review (it was 9.2) and 36px on the logged screen. The label is fully visible on every screen at 100% and 150%.

**The stamp (D3).** It is set at `right: 24px; bottom: -30px`, white at 80%, with no blend mode. There is 34px of room under the card while it is on.

- Its bounding box is rotated, so it reads as 21px in from the right and 36.8px hanging below.
- **Stamp gate: passed.** The stamp's box meets no text in 12 readings: the review (during the stamp's 650ms) and the logged screen, with one, two and three materials and no reply date, at 100% and 150%.
- The review readings are taken with the thump and the panel's bump held at their end state (`holdStill`). Read mid-bump, the whole panel is scaled.

**The materials pop-up.** On the review it opens below the tile and stays inside the card's width: it measured 959 → 1243 against the card's 951 → 1437 (it used to start at 939). Nothing cuts it.

- The fix is in the journey: a wrapper, `.laq-pvc`, that QcMatTile's own `boundsOf` already reads (see "Decisions I took").
- At 150% the panel is short, so QcMatTile's own rule opens it above the tile.

**Paperclip.** The paperclip focus-ring rule is gone from `qcLogStages.css`.

### Phase 2 — notes

**The lift.** `QcNotes158` now exports `NoteArticle` and `NoteCompose`, and `NotesTab158` uses them itself.

- Its static markup is byte-identical before and after for four prop sets. I checked this with a one-off comparison against the previous file; it is not committed.
- `qcNotes158.test.tsx` is green and untouched, and QC158-10 to 13 are green on the emulator at 1512 and 1280.
- I did not take a "before" screenshot of the Notes tab; the markup check and QC158-10 to 13 stand in for it.

**On the review.**

- "Add a note" opens the tab's writing box, scrolled into view with the caret in it.
- Add note or Ctrl/Cmd + Enter adds the note. It is never saved on blur (measured).
- The note is drawn under a "Notes" heading set like "What went", with Edit and Delete always shown. Edit opens in place with Cancel and Save, and Ctrl/Cmd + Enter saves the edit. Delete removes the note at once.
- The link then reads "Add another note". Notes are listed oldest first.
- **Escape order:** pop-up, then an edit, then an empty box, then the leave check. A box with words in it goes straight to the leave check.

**Saving.** On Log query each note becomes a journal entry on the query, dated now. Words still in the box are saved as the last note.

- Measured: the saved list was `["…opening chapters.", "Left in the box"]`. Undo removes both with the query.
- The note appears on the query card's Notes tab exactly as typed, dated today.
- "Log and start another" starts with no notes.

### Phase 3 — one count of queries sent (D5)

`queriesSentOf(book)` counts one per query of the book, dated or not. The lock (28 queries, five of them undated) was red before at 24, and now gives 29 on the review and 29 on the logged screen. On the emulator (24 queries, three undated) the review said 25 and the logged screen said "Query number 25".

### Phase 4 — words

- **Not-sent screen:** now says only "The task is on your To-do page." It is measured in shot `not-sent@100`.
- **Dates in the logged line:** every date in all eight variants of `celebrationLine` uses no-break spaces, so "11 Jan 2027" never breaks across lines.

### Phase 5 — tests

- **V22-3**, the 25th query: the milestone "Twenty-five queries. That takes some nerve." shows.
- **V22-4**, reduced motion: no confetti, no thump, a still "+1", and the heading and count drawn in full at once, with nothing animating.
- **qc149 L11:** re-pointed. Its 8 of 8 readings are green.
- **cl251 B1:** both halves re-pointed and green.
- **cl251 B2:** retired. The desktop query card no longer reaches the respond mode B2 read; that is covered by `recordResponse1.measure.ts` (R1, R3, R12). The header's per-pick lines now have no rendered check on desktop.
- **laqV2 / laqV21:** the paperclip's words are re-worded to the materials tile's. Both specs pass in full.

## Step 0

| Gate | Result |
|---|---|
| 0.1 Disk | 38 GB free |
| 0.2 Base | Dev served `index-BoV5x3Ge.js` from `…-laq21-mg1-pc3` (`89df401ee`). It holds v2.1 (to `43a20e68b`) and v3 (to `0f47ab295`); only their report commits are missing. |
| 0.3 Ref pack | Arrived in `~/Downloads/log-a-query-v2-2.zip`. Every hash passed. Committed. |
| 0.5 Baseline | tsc 0. Build clean. Vitest 13,302 passed, 0 failed. My first Vitest run had 10 files failing to load because the worktree had no `functions/node_modules`; I linked it and re-ran before recording the baseline. |

### 0.6 — before screenshots in `before/`, readings in `readings-before.json`

**a. The stamp.** It sat inside the card at `left: 104px; top: 124px`. On the logged screen at 100% its box was (1082.6, 636) → (1189.7, 698.6) on a card at (981.5, 518.8) → (1406.5, 722.8). It covered the materials tile's count ("1", "2" or "3") in every case. On the review it appeared at the same spot for 650ms.

**b. The label.** It was not cut, but the clear space above it on the review was 9.2px, under the 10px the brief asks for. On the logged screen it was about 32px.

My first probe said the label was not "on top". That was the probe's fault: the label takes no pointer, so `elementFromPoint` looks through it. The fixed probe sees it.

**c. The pop-up.** It sat fully inside the panel and nothing cut it, but it hung 12px past the card's left edge (939 against 951).

**Escape order.** With the pop-up opened by hover, Escape never got to the leave check; the cause is in "Tell Nick first". This is unchanged after this pass: it is the card's code.

**d. Tile focus ring.** Yes: a 2px solid navy outline. Nothing to report there.

**e. Old specs on this base.** Yes: all of `laqV2` (10) and `laqV21` (4) passed on this base.

### 0.7 — premise checks

**f. The three "sent" counts.**

| Where | Code | What it counts |
|---|---|---|
| Review, before this pass | `sentAllTime` (dash2) | Leaves out queries with no sent date, or one after today |
| Logged screen | `count + 1`, from `forBook.length` | One per query of the book |
| Queries page header | Queries.tsx `sent: qcScoped.length` | One row per query of the book, dated or not |

On the v2.1 fixture book all four queries are dated, so every count says 4, and 5 after logging. With `seedLaq22` (24 queries, 3 undated), the Queries page says 24 and the review used to say 22 (21 + 1). It now says 25, and the logged screen says 25.

**g. How the journey's note is saved.** `QcLogStages` `note` went to `LogAnswers.note`, then to the host's `addJournalEntry(id, note)`. That is a journal entry, the record the query card's Notes tab lists. Undo already deleted the query's journal entries.

**h. Can the note and writing box become exported parts?** Yes, and it is done (Phase 2).

## Decisions I took

1. **The note header says the date, not "Today".** The ref draws "You · Today". The Notes tab's own `dayLabel` never says "Today"; it says "23 Nov". D2 and "reuse, do not copy" win, so the review reads "You · 23 Nov", the same as the card will afterwards.
2. **Notes are drawn under the card's `.qc152` class,** so the Notes tab's own sheet applies. The journey overrides three things in `qcLogStages.css`:
   - Edit and Delete are always shown.
   - The edit's Cancel and Save sit on the right, with the field styled as on the agent card.
   - The writing box sits in the flow rather than stuck to the bottom.
3. **The pop-up's bound is `.laq-pvc`.**
   - It clips sideways at the card's edges (`overflow-x: clip`).
   - It reaches 200px below the card, using padding cancelled by a negative margin, with no pointer on it.
   - `.laq-pvw` is `flow-root` so that margin can't collapse out.
   - There is no bound on the logged screen, where the reach would only add a scroll bar.
4. **An open edit is saved when Log query is pressed:** the words typed so far go in that note's place, unless they are blank. The brief says only "do not lose" the words in the writing box; this applies the same rule to an edit.
5. **34px under the card while the stamp is on the review too.** On the review the stamp appears for 650ms, and "Log and start another" only ever shows it there. Without that room its hanging half would cover "What went".
6. **The stamp is `aria-hidden`,** as in the ref.
7. **The edit field takes the caret at its start,** as the tab's does (`autoFocus`). It is unchanged.

## Where the build differs from the ref

- **The card is the real `QcCard154`.** Its pop-up chips use the card's own names ("Covering letter", "Synopsis"), while "What went" names the saved versions ("Letter B", "One-page synopsis"). The ref drew them the same.
- **The build's panel is narrower than the ref's 1052px canvas.** The proportions match.
- **The note header reads "You · 23 Nov",** not "Today" (decision 1).
- **At 150% the pop-up opens above the tile,** by QcMatTile's own rule.

## For Nick to rule on

1. **The two "sent" counts.** The Dashboard (`sentAllTime`) leaves out queries with no sent date or a future one; the Queries page counts every query of the book.
   - On the `seedLaq22` book that is 21 against 24.
   - The harness account's Queries page says "88 queries sent". I did not read the Dashboard's figure for that account.
   - The journey now follows the Queries page (D5).
2. **The materials tile's Escape after a hover** (see "Tell Nick first"). This needs a `QcMatTile` change.
3. **The tile's focus ring:** present. Nothing to rule on.
4. **The stamp gate:** passed everywhere. Nothing to rule on.
5. **cl251 B3 fails, outside this work.** It reads "the editor under the header is whole" on the agent card's new-agent panel, and the sections it expects aren't found. This branch touches nothing in the agent card. It has not been checked on the base.
6. **The "Recording response" header's per-pick lines** have no rendered desktop check since B2 retired.

## Gates and runs

| Gate | Result |
|---|---|
| tsc | 0 |
| Build | Clean |
| Vitest | 13,319 passed, 0 failed (baseline 13,302) |

**e2e on the emulator.** Every spec named below passes. I ran them in five passes, re-running only the failing specs after each round of fixes:

- `laqV22` V22-0 to V22-5 (V22-1 is unused).
- `laqV2`, all 10.
- `laqV21`, all 4.
- `qc149` L11.
- `cl251` B1 (B3 fails; see above).
- `qc158` QC158-10 to 13 at 1512 and 1280.

The other specs' report files were put back as they were. What those specs read is kept in `spec-readings/`, and strays went to `~/ScriptAlly-backups/worktree-strays-2026-11-23/laq22/`.

**Compare sheet:** `reports/log-a-query-v2-2/compare/index.html` (ref screens 01–09 beside the build).
