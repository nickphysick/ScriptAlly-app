# Submission packages v2 — run report (27 Sep, LIGHT PROFILE)

Ref: `design-refs/materials/packages-v2.html` (hashes re-verified against SHA256SUMS.txt before start — all match).
Prompt: `cc-prompt-packages-v2.md` with Nick's reductions (three commits; S1–S7 once; mutations only on P1, P4, P5, P6).

## False premises

1. **The version modal's word-count field.** The mock draws one; `BookVersion` has no word count, so the field would take a number and store it nowhere. The modal asks for Name + "What changed" (→ `note`) only.
2. **`?tab=tracking` "scrolls Side by side to the top".** With the fixture, Side by side sits near the page's end, and the scroller cannot bring it to the top. The page scrolls it into view as far as the scroller goes. P7 asserts "at the top, OR at max scroll with it in view".
3. **"Drag a chip onto a well" as `dragTo`.** The rail is taller than the window at rest (by design), so `dragTo` scrolls every ancestor to reach a low chip and lifts the composer off the top. The harness arranges both ends on screen and asserts that first.
4. **The mock's chips are `<button draggable>`.** Chromium never starts a native drag on a button (measured: no `dragstart` fires). The chips are `div role="button"` with Enter/Space handling.
5. **The mock's empty state shows `+ New package` as the prompt draws it.** The mock (which wins) renders no header actions in the empty state, and the composer is already open. None is rendered.

## Commits (all on `main`, pushed)

| # | Commit | What |
|---|---|---|
| 1 | `c7cfa417` | Plan gate removed behind `PACKAGES_OPEN_TO_ALL`; harness (`pkgMat` + seeder), red against `5d2a46e8` |
| 2 | `b82a2d6f` | The page: full header, composer, cards, Side by side, Retired, Materials rail, empty state; `.pkgw-wpg` chrome-art rule removed |
| 3 | *(this commit)* | Enrolment (OPTED_OUT 4 → 5, FULL_PAGES, WITH_ART, mastheadMatrix `full`, pageHeaderV2 §2/§4.4); 18 unreachable components + 8 stylesheets deleted; 25 rendered suites retired; report |

## Pass counts (rendered, `vite preview` of `build:dev` in a measurement worktree)

- **S1–S7 once (1440, expanded, filled): 47/47.**
- **P1–P9 at 1440, filled and empty: 47/47** (P1 4, P2 8, P3 2, P4 6, P5 4, P6 5, P7 3, P8 5, P9 5).
- **P2 and P8 at 1280: 13/13.**
- **Total: 102 rows, 0 failed.** The ledgers are in this folder.
- **pageHeaderV2** (§2 packages at both sizes, §4.4 with packages) passed as part of 21/23.

**Mutations** (worktree, each restored from a path-named backup and the restore verified by `cmp`):

| Mutation | Result |
|---|---|
| P1 · `PACKAGES_OPEN_TO_ALL = false` | red: create refused; `.msv12-pro` back on /manuscripts |
| P4 · Edit offered on sent packages | red: `["edit","dup","retire","note"]` |
| P5 · two active tags | red: `["Autumn round","Agents with MSWL"]` |
| P6 · bold the row with most requests | red: two row styles |

**Red before (commit 1, against `5d2a46e8`):**
- S1–S7, P1, P4, P5 and P6 were all red.
- P1's Manuscripts-page row was a real red: one `.msv12-pro`.

## Two reds that are not this page's (pre-existing, reported, not fixed)

`illustratedMasthead §3.1` ("art box is 442 of 950") and `mastheadMatrix §3.3` ("header is 384, the column starts at 294") fail on **`/queries`**, their first row. That masked every row behind it.

- Scoped copies run only on `/manuscripts/packages` produce **identical numbers**. The page's full header measures exactly like the Query Centre's.
- These assertions are stale for the full header as page header v2 drew it.
- No QC or G4 file was touched (S7 row).
- **Owner: the next shell/masthead census pass.**

## Gates at each commit

- tsc clean.
- `build:dev` clean (grep for error/[WARNING] empty).
- Full Vitest green: 8,266 tests at commit 2, 8,179 at commit 3 after the retirements.

## Deferred, with owners

- **Stale census rows** (`pkgw-wpg`) in ten masthead-era suites, plus `drawerTab` and `allSessions`. Listed in `tests/e2e/RETIRED-packages-v2.md`. **Owner: the next census pass (Nick to schedule).**
- **Unreachable libraries and stylesheets:**
  - libs: `builderRail`, `packageTracking`, `ledgerSort`, `packagesOverview`;
  - stylesheets: `packagesBroadsheet.css`, `packageWorkshop.css`, `buildPanel.css`, `illustratedMasthead.css`.

  Each is still read by source-reading tests. **Owner: the next packages pass.**
- **The Put away route has no rendered lock.** It is unit-locked only, because the fixture has nothing put away. **Owner: the next packages pass.**
- **"Log a query with this package".** The query-actions session exports `openQueryDrawer({ mode: 'log', packageId })`; wiring a button to it is for a later pass. **Owner: Nick.**
- **The duplicate comps tray art** (from the comps run). **Owner: as reported then.**
