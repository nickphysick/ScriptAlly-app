# List filters v1 — report

Branch `list-filters-v1` (cut from `consistency-fixes-v1-1` @ `73e86a278`), pushed. Dev serves it as
`index-J5yUU39m.js` from `dev/cf11-qc1611-lf1` @ `9356837a0` (= `dev/cf11-qc1611` @ `349069afe` + this branch).
NOT merged to `main`. Prod untouched.

Commits: Phase 1 `f8aab7a74` · Phase 2 `fbb99d649` · Phase 3 `b5f108d7f` · Phase 4 `3aa820c71` · Phase 5 `64aaf5f44` ·
Phase 6 `a486d324e` · Phase 7 `dea70faf0` · this report (next commit).

## 1. False premises

1. **Dev had moved twice.** At start dev served `index-CA74s48S.js` from `consistency-fixes-v1-1` @ `73e86a278` (which
   contains `dev/tct1-sv1-qc161` @ `003562e4`), so the branch was cut from there. By deploy time dev served
   `index-T_4oCLGT.js`; a clean build of `dev/cf11-qc1611` @ `349069afe` reproduced that hash exactly, so the deploy
   branch stacks on it (`consistency-fixes-v1-1` + `query-card-v161-1`; clean merge).
2. **The Queries list has no column headings and no applied row.** Its List view is v154's card grid. `QcPage151`'s
   `labels()` and `row()` (the headings) and `pill`/`pillRow` (the `qc1511-fp` row) were defined and never called.
   So on Queries: no heading to carry an arrow, "the Agent heading sorts too" has nothing to attach to, and LF8 there
   proves the menu, the button and the order instead of `aria-sort`. The applied row had no "existing position"; it now
   sits under the bar. The dead pill row was deleted with its replacement; `labels()`/`row()` (the list, out of scope)
   and the never-rendered filter-panel state (`panelOpen`, `filterPanel` prop) are left and listed here.
3. **`QC_SORT_FIELDS` is not the list's sort.** It is keyed by `Qc138SortKey` and read only by `QcToolbar140` (not
   mounted on the desktop page) and a phrase in `Queries.tsx`. The list reads `Sort151` (`QcBar153` → `RadioMenu151`'s
   four fixed sorts). Phase 4 adds `QC_LIST_SORT_FIELDS` over `Sort151`; `QC_SORT_FIELDS` is untouched.
4. **"No grouping" could not survive a reload**: `savedGroupOf` mapped `none` to Action. Changed (LF9 requires it).
5. **The seed cannot exercise two things**: no agent's door is "not known" (49 open, 4 closed), so the "{n} not known"
   link never shows and LF6 cannot press it; and the seed carries only four genres, so "+{n} more" and the "Find a
   genre" field never appear (screen 10 shows the four). Both are covered by unit tests only.
6. **CLAUDE.md.** The pack asks for a "List filters v1" section in CLAUDE.md. This branch's CLAUDE.md is the old 955 KB
   log; main's rulebook (the one in force) says page decisions go in `docs/decisions/` and CLAUDE.md holds only rules for
   every session. The section is `docs/decisions/list-filters.md` (current state, the colour rule, the locks). Main's
   CLAUDE.md page index needs one pointer line to it when this merges.

## 2. Step 0

| | |
|---|---|
| Reference | `design-refs/list-filters-v1/list-filters-v1.html` SHA256 `a00f2a92…33eb` — matches |
| Pieces | all present: `shell/ViewsPanel.tsx`, `queries/centre/QcViews156.tsx`, `agents/contact/ContactViews.tsx`, `QcBar153.tsx`, `ContactBar.tsx`, `shell/ListBar.tsx`, `shell/SortChip.tsx`, `lib/cardsSort.ts`, `lib/qc1522.ts` `GROUP_1522`, `lib/contactV26.ts` `GROUP26_OPTIONS`, `lib/stageColours.ts`, `lib/qc138.ts`, `lib/contactList.ts`, `lib/contactV27.ts`; applied rows: `qc1511-fp` (dead, see 1.2) and `ContactSheet26` `cl26-ap` |
| ViewsPanel consumers | exactly two (QcViews156, ContactViews) — no red gate |
| Locks on today's markup | unit: `qcViews156.test.tsx`, `contactQcLayout.test.tsx`, `agentsPageSmoke.test.tsx`, `qcBar153.test.tsx`, `qcSticky154.test.tsx`, `qc156.test.ts`, `contactV27.test.ts`, `qcFoot1522.test.ts`; e2e: `qc156` V5/V6, `clq1` L4/L5, `clq11` T1 |
| The list's sort | `Sort151` (see 1.3) |
| Quick-pick title readers | `lib/qc156` VIEWS_156 (retired), `QcFilterMenu140` (not mounted on desktop), `appliedChips` (now reads the title). `PICKS26` reads lib/contactList's own list (unchanged). Literal "Overdue" elsewhere does not read QUICK_PICKS and is unchanged: Dashboard.tsx:1641, QcWorkspace.tsx:162, qcCalView, queriesPhone, trayCalendar, qc150, qcBirdsEye, qcBirdsDrawer, the to-do libs |
| Seed counts | agents with door not known **0**; queries Withdrawn **1**; packages on `seed-ms-1` **4** (13 rounds/packages appear in What you sent) |
| Panel scrolling | never inside itself; taller than the scroll area − 14px − `--pin-cover` it gets `data-qc154-tall` and scrolls with the page (useTallRail) |
| Baseline | tsc 0 errors; build clean; Vitest 12,925 passed / 2 failed (`firestoreTarget.test.ts`, 23 `tests/e2e/*.mjs` scripts — pre-existing) |

No red gate fired. Every baked decision fits `Qc138Filters` / `ContactFilters` / `Sets` as they stand.

## 3. What each phase changed, and what retired

- **Phase 1** — `shell/FilterPanel` (+ `filterPanel.css`): the card (navy head "Filter", "{n} on", Clear all; sections;
  typewriter foot, `aria-live`), and the parts `FilterTile` (+ wide), `FilterTiles`, `FilterPills`, `FilterSplit`,
  `FilterSwitch`, `FilterFold`, `FilterSection`. Keeps `qc153-rail` (column, 268, sticky, pin); loading and day one as before.
- **Phase 2** — Queries: four tiles; Stage = `shell/StageFilter` bar + five labels on `lib/stageColours` bands, a label
  toggling `STAGE_STATUSES[stage]`; What you sent pills (8, then "+n more"); a Dates fold. `QUICK_PICKS` "Overdue" →
  "Past their reply date" (line "Time for a nudge"), applied chip likewise; a whole stage is one chip. `railCounts` +
  `stage`. **Retired:** the five view rows, Refine's eight Status ticks, More filters, `lib/qc156`'s Views model.
- **Phase 3** — Agents: Ready to query (wide), Always reply, Missing details; two splits; "{n} not known"; genres (book's
  first with a tick, six, "+n more" with Find and "Show fewer"). `contactV27`: counts for ready/always/missing/queried/
  door, `toggleReady`, `appliedChoices` (Ready is one chip). **Retired:** `shell/ViewsPanel.tsx`, qcv156.css §6, the
  powder "your book" tag, Your move / Waiting to hear back on this panel (still in lib/).
- **Phase 4** — `SortChip` labelled form + `natural`; Queries sorts over `Sort151` (`QC_LIST_SORT_FIELDS`); labelled
  Group with "No grouping" after a hairline on both pages; Export in `ListBar`; `fitBar` folds "Sort:"/"Group:" then
  Export's word; Agents headings show the arrow only when sorted (↕ on hover/focus). **Retired:** `BAR_SORTS`,
  `barSortOf`, RadioMenu151's four fixed sorts on the List view.
- **Phase 5** — `shell/AppliedRow`: "Filtered by", one chip per choice, stage chips on their band, "Clear all"; on
  Queries under the bar, on Agents in `cl26-ap`'s place. **Retired:** `cl26-ap` CSS, QcPage151's pill row and helpers,
  `clearAll1511`; "Reset filters", "Clear filters", "Clear the filters" on these two pages.
- **Phase 6** — counts run over 260ms (not first paint), bars and splits ease `flex-grow` 350ms, hover lifts, tile press,
  fold caret 180ms, chip pop 200ms; all inside `prefers-reduced-motion: no-preference`.
- **Phase 7** — `tests/e2e/lf1.measure.ts`, screens, `docs/decisions/list-filters.md`; split and Sort-menu fixes found
  by measuring.

## 4. The locks — red, then green

Red proofs ran in two builds so each red belongs to its own mutation: **A** = every mutation except LF6's; **B** = LF6's
alone (LF5's mutation also reddens LF6, so they could not share a build). Green = final run on the committed CSS:
**7 tests passed, 333 checks, 0 red** at 1280, 1440 and 1717.

| Lock | Mutation | Red reading | Green reading |
|---|---|---|---|
| LF1 | old panel mounted on /agents | no Views panel anywhere — 1 | one Filter panel; head rgb(42, 58, 82), "Filter" |
| LF2 | Your move tile on Agents | a control named Your move — 1 | Queries: Stage, 0 splits; Agents: 2 splits, no Stage, no chase picks |
| LF3 | Full's segment hard-coded #b7c9df | seg full rgb(183, 201, 223) | every label and segment = its band; Offer under its sheen |
| LF4 | powder on the book key / ticks | rgb(227, 232, 239) found | 164 elements (Queries), no powder; Agents no band/tint either |
| LF5 | label toggles first status only | list 6 vs label 14 | Partial: only its statuses, 14 = 14, one "Partial" chip on its band; again → 88 |
| LF6 | labels show the unfaceted total (B) | Partial 14 vs 88, Queried 38 vs 88 … | every off, non-zero tile, label, pill, switch, side, genre = the list |
| LF7 | two chips for Ready | "Open to submissions", "Not queried yet" | both sides on; one "Ready to query" chip; removing it clears both |
| LF8 | Sort buttons fixed | button "Next due · Soonest first" after choosing Agent | menu sets the button (and Agents' aria-sort); a heading sets the button; the switch flips the rows |
| LF9 | savedGroupOf drops "none" | after reload: 4 headings, "Action" | no heading, one section, "None"; a reload keeps it |
| LF10 | Export every row | 88 rows vs 9 shown | 9 = 9 (Queries), 39 = 39 (Agents); no export in either panel |
| LF11 | labels fixed at 150px | 113px overflow | 1280, sidebar rail 80px: one line, tops ±0, 0px overflow (Queries folds to "short") |
| LF12 | "Reset" in the head | ["Reset"] | rest, filtered, nothing-matches: no Reset/Clear filters; "Clear all" in head and row |
| LF13 | media query and tween guard dropped | counts mid-tween one frame after a press | every count and width final within one frame |
| LF14 | n/a | — | see below |

**LF14 (no regression).** Re-ran `qc156.measure.ts` and `clq11.measure.ts` on the branch build. Queries pin/sticky
(qc156 V4: the bar under the lip at 305/1400/2600, toolbar meeting it ±1, reduced motion) — green. Contact list pinned
state (clq11 T2–T4b) — green; T1 (type parity, repointed to the Filter panel's roles) — green.
Red and **not** from this pack: qc156 V3 (the header's "this week" line and streak words) and V4's one Contact-list
check (expects the slim row at 48px; Contact list v1.1 made it 60px, which clq11 T2 asserts and passes) — stale
expectations from later passes, not re-run on the base. clq11 T5 (the Query Centre identical to a base build) is red by
design: the panel changed.
**Retired locks:** qc156 V5 (Views panel → lf1 LF1–LF10); clq1 L4/L5 (views and refine, kept behind
`LIST_FILTERS_V1`, not run); `qcViews156.test.tsx` and contactQcLayout's Views block (rewritten for the new panel).

## 5. Where the app could not do what the reference asked, as stated

- **Splits wrap.** With the app's serif, "open to queries" + "closed for now" need ~243px and the panel gives 240. The
  words wrap, and that split grows past 56px only then (the reference's screens used a narrower fallback face).
- **Agents tiles are checkboxes, not radios** — Always reply and Missing details are independent by decision 7.
- **Focus ring on the navy head is cream**, not navy (a navy ring is invisible there).
- **Queries' applied row** is its own rounded strip under the bar (no list card to sit in) rather than a band with a rule.
- **Copy plurals**: "1 needs you", "All 1 query" — the prompt's sentences pluralised for 1.
- **genreMode**: the panel writes "any" (as `toggleGenre` always has); "all" can only arrive from older state; no control
  added; still honoured by the predicate.
- **A menu closes on any scroll** (`usePopover`, existing): opening Sort or Group while the list is mid-scroll can close
  it at once. Not changed; noted because the harness had to open menus from the top.
- Other "Clear filters" left alone, outside these two desktop pages: an older `f12` list branch in Queries.tsx
  (its own test pins the words), `ContactFilters24` (not mounted), the To-do tray.

## 6. Screens (1440 wide; 1500 tall so the whole panel is in frame)

`01-queries-rest` · `02-queries-two-stages` · `03-queries-pick-and-dates` · `04-queries-sort-menu` ·
`05-queries-group-menu` · `06-queries-no-grouping` · `07-agents-rest` · `08-agents-pick-and-genre` ·
`09-agents-splits` · `10-agents-all-genres` (the seed's four; no "+n more") · `11-agents-nothing-matches`.

## 7. For Nick

- **"{n} not known" under "Are they open?"** — the seed has no such agent, so I could not see it earn its place. It
  costs nothing when n is 0 (it isn't drawn). My view: keep it; a writer with stale imports will have dozens.
- **A part-set stage** — the seed produced none (no link sets one). Unit-tested: the label reads on, pressing it clears
  every status of the stage, and the applied row names the statuses singly ("Full sent").
- **"Overdue" → "Past their reply date"** on: the Queries quick tile and its applied chip. Nowhere else read that title
  (the old Views panel is gone; the Filters menu that also read it is not mounted). The other "Overdue" words in the app
  (dashboard, Birds-eye, to-do) are separate strings and unchanged.
- **Find's placeholder clips at 1440 on Queries** ("Find an agent or agen…") now that Export is in the bar. The fold only
  starts under 160px of Find. Say if you want it to fold the words earlier.
- **Branch / build**: `list-filters-v1`; dev `index-J5yUU39m.js` via `dev/cf11-qc1611-lf1` @ `9356837a0`.
