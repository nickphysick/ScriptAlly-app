# Navy bar and address book v1

Branch `navy-bar-address-book-v1`, cut from the branch dev served: `dev/css1-pv3-ms27-ms28-ms281` at **e54396d8** (`index-BmbaNVwq.js`). It carries Query Centre v142 (`bf766a32`) and `cards-sort-search-v1` (`4e480b2a`); both were checked as ancestors before any work.

Refs: `design-refs/navy-bar-address-book-v1/`, all 24 SHA256s verified (0 mismatches).

## False premises (read these first)

1. **The Contact list had no multi-select, no bulk actions and no Export.** B6 and L12 ask to keep "the existing selection state and bulk actions" and to put Export "on the existing export handler". None of the three existed: the Cards and List views had no ticks, and the only CSV export in the app was the Query Centre's. The mock's bulk bar only raises toasts ("Opens Log a query with 3 agents filled in"). **Built new:** a tick state in the address book, a selection row offering only actions that really work (**Select all N**, **Export N**, **Clear**), and `lib/agentCsv.ts` (formula-safe, through `csvCell`). The mock's *Log queries*, *Add to a package* and *Tag* were **not built**: the query drawer logs one agent at a time, and agents have no tags.
2. **There is no submission-form address on an agent** (`lib/agentPanel.ts` says so in as many words). The card's fourth contact row shows **how they take queries** (`methodAnswer`: "By email", "Through QueryManager" …); its "+ Add" opens the editor at *method*.
3. **Socials are not editable in the agent form.** Only the MSWL link is, through `socials`. "+ Add social" opens the editor at the MSWL field. The row shows the agent's first X/Bluesky/Instagram/other handle on record, else the MSWL link.
4. **An agent already has a `notes` field** (`Agent.notes`, string, in the update allowlist). It is the legacy flat note, shown as the oldest bubble in the agent card's notes thread. The card's Notes field reads and writes it (saved on blur through `commitAgentEdits`). **No field was added and no rules changed.**
5. **"330 when `.ws-window` ≤1440" contradicts the 1512 screens.** At a 1512 window `.ws-window` is about 1,250 wide, so that rule would put 1512 in the narrow layout. The 1512 screens draw 372 with markers showing. **The breakpoints are the window's (`max-width: 1440px`)**, which is the mock's own media query. This also applies to the hidden markers, the 23px count, the 28px name and the 19px wishlist.
6. **"No kbd visible on the page"**: the one keycap still visible is the shell's top-bar search ⌘K, which shows on every route. It is shell chrome, not the Query Centre's. **Left as it is**; L2 asserts no keycap inside the page sheet. Removing it is a one-rule change to the shell if wanted everywhere.
7. **The Contact list's "remembered view" is gone with the views**: the `view` field still exists in `qh.cl.view` for older readers, but nothing reads or writes it now.

## Step 0 — inventory

| Old function | Where it lived | Where it went |
|---|---|---|
| Multi-select (initials ticks) and bulk actions | did not exist on the Contact list (QC has its own `BulkBar138`) | new: avatar checkbox (hover) → "{n} selected · Select all · Export n · Clear" in the header's search row (`book/ContactBook.tsx`) |
| Export | did not exist on the Contact list | new `lib/agentCsv.ts`; in Filters' footer ("Export {v} agents") and the selection row |
| Group by | `ContactListControls.GroupMenu`, `ContactListHead` | **removed** (pack). The grouping still sits in `qh.cl.view` and is ignored |
| The agent drawer / "Open card" | `panel/AgentPanel.tsx` via `?agent=` (rows, Housekeeping, deep links) | **retired on this page.** `?agent=`, Housekeeping's "open card" and an add select the agent in the book and dock it. The editor doors open the agent card's editor (centred) at the field. `AgentPanel.tsx` and `AgentHistory.tsx` are deleted (no importer left) |
| Tray actions: Copy email, Submission page, Log a query, primary | `ContactCards` / `ContactRows` / the panel | the card: COPY/OPEN on email and website, "Log a query" or the next step as the query block's link (`panelFoot`, the panel's own derivation), "See the query" for a closed one |
| "Fill in the gaps" | the panel's footer → Housekeeping's single-agent run | the card's footer, when the agent has gaps (`agentGapLine`) → the same Housekeeping run. **Interpretation:** the pack's "targets the card's '+ Add' fields for each agent in turn" is the Housekeeping run, which walks an agent's gaps one field at a time; the hero's "Fill in the gaps" (all agents) is unchanged |
| The peek | `ContactPeek` inside `ContactRows` | gone with the rows; the card shows everything the peek did |
| The panel's ⋯ (Open in Query Centre, Send a nudge, Remind me when they reopen, Delete agent…) | `AgentList.panelMenu` | **a ⋯ on the card's footer** opens the agent card's quick view, whose own ⋯ has Delete agent…, Open in Query Centre and Copy email. *Send a nudge* is the card's primary when a nudge is due. *Remind me when they reopen* is the quick view's. **Deviation:** the pack's footer has only "Edit agent"; without the ⋯, Delete would have had no home on this page |
| The panel's History and Queries tabs (other books' queries) | `AgentHistory` | **no home on this page.** The quick view and the Query Centre hold an agent's queries. Reported, not dropped silently |
| ↑ ↓ J K row keys, Enter, L | `AgentList` global keys over the rows | ↑/↓ move the selection while the list has focus (pack). J/K/Enter/L have no rows to act on and are not bound. `/` focuses the book's Find; H still opens Housekeeping |
| Notes field on the agent | `Agent.notes` (exists) | used |
| StatusDot | `components/StatusDot.tsx` | used in the card's status pill and steps |
| Recessed well | `components/shell/findWell.css` | the book's Find joins its scope (`.nb1-top`) |
| Sort menu | `components/shell/SortChip.tsx` (`SortChipMenu`) | reused; gains `heading` ("Sort by") and `note` (null draws none). The QC's menu is unchanged |
| Landing card frame | `src/marketing/heroCard.css` `.mk-lc*`, used by `QcCards142` | the card's frame repeats its values (7px mat, 20/14 radii, landing shadow, #d9c8ba border). It doesn't import the marketing sheet, whose `.mk-lc` rules are tied to the landing card's inner layout |

## Part A — Query Centre v144 "all in navy"

Commits `6736e0b1` A1 · `7bdce527` A2 · `235e82b0` A3 · `bb6a2b9c` A4 · `16ea1856` A1 follow-up: a space between the bar's number and its word. The count read "87queries" as text, which is what a screen reader announced and what QC142 L4 reads.

- **A1** `QcToolbar140`: the bar draws the count (`[data-qc144="count"]`, "27 QUERIES" / "8 of 27 queries") and the Cards / List switch on the navy, then Filters · Group by · Sort; Sort in both views. The jump row is gone in both modes, with its fold, "+N more" menu and `JumpMark`, and its CSS is deleted (`qcv140/141/142.css`, removed with a selector-aware script and checked against the files afterwards). The column headings are plain labels and Due's is blank. Keycap hints are gone from the page; the keys still work.
- **A2** `QcList138`: `.qc144-srow`, the pill. Find (620 max, 60 tall) and Full screen (navy, Special Elite 18), centred on the list card, 40 above it and 22 to it, under the two drop shadows. It replaces v142's title row; the Full screen button keeps the v138.6–v142 probes.
- **A3**: in full screen, Find is a rounded white 40px field in the cream toolbar, max 520, left of Filters. The pill row isn't drawn.
- **A4**: "C · Ruled" headings in both views: glyph 20, Special Elite 23, mono 11 at .45, a 1px .14 rule to the right edge, padding 22 36 6. Stuck, white with a 14px fade below (`::before`). The stuck hook now reads the Cards headings too.
- **Shared:** `qcv144.css` (new); `SortChipMenu` reused unchanged here.

## Part B — Contact list v23 address book

Commits `9b35f1a2` (the model) · `80ce4f3d` (B1–B6, the book).


- `lib/contactBook.ts` (the pills, sections per sort, avatar state = `AgentFacts.stand`, the Your move deadline, the count, the steps, the selection), with `contactBook.test.ts` (17).
- `book/ContactBook.tsx` + `contactBook.css`: the box (B1), the navy column (B2), the avatars (B3), the strip and the card (B4), full screen (B5), the ticks and exports (B6).
- `AgentList.tsx`: the book replaces the title row, the list head, the filter strip, the Group menu, the applied row and Cards/List, from 1,620 lines to 960. **Deleted** with no importer left: `ContactCards`, `ContactFilterStrip`, `ContactListHead`, `ContactSkeleton`, `ContactGroupHeading`, `ContactLetters`, `ContactTitleRow`, `panel/AgentPanel`, `panel/AgentHistory`. `contactV19.css` and `contactV20.css` lost their importers but still style the hero (`cl17-hd`), the group and the scroller's foot, so AgentList imports them directly. **The hero and breakdown card were compared against the base build at 1280 and 1512: 45 boxes each, identical geometry, faces, colours and backgrounds.**
- **Docking:** the box is the scroller's height − 40; the scroller's bottom padding is 20 on this page, so at the end the box sits 20 from both edges. A wheel over the box scrolls the page until the box is 20 from the top, then the list scrolls. Nothing is sticky against the page.
- **Commit split (deviation):** the B sections share one component, and committing B1 without B2–B6 would leave the page broken, so Part B is two commits: the model (`lib/`) and the book.

## Locks — NB1

`tests/e2e/nb1.measure.ts`, helpers `nb1Lib.ts`; ledgers in `ledger/` (`base-` = the base build, `mut-` = under the named break).

| Lock | Base (red first) | New | Under its break |
|---|---|---|---|
| L1 QC bar | 4/20 | 20/20 | 16/20 (jump row restored) |
| L2 QC pill | 0/10 | 10/10 | 4/10 (Full screen back in a title row) |
| L3 QC full screen | 8/16 | 16/16 | 4/16 (search left in the pill row) |
| L4 QC headings | 10/24 (crashed short: no ruled heading) | 56/56 | 12/56 (cream ledger restored) |
| L5 CL one view | 2/8 | 8/8 | 6/8 (a toggle kept) |
| L6 CL dock | 0/2 (no box) | 12/12 | 4/12 (header `position: sticky`) |
| L7 CL count | 0/2 | 8/8 | 2/8 ("Contact list" title added) |
| L8 CL avatars | 0/8 | 42/42 | 38/42 (Not queried drawn solid cream) |
| L9 CL sections | 6/12 (population red) | 12/12 | 10/12 (letters for every sort — source edit) |
| L10 CL card | 0/2 | 12/12 | 10/12 (› steps through every agent — source edit) |
| L11 CL full screen | 0/2 | 10/10 | 8/10 (navy backdrop) |
| L12 CL kept functions | 0/6 | 10/10 | 8/10 (hover checkbox removed) |

Notes:
- **L2's base run used the earlier version** of the keycap check (the whole document). The final version scopes it to the sheet (false premise 6); the base page was red on every other L2 reading anyway.
- **L8 corrected its own reading**: Tailwind's preflight gives every element a solid 0px border, so "no border" is width 0; a declared 1.5px dashed border snaps to 1px on a 1× screen.
- **L4's "16px band"** cannot be diffed against the ref's pixels (different data under it), so it asserts what the comparison was for: the band under a stuck heading starts white and has no hard step (max adjacent-row change < 12 of 255).
- L10 writes a note to the shared harness account and puts the original back in the same run (both checked).

## L13 — earlier suites

Run against the final build (`runs/l13-summary.txt`): **QC142, QC141, QC1411, QC140, QC1401, HR1 v1.1, CSS1 and NB1 pass (53 + 15 cases; one QC140 G1 failure was the shell not loading in the harness, and it passed on a re-run).**

**One real fault found by L13 and fixed:** HR1-6 measured the address book **88px** below the hero stack, where the header rule says 44. The rule's own gap already supplies the 44, and the book's `margin-top: 44px` doubled it. The margin is now 0, and HR1-1, HR1-6 and HR1-7 are green.

| Suite | Case | What happened |
|---|---|---|
| QC140 | A1 | **Re-pointed**: no jump row. Unpinned, the bar holds three controls (Filters · Group by · Sort) and Find is the pill; pinned, five (Find, Filters, Group by, Sort, Exit) |
| QC140 | A2 jump labels · A3 fold · A4 jump | **Retired**: the jump row is gone in both modes |
| QC141 | L6 glyphs · L7 menu | **Retired**: their subjects were the jump row's glyph buttons and its "+N more" menu |
| QC142 | L1 title row | **Retired**: the title row is gone on both pages (NB1-L1/L2/L5 hold the new places) |
| QC142 | L2 toolbar | **Re-pointed**: 52 tall, Filters, Group by and Sort 34; Find (now the pill) and the jump buttons dropped |
| QC142 | L4 parity | **Re-pointed**: the count is the navy bar's ("87 queries" / "n of N queries"), the switch the bar's |
| QC142 | L6 not covered | **Re-pointed**: the half that pressed jump-row buttons is retired; the stuck heading sitting on the toolbar and the 24px to the first card stand |
| HR1 | content selector for /agents | **Re-pointed** from `[data-cl20='title-row']` to `[data-nb1='book']` |
| HR1 | HR1-8 "contacts pinned" case | **Retired**: it read the pinned list's head and toolbar (NB1-L11 is the book's full screen). HR1-8's reference was captured afresh from the base build for this run (the 12-hour rule) |
| CSS1 | L3 headings | **Retired**: QC List heading vs the Contact list's cream ledger; both gone |
| CSS1 | L6 one sort | **Re-pointed**: the chip in Cards orders List the same way (QC); the heading half and the Contact list half retired (headings are plain labels; the CL views are the book) |
| CSS1 | L7 chip placement | **Re-pointed**: Sort in both views, immediately after Group by (QC); the CL half retired |
| CSS1 | L8 jump row | **Retired**: the Contact list's jump row went with its toolbar (NB1-L9 holds sections) |
| CSS1 | L9 well | **Re-pointed**: QC's full-screen field is white; the Contact list's Find is the book's navy well (at rest a well, focused white). QC's unpinned Find is the white pill (NB1-L2) |
| Contact list v19, v19.1, v19.2, v20 | every case (51, named in `tests/e2e/RETIRED-navy-bar-address-book-v1.md`) | **Retired, files deleted**: Cards/List, the old toolbar, Group by, the strip, the rows and their cells, the drawer, the peek |

**Not run, named:** the Contact list suites v11–v18 and the other suites that open `/agents` through `cl16Lib` (`agentCardV1`, `feedDrawerV2`, `helpCentreV1`, `helpSystemV1`, `importTruth`, `qcV1386`). `LOADED_ROW16` now accepts the book's rows, so they open; any case of theirs that reads the retired rows will read red.

## Screens

`screens/` holds qc-01..05 and cl-01..06 at 1280 and 1512 (`nb1Shots.measure.ts`).

## Integration and dev

Dev had moved during the build: it served `index-wDx05B0j.js` from `dev/css1-pv3-ms27-ms28-ms281-ver1` (cdb00b2a, Versions v1, which sits on this pack's base). A build of cdb00b2a gave exactly that hash.

- Integration branch **`dev/ver1-nbab`** (a short name; the chained one exceeds GitHub's ref limit): cdb00b2a + this branch, merged clean at **df00b456**.
- Gates there: tsc 0, production build with no warnings, Vitest 650 files / 9,971 passed.
- Locks there, on its build: NB1 12/12; QC142, QC141, QC1411, QC140, QC1401, CSS1 and HR1 all pass (54 + HR1-8 after a fresh base capture from cdb00b2a's build).
- **Deployed to dev from the pushed tip, in a clean worktree: `index-Cp8ra_2G.js`** (the served hash was checked as `index-wDx05B0j.js` in the same command before deploying). NB1 against the deployed site: 12/12 locks, 13 passed.
- Not merged to main. Prod untouched; no rules or functions changed.
