# Onboarding v5, part 3: the Import page

Branch `onb-v5-import-page`, based on `origin/import-fixes`. Five commits: groundwork and Phases 1–4. Nothing is merged to `main`. Prod is untouched.

## 1. False premises and deviations (read first)

1. **"The four re-pointed e2e pass."** Two of them could not pass before this pack. `importDrive` and `importUnmatched` each ended by reading `.qc-wpg .f12-row` (and `.qc-needbar`): the three-column Query Centre pane, unreachable since the Query Centre became a list. Those halves are retired with the reason. `importNoPackage` never opens `/import`; it is unchanged. The three that drive the matcher are re-pointed and pass.
2. **The footnote's second sentence is not shipped.** "An agent already on your contact list isn't added again." is not true of all three tiles. Smart import and the template match an agent on name and agency, so the same agent typed with a different or missing agency is added again. The matcher matches on name alone.
3. **The decision note is one clause shorter than the Words table.** "…and it will keep showing them until each one has what it needs" described a banner the Query Centre no longer draws. Measured: four imported, four listed, nothing marks them.
4. **The old linking note was already false.** It promised to create missing agents and manuscripts automatically. The importer has not done that for some time; it lists the row and offers "Create from this row". The new note says that.
5. **The lab cannot show the real sidebar.** `#/onb-lab` is signed out, and the app's shell needs an account. The lab shows the page and the flow without the shell. Lock F1 (the flow in the app's sheet, real sidebar present) is measured on the real route, signed in.
6. **The drawer's four words are not constants.** They are inline in `DrawerShell.tsx`. The page states them once and a lock reads the drawer's source for each.
7. **The reference draws only "Import a spreadsheet" solid.** The other tile buttons are outlined, and the build follows that. The reference's third tile and footnote carry older wording; the Words table wins.
8. **A finished run could read "67%".** The matcher's progress was only advanced by rows that reached the end of the loop. A finished run now reads 100%. The run itself is untouched.
9. **The header locks that hold other pages "out of scope" are red before this pack.** `headerPanelV2` P2 and `headerV3` H11 fail on `/dashboard`, `/account`, `/help` and `/plans` by exactly 41.8px, the beta strip's height. `/import` has left both lists; the remaining reds are not this branch's.
10. **Ten probe rows from 20 September are still on the harness account.** Older runs of the matcher suites failed before their clean-up. This pack's clean-ups are in `finally`. A mutated run of mine left four rows; I removed those four and the counts match the snapshot (83 queries, 37 agents, 5 manuscripts, 406 feed rows).
11. **Phase 2's commit carries lock F1**, which is Phase 3's. It was the quickest way to see the flow in the sheet.
12. **D3 drives two ways in**, the address and the search palette. The other links all navigate to the same path; they were read, not driven.

## 2. Gates

| | Baseline | Now |
|---|---|---|
| `tsc --noEmit` | 0 | 0 |
| `build:dev` | 0 | 0 |
| production build | 0 | 0 |
| Vitest | 553 files, 8,467 passed, 3 skipped | 555 files, 8,479 passed, 3 skipped |
| IP1 (`onbV5ImportPage.measure.ts`) | — | 21 passed |
| The three matcher suites | red (old labels, retired pane) | 3 passed |
| Parts 1 and 2's rendered locks | 104 passed | 104 passed |
| The set-up import walk | 3 passed | 3 passed |

## 3. §0 Recon

1. **Base.** `origin/import-fixes` (it exists and is not in `origin/main`).
2. **`BranchB` after part 2.** Set-up alone: `book`, and the fork (`pipeline`). The import: `confirm`, `blocked`, `reading`, `overview`, `review`, `importing`, `done`, `fallback` and the unhandled state.
3. **What the import needs from its host.** The manuscript's title; `onEnsureManuscript`; the host's own error; "add by hand"; what "Back" from the first screen means; what happens at the end; and, for the app, a Cancel. These are `ImportFlowProps`. The user, the agents, `addAgent`, `addQuery` and the entitlement come from the same hooks in both homes.
4. **Ways into `/import`.** Account settings' button; the Contact list's and the Query Centre's empty-state links; the account menu's row; the search palette's "Import" page; the top nav's "Smart import" entry; set-up's "match them up yourself" (lands after set-up). All navigate to the path and now land on the tiles.
5. **The page's header.** It was the compact header with a header sheet. `PanelHeader kind="title"` with no buttons and no drawing is about 152px tall (padding 28/32/34/36, title 50, sub 18). The reference's panel is 174, so a `slim` modifier was added; every rule names it. Locks that named `/import` as a sheet route: `headerSheet.test.ts`, `hp2Lib.ts` and `headerV3.measure.ts` (each with a fixture). `sh2Lib.ts` derives its lists from the register.
6. **The active manuscript.** `localStorage["scriptally_active_manuscript_id"]`, else the first manuscript. With none, the page opens the book step.
7. **The matcher.** Three steps; four kinds; `.csv` only; a dropped file was not handled (it is now). Its "grids" tab listed the account's agents, manuscripts, queries and feed rows in a searchable table. Six log strings and eight error strings; all are in §7.2.
8. **An agent that already exists.** Smart import and the template: matched on name and agency, merged, not added. The matcher: matched on name alone, row skipped. So the footnote's second sentence is true of none of the three in every case (see §1.2).
9. **How the matcher links a query row.** By the manuscript's title and the agent's name, against what is already here. A row matching neither is still imported, with those links empty, and listed under "Rows that need a decision". Nothing is created automatically; "Create from this row" creates from the title and the name alone.
10. **A second import of the same sheet.** From the code, not measured: neither path looks for a query that already exists, so every query is added again. Agents are merged (or skipped by the matcher). The summary reads the same as the first time; afterwards the Query Centre holds each query twice. Not fixed here.
11. **The e2e that drive the page.** `importDrive` (an imported query has no package), `importEmptyFields` (no word is written that the file did not supply), `importUnmatched` (every row lands or is counted; unmatched rows are listed), `importNoPackage` (reads `/queries` only).

No stop condition was met.

## 4. What was deleted

| Phase | Commit | Deleted |
|---|---|---|
| 1 | `09e8049d` | The import's state, handlers and screens from `BranchB` (moved to `ImportFlow`). |
| 2 | `9e2f7503` | `/import`'s old page as the route's component; its width kind on the route slot; its entries in two "out of scope" fixtures. |
| 3 | `31fb2f4e` | The book step's inline copy in `BranchB` (now `BookStep`, mounted by both hosts). |
| 4 | `f1c20467` | The grids tab and viewer, `loadDemoCsv` and its button, the old paragraph, the page's `PageHeader`, the Tailwind colour classes. 752 lines out, 224 in. |

Survived with a reader: `ImportCsv.tsx` itself (the matcher, behind the third tile).

## 5. Locks retired or rewritten

- Twelve source locks that read `BranchB.tsx` for moved behaviour now read `ImportFlow.tsx`; where the behaviour spans both files, both halves are asserted (`captureFork.test`, `deadEnds.test`, `importLoaders.test`, `importLabels.test`, `smartImportConfirm.test`).
- `headerSheet.test`: `/import` is a panel route. `contentColumn.test`: no capped route slot remains.
- `hp2Lib` and `headerV3` "out of scope": `/import` left the list; IP1 D1 holds the page now.
- `materialsPageSmoke.test`: `/import` renders the Import page; the matcher has its own smoke.
- `importDrive`, `importEmptyFields`, `importUnmatched`: one way in (`matcherDrive.ts`), the same rules, clean-up in `finally`.

## 6. Locks: red and green

| Lock | Green | Red, by its mutation |
|---|---|---|
| P1 | 20 screens equal the pre-move capture at 1440 and 390 | 2 red |
| P2 | both hosts mount `ImportFlow`; neither keeps a copy | 1 red |
| D1 | one navy panel, three tiles, footnote; 174 tall at 1440; three widths | 3 red |
| D2 | four entitlement states; each button's own handler | 2 red |
| D3 | the address and the palette land on the tiles | 1 red |
| F1 | the flow in the sheet, real sidebar, no set-up frame | 1 red |
| F2 | no manuscript: the book step; nothing written | 1 red |
| F3 | Cancel asks on four screens with the drawer's words; Discard writes nothing | 1 red |
| F4 | ends on the dashboard; notice saved for one skipped row, none for zero | 1 red |
| M1 | the three matcher suites | 1 red |
| M2 | 12 screens, 12 distinct run lines, no developer word | 1 red |
| M3 | no grids tab, no demo button, four radios, the log's 280 | 1 red |
| W1 | the page's and the matcher's words | 1 red |
| T1 | the page's and the matcher's tokens resolve | 2 red |

## 7. For Nick

### 7.1 The Words table as it reads

Every row reads as the table says, except these three:

| Where | Table | On screen |
|---|---|---|
| Footnote | two sentences | An import adds to what you already have. |
| Rows that need a decision | …They are on your query list, and it will keep showing them until each one has what it needs. | Every row above was imported. You can close this. They are on your query list. |
| Tile 1 fact, Pro, no date on the entitlement | Available {date} | Available next month |

### 7.2 Every matcher line, with the line it replaced

| Was | Now |
|---|---|
| Agent info "{name}" already present in repository. Skipping duplicate row. | {name} is already on your contact list. Row not imported. |
| Manuscript "{title}" already present in catalog. Skipping duplicate row. | "{title}" is already in your manuscripts. Row not imported. |
| Successfully added Agent: "{name}" ({agency}) | Added agent: {name}, {agency} |
| Successfully added Manuscript: "{title}" ({genre}) | Added manuscript: "{title}" |
| Linked query logged: Manuscript "{t}" sent to Agent "{a}" (Status: {s}) | Added query: "{t}" to {a}, {s} |
| Successfully added Activity event: "{d}" | Added to a query's history: {d} |
| Row N skipped: 'name' field is missing. | Row N has no name. Row not imported. |
| Row N skipped: 'title' header is missing. | Row N has no title. Row not imported. |
| Row N skipped: Both Manuscript title and Agent name are required. | Row N needs both a manuscript title and an agent name. Row not imported. |
| Agent line {name} fail: {reason, or "limit cap hit"} | Couldn't add agent {name}. {reason, when there is one} |
| Manuscript "{title}" fail: {reason, or "limit cap hit"} | Couldn't add manuscript "{title}". {reason} |
| Query match row N failed to record: {reason, or "Tier limits exceeded."} | Couldn't add the query in row N. {reason} |
| Activity row fail: {reason, or "System error"} | Couldn't add the event to a query's history. {reason} |
| General error parsing row N: {message} | Row N couldn't be read: {message} |
| Activity row N: no query matches this manuscript and agent… | unchanged |
| (alert) Please upload a CSV file or paste spreadsheet tabular data first. | Choose a file or paste the rows first. (on the card) |
| (alert) Tabular data must contain at least a header row and one data row. | The file needs a row of headings and at least one row beneath it. (on the card) |

The three fallbacks ("limit cap hit", "Tier limits exceeded.", "System error") named a cause the code did not know. They are gone; the line states the reason only when there is one.

Kept as built, not in the table: "Quick Row Mapping Sample of parsed table ({n} total rows)", "Matched to: "{column}"", "Expected header example: …", the field names "Reference Manuscript Title" and "Target Agent Name".

### 7.3 A second import of the same sheet

Every query is added again. Agents are not (merged or skipped). The summary gives no warning. See §3.10.

### 7.4 Things to look at

- Shots: `shots/` (the page at three widths, the four entitlement states, the flow in the sheet, the book step, the cancel confirm, every matcher step for each kind at 1440 and 390). `pairs/` sets the page beside its reference at 1440 and 390.
- The matcher's 390 shots show one screen's height, not the whole page.
- In the app the importing loader's card sits over the dashboard's ghost, in the sheet; there is no sidebar hand-off.

## 8. Deploy

Recorded in `DEPLOY.md` beside this file.
