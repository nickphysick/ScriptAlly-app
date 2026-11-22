# Material icons v1 — report

Branch `material-icons-v1`, cut from `origin/main` @ 347dfa639 (what dev served: `index-d3wy2buF.js`, rebuilt
byte-identical before any edit). Full census: [CENSUS.md](CENSUS.md).

## 1. False premises (found before fixing anything)

1. **Dev serves `main`, not a `dev/…` branch.** consolidate-main-v2 merged the dev line into `main` at 11:27Z on 22 Nov, and that build is what dev serves. So the dev branch here is `dev/main-material-icons-v1`.
2. **`MatTab1533` is not a file.** It is an export of `queries/centre/QcSlip153.tsx`.
3. **`CHIP_ICON` in `QcQueryCard149` draws only on the phone / sheet path.** On desktop the card returns `<QcCard152>` whenever `v152` data exists. The desktop slide-out's marks were `chipIcon(label)` in `QcBubble152`, a second label-regex picker. Both now read the stored item.
4. **`SentMaterials.tsx` and `reading-pane/PackageGroup.tsx` are dead.** They are only reached inside `GRID_IS_THE_PAGE ? … : (old pane)`, and that flag is the constant `true`. I edited `SentMaterials` before the census came back, then put it back as it was, so the branch does not touch it.
5. **These are dead too:** `MaterialsField.tsx`, `MaterialsEditor.tsx`, `PkgComposer.tsx`, PkgMaterials and PkgMaterialDrawer. Add an agent is `agentPills.tsx` `MaterialPills`, and that is what changed.
6. **`.mk-lc-chip` does not exist.** The landing card's material chips are `.mk-lc-att span`. `.mk-lc-chips` holds book facts, not materials.
7. **Dashboard, Next up and Responses have no material labels of their own.** The Dashboard and Next up name materials only inside sentences. Responses reuses the grid card and slip, which Phase 2 covers.
8. **The brief's order (census, then Phase 1) was not followed exactly.** The census was delegated and ran in parallel, so its commit (15459fa28) landed after Phase 1's (b3c9d8a1a). The design refs went first, as asked.

## 2. Surfaces: before → now

| Surface | Before | Now |
|---|---|---|
| Slide-out query card, Materials tab rows | 11px marks picked by regex on the label | MaterialIcon 20px, chosen from the stored item or the step's stored map |
| Slide-out query card, Agent tab "What X asks for" | tick only | tick + MaterialIcon 20px (`askChips` icon from the agent's stored string) |
| Paperclip pop-up chips (grid card, slip, Responses) | CSS sheet on every chip | MaterialIcon 16px; the sheet only for full / revised manuscript; free text gets nothing |
| Sheet / phone query card story chips | `CHIP_ICON` letter / synopsis / pages, picked by regex | MaterialIcon 16px from the item; a partial takes its asked unit; `full`, `bell`, `notes` unchanged |
| Sheet "sent with" chips, edit pieces, Materials pane | `DOC` | MaterialIcon (16px; 20px in the pane rows); `DOC` deleted |
| Step-edit material chips (`QcEdit152`) | words | MaterialIcon 16px |
| Tracking "Queried" sent box rows (`SentHow`) | tick | tick + MaterialIcon 14px |
| Log a query piece headings | words | MaterialIcon before "Query letter" / "Synopsis" |
| Journey toggles (Log, Edit, Sent, Response) | checkbox | checkbox + MaterialIcon (`Toggle material=…`) |
| Edit query drawer pills | words | MaterialIcon 14px, from the stored item until the list is edited |
| Record a response unit tiles | lucide FileText / Type / List, burgundy when on | MaterialIcon 14px in the tile's ink; Other keeps its "more" mark |
| QcOpenCard Agent tab chips | words | MaterialIcon before the words |
| Agent card "What X asks for" | own LETTER / PAGE / PAGES 13px | MaterialIcon 20px; the old marks deleted |
| Agent card edit rows | tick | tick + MaterialIcon 20px |
| Add an agent pills | ✓ / + | ✓ / + then MaterialIcon 16px; the sample follows its unit |
| Discover picks | `Ico.doc` | MaterialIcon 14px; `Ico.doc` deleted |
| Discover phone tags | words | MaterialIcon before the words |
| Package "Sent with it" | M62 book / page / clip, tinted | Sample → pages, Synopsis → synopsis, in the text colour; extras lose the clip |
| Package story (disc and tiles) | M62 mail / book | letter / pages; M62 mail, book, page and clip deleted |
| Packages phone (shelf, slots, chips, best-of cards, lists) | PI.doc / PI.note | MaterialIcon letter / synopsis |
| To-do desk tiles and batch tiles | one generic DOC | MaterialIcon in the icon box (the full / revised manuscript keeps DOC) |
| Phone Quick log and agents options | check | MaterialIcon 20px before the words |
| Landing hero card attachments | DocIcon / SynIcon / PagesIcon | letter / synopsis / pages / chapters; the old three deleted |

## 3. Left as words, and why

**The 14px minimum would grow the chip, so these are words only and their old marks are removed:**
- Read-only thread chips `.qc152-ch` (8.5px type, about 18px tall)
- Agent quick view `.acq-mat` (9.5px type, padded)
- Housekeeping paper card `.apc-mat` (11.5px, 7px padding; its 13px mark already set the height)
- Bulk fill table head (8px type)

**A fixed label column, so adding an icon would need a layout change:**
- Pk62 "What's in it" `.k62-ck` (104 / 84px)
- `cardInputs` MaterialsField `.ae-mtr` (22px / 128px grid)
- WsBatch54 table head `th.c` (72px)

**One joined text node, with no slot per item:**
- Record a response "Queried via … · materials"
- Log a query package-row sub
- `SampleLine` / `materialsName` sentences
- `.nx-sum`
- AddAgentJourney summary
- DvShare
- ContactEmptyPage
- `contentsLine` / `goingLine`
- To-do "Sent previously" and "They ask for"
- Quick log "With it"
- EditQueryPhone "What you sent"
- PackagesPhone extras sub

**No stored item to read:**
- EditQueryPhone pills hold display strings, so the icon could only be guessed from label text.

**Icon-only slots** (no visible label to sit before): the carousel card and the narrow list `Mark` (QueryCard / QcList). Unchanged, like the paperclip.

**Not touched by design:**
- Pk26Drawer's v26 `Mark` (the `packagesV26` family)
- The sent-by-email envelope beside a bubble date
- `StatusDot`
- The "ok" tone's tick, which still stands in place of the icon on an answered chip (as before)

**Another session's files:** none. No touched file had uncommitted work elsewhere.

## 4. Strings the helper returns null for that might look as if they should have an icon

- **"Covering letter".** This is the display label, not a stored token. `materialIconKind` reads tokens, so it returns null. The Edit query drawer stores its pill strings when the list is edited, so a query edited there can hold "Covering letter" as its stored item and lose the icon. This is a pre-existing data quirk; it is reported here, not fixed.
- **Free text that names a length** ("Two pages of notes", "Personal statement, 2 pages"). It is null unless the string says "sample" or `sampleOfItem` reads a number and unit from it. A typed "50 pages" under Other therefore *does* get the pages icon; it cannot be told apart from a legacy sample string.
- **Author bio on an agent card.** It has a drawing, but `materialRowsFromAgent` sheds it (retired pill), so the agent card rows never show one.
- **A step sample with no unit** draws chapters, not pages, to match `matLabel`'s words ("First 3 chapters").

## 5. Gates: baseline vs final

| Gate | Baseline (347dfa639 + design refs) | Final |
|---|---|---|
| `tsc --noEmit` | 0 errors (with 8 GB heap; the default heap OOMs) | 0 errors |
| `vite build` errors / warnings | 0 / 0 | 0 / 0 |
| Vitest | 4 failed · 13129 passed · 4 skipped (921 files) | 4 failed · 13196 passed · 4 skipped (923 files) |

The four failures are the same in both: `firestoreTarget.test.ts` ×2 and `events.test.ts` ×2, already red on `main`. Two other suites, `statusMarksV3Sources` and `marketingLinks`, failed once in a partial run under load and pass alone and in the full suite.

## 6. Measurement

`tests/e2e/materialIcons.measure.ts` is one spec with two runs, both made in this session through the test slot on the emulator.

- **`MI_PHASE=base`** ran against a scratch build of the unmodified dev line (347dfa639). It wrote every row's `offsetHeight` to `base.json`.
- **`MI_PHASE=new`** ran against this branch. It asserts that every material row draws `svg.mat-ico`, that the box is at least 14×14, and that the icon sits immediately before its words (the svg ends left of the next text node). It also asserts that every row's height equals the base row's.

Every population was non-zero on both runs.

| Phase | Surface | Rows / material rows | Heights base → now | Result |
|---|---|---|---|---|
| 2 | Slide-out query card, Agent tab (seed-query-10) | 2 / 2 | 42/42 → 42/42 | pass |
| 3 | Agent card "What X asks for" (that query's agent) | 2 / 2 | 42/42 → 42/42 | pass |
| 4 | Package "Sent with it" (cv25-pkg-coast) | 2 / 1 | 23/23 → 23/23 | pass (first run failed on a spec fault: it looked for the svg inside the `<b>`) |
| 5 | Landing hero card `.mk-lc-att span` | 10 / 4 | 24 ×10 → 24 ×10 | pass |

**Leftover sweep after Phase 5:** I scanned every `.tsx` for a hand-drawn svg, a lucide `FileText` / `BookOpen` / `Files` / `ScrollText`, or a local mark constant directly before a material label. It found 0 hits.

**Not measured on the rendered page:**
- To-do tiles
- Add an agent pills
- The paperclip pop-up
- Edit query and Record a response
- Phone screens

These are covered by unit tests and gates only. Their chip heights were checked against the CSS (fixed heights of 20, 24, 26 and 36px that the chosen icon size fits inside), not measured.

## 7. Dev deploy and branches

- **Dev URL:** https://scriptally-dev.web.app now serves `index-CLHUY0SC.js` (deployed 22 Nov). Before it served `index-d3wy2buF.js`. The deploy command checked the served hash and would have stopped if dev had moved.
- **What was deployed:** a clean detached checkout of the pushed tip, built with `npm run build:dev` (no errors or warnings) and deployed to hosting only (`--config firebase.dev.json --project scriptally-dev`). No rules, functions or prod.
- **Branches:**
  - `material-icons-v1`: the work, nine commits on `origin/main` @ 347dfa639 (the last is this report), pushed. It is not merged into `main`.
  - `dev/main-material-icons-v1` @ e0ed0becd: the commit deployed, pushed, stacked on `main` (which is what dev served). It is one commit behind `material-icons-v1`; the extra commit is this report, which is not in the bundle.
- **Worktrees:** the scratch base-line build, the deploy checkout and `../ScriptAlly-mi1` are all removed.
