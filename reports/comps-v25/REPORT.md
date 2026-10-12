# Comparable titles v25 — report

Branch `comps-v25`, from `origin/main` at `13313c9d`. Six commits, A to F, tip `af59397f`. Not merged.

| Part | Commit |
|---|---|
| A · data, rules, `inQuery` retired | `8fb0fe7d` |
| B · the shared strip, the comps cells, the list's logic | `4a5c02c8` |
| C · the how-it-works band | `db50539e` |
| D · the library heading and list | `2649de44` |
| E · the drawer, the picker, the Scout | `bba82b9b` |
| F · full screen, the page itself, the harness, the rulings | `af59397f` |

The page is one file that mounts every part, so it could not land five times. B to E add their components and logic (each builds on its own); the page that mounts them, its stylesheet and the harness land with F.

## 1. False premises

1. **Comps have no tags.** The mock's drawer shows tag chips; `CompTitle` has no tags field. Ruled: no new field. The drawer renders `matchAxis` split on "·" (trimmed, empties dropped) under "Matches on", and draws neither label nor chips when it is empty. The comp form already edits `matchAxis` as tags this way.
2. **There is no "comps drawing" in the repo.** The header's art did not exist. It was extracted from the reference (`public/images/comps/comps-header-disc.webp`, 520×470). The file is itself a disc, so it takes no white disc of its own, as the Query Centre's does not. The Scout's head (`scout-head.webp`) came from the reference too.
3. **No page can set the sidebar's collapsed state.** "Do not touch the shell beyond reading the sidebar's collapse state" and Part F's "the shell's sidebar collapses" cannot both hold: `setCollapsed` is never exposed, there is no context, store or event, and writing the localStorage key does not move the live shell. I added the smallest seam I could: `shell/sidebarForce.ts` (a page holds the sidebar collapsed and releases it) and three lines in `useSidebarCollapsed`. It never writes the writer's own choice, so nothing needs restoring on exit.
4. **`QcStrip` is not a shared part, and lifting it means editing the Query Centre.** Its cell is inline markup bound to Query Centre types. "Lift the strip's cell" and "do not touch the Query Centre" conflict. I built `shell/strip/GlanceStrip` beside it with the same values and did not rewire `QcStrip`. There are two implementations until the Query Centre adopts it.
5. **The Contact list has no full-screen list on main** (no "v16e"). Part F is built as a shared hook (`shell/useFullScreenList`) so the Contact list can adopt it.
6. **"Rows add up to the total" is false under Query letter grouping, in the mock too.** A comp two letters name is in both bands (The Tidewater Line is in v2 and v3). Lock D4 asserts that every comp is in a band (7 distinct of 7, 8 rows drawn) and that the other two groupings do add up.
7. **`compUsage(manuscript, versions, packages, queries)` cannot use the analytics `reached` derivation without the activity log.** `buildRows` takes activities. I added it as an optional fifth argument; without it "reached" falls back to the query's own fields and status.
8. **The spec's search widths do not land on its three lock viewports.** By the mock's own breakpoints (the sheet at 1300 and 1100) the search is 170 at 1024 and 1280, 220 at 1512, and 280 only from about 1560 of window (measured at 1920). Lock D2 asserts each width at the list width that produces it, and that all three were seen.
9. **`suggestComps.ts` does not read `inQuery`.** It names it once, in a comment. It is exempt from lock A4 as ruled, and is a leftover for when the Scout goes live.
10. **The spec's list of `inQuery` readers was short.** Beyond the five named: `comps.ts` (the write normaliser), `CompsEmpty.tsx` (the exhibit), `ComparableTitlesPage.tsx`, `v12/ManuscriptPage.tsx` (through `queryLine`), a comment in `compsMarketing.tsx`, a comment in `firestore.rules`, and three e2e files.

## 2. §0 findings

**Every `inQuery` reader, and what replaced it**

| Reader | Now |
|---|---|
| `lib/comps.ts` `normalizeComp` | No longer names it; keeps `id`. A stored value is dropped on the comp's next write. |
| `lib/compsPage.ts` `queryLine`, `compCounts`, `IN_QUERY_LABEL` | `queryLine` takes the letter's comps from its caller (`compsInLetter`). `compCounts` and the label are deleted. |
| `lib/manuscriptShelf.ts` `compRows` | Takes the current letter's `compIds`. |
| `lib/manuscriptSummary.ts` `compLetterTally` | Takes the current letter's `compIds`. |
| `lib/manuscriptV21.ts` `materialDoors` | Takes `letterCompIds`. |
| `v12/ManuscriptPage.tsx` | Passes `currentLetter(ms.id, versions)`'s `compIds`, and the letter's comps to `queryLine`. |
| `CompCard.tsx` | An `inLetter` prop. The card is now drawn only by the empty state's exhibit. |
| `CompsEmpty.tsx` | The sample's first two cards are marked in the letter by position. |
| `ComparableTitlesPage.tsx` | Rebuilt; reads `lib/compUsage`. |
| `firestore.rules` | A comment only. A stored `inQuery` is still accepted on a write (ruled). |
| `suggestComps.ts` | Untouched (ruled). A comment. |

**e2e fixtures and suites that named `inQuery`**

- **Rewritten to `compIds` on a Query Letter version:** `tests/e2e/ms21Fixture.mjs` (comps carry ids; "Query letter v3" records two), `tests/e2e/seedManuscriptsV21.mjs` (writes the letter's `compIds`), `tests/e2e/manuscriptsV21.measure.ts` (asserts the door from `doors.inLetter`).
- **Replaced, not rewritten:** `tests/e2e/seedCompsFixture.mjs` was the old comps-v2 suite's seeder. That suite measured a page that no longer exists, so the seeder went with it and `tests/e2e/seedCompsV25.mjs` is the new fixture (comp ids, three letters with `compIds`, queries resolving by all three routes).

**How queries resolve to letters on the harness account** (read-only, through the app's own `traceLetter`; `tests/e2e/compsV25Recon.mjs`, output in `recon-resolution.json`)

- 73 queries: **16 resolved, 57 unresolved, 0 ambiguous.**
- All 16 resolve by the package's letter now. None resolve by recorded versions or by a package edition, because no query on that account has `sentVersions` naming a letter. 0 of its 7 letters record comps.
- So the shared account cannot exercise two of the three routes. The v25 fixture seeds all three (5 by package, 5 by edition, 4 by versions) and the unit lock covers the ambiguous and no-letter cases.

**The current-letter rule.** The app had three definitions and none was "the active package's letter": the journeys' CURRENT (newest live version), the Manuscripts page's `letterInUse` (the most recently sent query's package letter), and `activePackageId` (which only decides which package a new query opens on). I chose **the newest Query Letter version that is not retired** (`currentLetter`). It is one of the two options the spec offered, it is what the query drawer already marks CURRENT, and it is what the mock's picker opens on.

**Rules.** `compIds` is allowed on a version (a list, at most 12) and named in the versions update allowlist; deployed to dev. The rules **cannot** enforce "a sent letter's comps are fixed": that needs a query over the user's queries, which rules cannot run. It is enforced by the client twice (the picker, and `updateVersion`).

**Full screen was not shared with the Contact list** (it has none on main). The hook and the sidebar hold are in `shell/` for it to adopt.

**Header branches.** Both `header-v3` and `header-panel-v2` are on main, as are `qc-v137`, `v135-header-desk` and `shell-v2`.

## 3. What retiring drag-to-reorder removes

- The grip on each card, the pointer drag with its drop markers and edge auto-scroll, and Alt+↑ / Alt+↓.
- **Any way to change the stored order on this page.** New comps are appended; the order can no longer be rearranged anywhere in the app.
- The reason the order mattered: it set the query line, which has also left the page. `queryLine` still composes in shelf order for the Manuscripts page.
- `withCompMoved` has no caller now. It is still unit-tested.

## 4. Decisions I made that you should check

1. **A comp a sent letter names cannot be removed.** The new design shows no Remove at all, which would have left no way to delete a comp. I put "Remove this comp from your shelf" in the drawer's edit form, with the existing Undo. For a comp in a sent letter it reads "It went out in a letter, so it stays on your shelf." and is disabled. A comp in an unsent letter can be removed; its id is left in that letter's `compIds` and ignored.
2. **Every query counts as sent.** A `Query` in this app is a sent query; undated imports sort first in the attachment bars.
3. **The Scout's button reads "Close", not "Tell me when it's ready".** Nothing records that wish for the Scout, so the mock's button would promise something the app does not do.
4. **The Manuscripts page can name two different letters.** Its comps door counts the current letter's comps; its "You're using {letter}" still comes from `letterInUse`. They differ when the newest letter has not been sent.
5. **`AppFooter` is on the page**, as the mock draws a footer and Part F hides one.
6. **The empty state no longer opens the add form by default.** The form lives in the drawer now.
7. **A narrow sheet (a 1024 window) and phones.** Below 900px of list the bar drops the chip counts, the "/" keycap and the word "Grouped:", and the row hides the agent discs. Below 600px a row is the comp and its next move. Neither is in the references.
8. **`normalizeComp` drops a stored `inQuery` on the comp's next write.** No migration write is made, but the flag does not survive an edit of that manuscript's comps.

## 5. Locks: red and green

**Consolidated green run.** Every rendered lock in one pass, on a dev bundle rebuilt from a clean tree at **`af59397f9e2b3234be60033dec8fcbfee84fc517`**, at 1512 × 900 and 1280 × 800 (D2 also at 1024 × 768 and 1920 × 1080): **13 locks, 199 readings, 199 green** (`run-consolidated.log`, `ledger/*.json`). The two unit locks ran at the same commit: 19 tests green. Full Vitest: 568 files, 8,612 passed, 3 skipped (baseline 564 / 8,572).

**Red.** Each lock went red against its named mutation (`mutation-proofs.json`, `mutation-runs/`). Seven mutations are applied in the page; six are edits to the source with a rebuild, restored from copies. L1 was also red naturally before the fix (`redfirst-L1.txt`). The mutation runs for B1, B2, A3, D3, D4, E2 and F1 were made before the rulings' edits; none of those edits touches what those locks read.

| Lock | Mutation | Red reading | Green reading (consolidated) |
|---|---|---|---|
| A1 ids | Regenerate ids on save | `cmp_cv25tide→cmp_4mgh316xkkhx …` | every stored id unchanged; the id-less comp given `cmp_esn6gi90p5yf`; remove and Undo brings back the same id |
| A2 usage (unit) | Count unrecorded letters as logged | `logged: 5, rate: 83` against `3, 50` | 14 tests green |
| A3 fixed | Allow edits on a fixed letter | `fixed false · 6 tickable · save true` | `fixed true · 0 tickable · save false`; New version: `Query letter v4` with the same two ids; v1 saved once, then fixed |
| A4 inQuery (unit) | Read `inQuery` in `manuscriptShelf` | 3 of 4 cases red | 5 tests green; exempt set is `types.ts` and `suggestComps.ts` |
| B1 header | Restore the number panel | `number · rgb(45, 58, 80)` (6 red) | title panel, "Every comp, and where it went", no number, drawing 196 at both sizes |
| B2 strip | Scroll on press | `scrollTop 0 → 300` | figures `7 · 64% · 9 · 4`; 14 bars, 9 logged; press filters, `scrollTop 0 → 0` |
| C1 band | Confine the band to the column | sheet edge `242,238,232` against `251,249,245` | band colour at both sheet edges and in the column; three steps at y 302 |
| D1 heading | Leave the heading on the column | `heading 296 · list 272` | `272 · 272` and `1480 · 1480` (1512); `272 · 272` and `1248 · 1248` (1280) |
| D2 bar | Search `flex: 1` | `search 222.4 at a list 720 wide` | bar 64 tall, no overflow at 1024 / 1280 / 1512 / 1920; search 170 / 170 / 220 / 280 |
| D3 sort | Sort ascending first | first click `0,0,0,0,0,9,9`, `aria-sort` ascending | `9,9,0,0,0,0,0` descending, then ascending, then the stored order with `aria-sort` none |
| D4 groups | Default to Where it's used | `3 bands · 7 rows` at rest | 0 bands at rest; Query letter: v2 (2), v3 (2), Not in a letter (4) |
| E1 drawer | Expand the row inline | `1 non-row child among 8` | inset 8 / 8 / 8, radius 12, 9 queries equal to the usage, Escape closes |
| E2 picker | Write to every letter | v1 written `["cmp_cv25tide","cmp_cv25last","cmp_cv25nine"]` | only v3 changed; Undo restores `["cmp_cv25tide","cmp_cv25last"]` exactly |
| F1 full | Leave the sidebar expanded | `sb-shut false · 248 wide` | sidebar 68 wide, list 12 from each sheet edge, Escape restores scroll `1153 → 1153` and `1199 → 1199` |
| L1 no jump | Drop the strip's figure boxes while loading | strip `90.7 → 255.0` tall | panel, strip and heading equal: strip `255.0 → 255.0`, `275.3 → 275.3` |

## 6. Retired and rewritten locks, by name

Full table in `tests/e2e/RETIRED-comps-v25.md`. In short:

- **Deleted:** `compsMat.measure.ts` (S1–S7, C1–C10), `compsMatLib.ts`, `seedCompsFixture.mjs`.
- **Rewritten:** S2 → CV25 B1; S6 reversed into B1 (the header has a drawing); C4 → A1.
- **Retired with what they measured:** S3 and S4 (the rail), C1 (the query line), C2 (drag-to-reorder).
- **Now unit-only:** C3, C5, C9, C10.
- **Uncovered on the rendered page:** C6 (no appraisal word), C7 (the empty state), C8 (focus return after Escape).
- **Registers:** `headerV3` (`NUMBER` → `TITLE`), `plateRoutes` (`OWN_HEADER_ROUTES`), `livingHeadersV3` (the comps row left).
- **Unit tests rewritten for the retirement:** `comps.test.ts`, `compsPage.test.ts`, `manuscriptShelf.test.ts`, `manuscriptSummary.test.ts`, `manuscriptV21.test.ts`, `manuscriptFeed.test.ts`, `compsV2.test.tsx`, `materialsPageSmoke.test.tsx`, `suggestComps.test.ts`.

## 7. Not done, and not verified

- **Other suites that name the route were not re-run:** `headerV3` H1–H8 for the route as a TITLE page, `headerPanelV2` (including its 390px as-built width), `pageHeaderV2`, `manuscriptsV21` (its fixture changed), `illustratedMasthead` (still lists the route as having no art). I changed their registers and did not measure them.
- **The empty state and the no-manuscript state were not looked at in a browser.** Smoke tests only.
- **The phone layout was not measured or screenshotted.**
- **The list's bar does not pin on scroll**, as v137's does. The spec did not ask for it.
- **Dead but still tested:** `CompsScoutRail.tsx` (mounted nowhere now), `compsHeaderCopy`, `withCompMoved`. The rail's rules in `compsV2.css` have no renderer.
- **The grouped tag is cut with an ellipsis at 1512** ("… · IN YOUR OWN ORDER · G…") beside the two pills.
- **Per-commit gates:** the full gates ran on the tree at A and at F. B to E were not gated one by one; each adds files that only later commits import.
- **Prod rules** are untouched and are Nick's.

## 8. Shots

In `reports/comps-v25/shots/`, each beside its reference in `design-refs/comps-v25/`:

| Reference | Shot |
|---|---|
| `ref-top-1512@2x.png` | `top-1512.png` |
| `ref-top-1280@2x.png` | `top-1280.png` |
| `ref-list-1512@2x.png` | `list-1512.png` |
| `ref-list-1280@2x.png` | `list-1280.png` |
| `ref-drawer-1512@2x.png` | `drawer-1512.png` |
| `ref-drawer-1280@2x.png` | `drawer-1280.png` |
| `ref-grouped-1512@2x.png` | `grouped-1512.png` |
| `ref-picker-1512@2x.png` | `picker-1512.png` |
| `ref-full-1512@2x.png` | `full-1512.png` |
| `ref-full-1280@2x.png` | `full-1280.png` |

Plus the page at 1920 × 1080 (`top-1920.png`, `how-1920.png`, `list-1920.png`) and 1024 × 768 (`top-1024.png`, `how-1024.png`, `list-1024.png`), and the band at each size (`how-*.png`).

Differences from the references that are the data's, not the build's: the attachment bars are ordered by send date, so one logged bar sits among the unlogged ones (the mock orders them by letter); package names appear in the order the account stores them.
