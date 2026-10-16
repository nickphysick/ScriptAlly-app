# Contact list v18.2 — report

Branch `contact-list-v18-2`, worktree `~/ScriptAlly-cl182`. Parts A to D are each one commit; a fix found by CL182 D1 is
its own commit; E (locks, retirements, CLAUDE.md, this report) is the last.

## False premises

1. **"'List health' never wraps" was already true.** v17 set `white-space: nowrap` on it (`contactV17.css`, `.cl17-hl
   .cl17-ht b`). A4 is therefore GREEN on the base build; it is red only under its mutation (remove `nowrap`), where the
   label does wrap. The rule is restated in `contactV182.css` so the lock names its owner.
2. **The mock's 199 / 173 archivist heights do not transfer.** At both 1512 and 1280 this app is on its COMPACT sizes
   (the sheet is under the `sheet-wide` switch), so the title block is 179px tall at both widths and the archivist is
   179 × 201. A1 asserts the relationship (archivist height = eyebrow top to button bottom), never the mock's numbers.
3. **"The title block … moves left with it" is the mock's geometry, not ours.** In the mock the title row is inset far
   enough that pulling the art into the margin moves the text left. Here, at 1280 the row's inset is already the 40px
   floor, so the text moves RIGHT (312 → 491). At 1512 it lands on the same 491. To keep the List health card still at
   1280, the title row's middle column may now close to 0 (it had a 40px floor); measured, 14px stay clear between the
   title block and the card.
4. **"Hovering a letter tab no longer moves the page" was already true at the full size.** v18's strip already
   reserved 52px; what was wrong was the compact strip (52, not 46) and the hover heights (50, not 42 / 46). A3 is
   red on base on the hover heights, not on movement.
5. **The counter's named mutation is the base build's own formula, and it reads the same.** "{total − remaining + 1}"
   and "{saves in this run + 1}" agree for Save, Skip and Undo, so D2 is green on base and under its mutation. It
   would differ only when a task leaves a run by another route (a save outside it); no sequence the drawer offers
   produces one today. **D2 is unproved by its mutation, and is reported as such.**
6. **"They don't say" on every question** — only reply has a stored "not stated" value (§0.4). The link is left off
   materials, genres, wishlist and reopen, as the pack directs. D6 asserts that state.
7. **Responses RS1 is not in this base.** Responses v2 is unmerged, so no RS1 suite exists to run in L1.
8. **The mock's ring (aspect-ratio on a stretched grid item) cannot be copied.** A grid sizes columns before rows, so a
   width taken from a stretched height grew the ring to ~340px. It is a stated square: 118 full, 110 compact (the
   compact drawer is 560 wide, and at 118 the third tile's label ran to its edge).

## Base, and what dev served

- **Base tip:** `dev/main-cl18-todo51-cl181` = `d3dd2a94` (main + Contact list v18 + To-do v5.1 + v18.1). It contains
  v18.1: CL181's eight locks passed against the deployed site the night before (the `#a5837b` frame, the stand slip,
  the four-row "What to send").
- **Dev before:** `index-BFjZu6hN.js` (that branch). **Dev after:** see the end of this report.
- Baseline gates at the base, before any edit: tsc 0, `vite build` 0 (no CSS warnings), `build:dev` 0, Vitest 590 of
  591 files (8,878 passed, 3 skipped); the one red is `functions/src/email.test.ts` failing to load, the known
  baseline.

## §0 Recon

1. **The header.** The title block is `.cl17-tb` (eyebrow, title, byline) in a grid `.cl17-tr` (columns `max-content
   minmax(40px, 1fr) auto`), with the buttons `.cl17-acts` in row 2 of column 1 and the card spanning both rows in
   column 3. `hawk-shadow.png` was a child of the HEADER (`.cl17-hd`, `isolation: isolate`), absolutely placed from its
   left at `z-index: −1`. The letter strip's height was a stated 52px (content-box) with tabs bottom-aligned.
   - **The archivist's height** cannot be pure CSS: its width (height × 1.123) decides where the text starts, and a
     width that follows a sibling's height is a cycle. ONE `ResizeObserver` reads the text's own extent (eyebrow top to
     buttons' bottom) and writes `--cl182-ill-h`; nothing else writes it.
   - **⚠️ `--cl17-inset` holds a percentage**, which resolves against whatever element reads it; on the title block it
     was a share of the grid area and put the text 114px too far right. The pull restates the inset from `--cl17-w`.
2. **History's event sources** (for one agent):

   | Event | Source | Date |
   |---|---|---|
   | Added | `agent.dateAdded` | as stored |
   | Query (any manuscript) | the query document: `dateSent`, `sendMethod`, `materialsWanted`, `manuscriptId` | `dateSent` |
   | Partial / full / new version requested | the stage, via `stageHistory` (`partialRequestedDate`, `fullRequestedDate`, feed rungs for R&R) | the stage's start; "by" = `expectedSendDate`, for the CURRENT request only |
   | Partial / full / new version sent | the stage (`partialSentDate`, `fullSentDate`, …) | the stage's start |
   | Offer | the stage (`offerDate`); answer-by = `offerResponseDeadline` | the stage's start |
   | Pass / no reply / withdrawn / signed | the closing stage; the writer's note = `agentComments` | the stage's start |
   | Nudge | the feed: `NUDGE_SENT` / `eventKey: nudge_sent`, by `queryId` | the row's date |
   | Note | the agent's `notes` subcollection | `createdAt` |

   - **⚠️ The stages come from the query documents through `stageHistory`, never the global feed alone**, which can
     carry residue from undone sends. A current stage nothing dates is LEFT OUT.
   - **Profile edits:** `AGENT_UPDATED` rows exist in the feed, but they carry no `agentId` (they are matched by the
     agent's name in the description text) and the pack gives no title for them. No edit entries are drawn.
   - **No stored source, for Nick:** a send's METHOD for a partial or full (only the original query's method is
     stored); a request's "what" (only the status); a past request's "by" date (only the current one is stored); "reply
     time set to about {n} weeks" at the time of adding (the reply time has no history). Each would need a field
     written at the event, plus the rules and a prod rules deploy.
3. **Housekeeping's order, before:** `hkModel` sorted by `gapScore` (live 30, fit-but-unqueried 20, plus a per-gap
   weight), then name. `byAgent` sorted by best score, then gap count, then name. The drawer's By agent groups
   re-sorted by points total, then name. Up next, the focus queue, "Coming up", whole-queue runs and the ledgers read
   `hkModel`'s order. **After:** one comparator, `listHealth.taskOrder` (points, then queried, then name, then id);
   `hkModel` and `byAgent` use it, and the drawer re-sorts nothing (D1 caught the one re-sort left behind).
4. **"Not stated" values:** reply has one (`todoPrefs.contacts.settled`, `"{agentId}:reply"`, honoured by
   `agentGaps`). Materials, genres, wishlist and reopen have none; the settled list is documented and read as reply-only.
   **For Nick:** honouring "settled" for those keys is a derivation change in `agentGaps` (no new field), but the To-do
   data-quality card (`agentDataQualityNeeds`) reads the agent's fields directly and would go on asking. Making the
   two agree is the real work. No rules change is needed for the settled list itself.
5. **The website** is `agent.website` (a string, stored as typed); the panel's `panelLinks` makes it a link
   (`https://` added when absent). The focus card reads the same function.
6. **Undo (v18 F.5)** was already in the footer (7s), restoring through the page's own Undo (`onFix` → reply-time
   deadlines and reminder tasks included). v18.2 dresses it ink and steps back the run's counter and the tally.
7. **Keycaps:** the "/" in the list header's search (`.cl13-kbd`), the "H" on the floating tab (`.hkv-kbd`), and a
   "(F)" in the full-screen button's tooltip. All three are gone; the keys still work. The shell's ⌘K is untouched.

## The locks — CL182 (ledgers in `ledger/`)

Readings: green / total. "base" is the build before the pack (`d3dd2a94`); "mut" is the named mutation; "—" means the
lock crashed on base (its subject does not exist there), which is a red.

| Lock | base | mutation | green | Mutation |
|---|---|---|---|---|
| A1 archivist | 7/9 | 15/19 | 19/19 | image height 160 (page) |
| A2 shadow | 2/10 | 8/10 | 10/10 | drop the hover z-index (page) |
| A3 tabs | 6/8 | 4/8 | 8/8 | the strip sizes to content (page) |
| A4 label | **4/4** | 2/4 | 4/4 | remove `nowrap` (page) — green on base, false premise 1 |
| B1 band | 5/11 | 5/11 | 11/11 | colour the band by whose move it is (page) |
| B2 slip | 6/12 | 10/12 | 12/12 | the old fill for not queried (page) |
| B3 history | 14/26 | 18/26 | 26/26 | sort oldest first (page) |
| C1 header | — | 6/12 | 12/12 | the tiles as divs (page) |
| C2 key | 6/8 | 6/8 | 8/8 | the key inside the header's overflow (page) |
| C3 intro | 2/5 | 4/5 | 5/5 | remove the sticky (page) |
| C4 ways | 4/8 | 7/8 | 8/8 | prepend the card without hiding the rest (src) |
| C5 keycaps | 4/6 | 4/6 | 6/6 | restore the "/" hint (page) |
| D1 order | 3/6 | 2/6 | 6/6 | sort by name only (src) |
| D2 counter | **5/5** | **5/5** | 5/5 | derive it from the remaining queue (src) — **unproved**, false premise 5 |
| D3 in step | 1/5 | 4/5 | 5/5 | the tab updates on close only (src) |
| D4 flight | 1/4 | 2/4 | 4/4 | a second pop (page) |
| D5 undo | 6/8 | 5/8 | 9/9 | Undo restores only the score (src) |
| D6 not stated | 5/6 | 4/6 | 6/6 | write an empty value (src) |
| D7 website | — | 4/5 | 5/5 | render it unconditionally (page) |
| D8 date | — | 5/6 | 6/6 | save the first chip (src) |
| D9 tally | — | 3/5 | 5/5 | count across openings (src) |
| D11 minutes | — | 1/4 | 4/4 | leave it opening a run (src) |

Final run: **23 passed, 184 readings, all green** (`CL182_SHOTS=1`).

- **The writing locks put the account back.** D2, D3, D4, D5, D6, D8 and D9 work on the bare fixture `clv181-bare`
  and re-seed it after; D5 checks the document deep-equal after Undo; D8 checks Undo removes the reminder it made; D6
  removes the settled leaf with `hkFlags.mjs --unsettle`. D7 gives the fixture a website for one test (the account has
  no agent with both a website and a gap) and re-seeds.
- **D5 was first a crash under its mutation** (a missing card made the next `fill` wait out the test); it is now a
  reading, and red on three of them.
- **B2's 1.5px dotted border reads 1px at DPR 1**: the browser snaps a border to whole device pixels. The reading
  accepts either and says so.
- **Source mutations** were made and undone in a separate measurement worktree (`~/ScriptAlly-cl182mut`), from
  path-derived backups, never a git command.

## L1 — no regression

`l1.md`: green on every suite on this branch (CL16, CL17, CL171, CL18, CL181, QC138 to 138.4, header v3). The base
build's two reds are CL18 F1/F2 as re-pointed (expected) and qcV1382 D1 (the known flake). The first run surfaced one
real loss, the panel's route to open a query, which commit "B fix" restored by making History's query entries open
their query.

## Retired

`tests/e2e/RETIRED-contact-list-v18-2.md`: CL181 B1's band colours, CL181 B5's Queries body, CL18 F5 (the two pops);
CL18 F1 and F2 re-pointed. CL18 F3 is kept (it asserts equality, not the score order); CL18 A1 to A3 never asserted a
50px hover height, so there was nothing to retire there.

## Shots

`shots/`, named for the screens they sit beside (`0n-…`), plus: `x-header-1024.png` (the archivist hidden),
`x-agents-1920.png`, `x-history-two-manuscripts-1512.png`, `17-hk-points-key-1280x800.png`, `12-hk-intro-1280x720.png`
and `19-hk-save-flight-1512.png` (the flight mid-arc, 400ms after Save). The locks take most with `CL182_SHOTS=1`;
`contactV182Shots.measure.ts` takes the rest.

## For Nick

- **History events with no stored source:** a send's method for a partial or full; what a request asked for; a past
  request's due date; the reply time as it was when the agent was added; profile edits by agent id (the feed rows match
  by name). Each needs a field written at the event, the rules allowlist, and a prod rules deploy.
- **Questions with no "not stated" value:** materials, genres, wishlist, reopen. The settled list can hold the keys
  today; `agentGaps` would read them, and the To-do data-quality card (`agentDataQualityNeeds`) would have to read the
  same list or the two would disagree. No new field, no rules change; a prod deploy of the app.
- **History's query entries open their query** in the same panel, as the old ledger did ("Back to {first}" returns to
  History). That is not in the mock; without it the panel had lost its only route to a query, and CL16 F4 caught it.
  Your own records (added, notes) stay plain.
- **"1 letters and replies"** — the summary copy is the pack's, so a single one reads "1 letters and replies".
- **Your List health and order on your real data:** not read. That is your prod account, which I can't sign in to. On
  the harness account List health is unchanged by this pack (the points table and formula are untouched; 77% before
  and after on the same data). The order changes only among ties: equal-points tasks now put queried agents first, then
  sort by name, where the old score mixed fit and queried.
