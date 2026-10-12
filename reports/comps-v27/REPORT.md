# Comparable titles v27 — report

Branch `comps-v27`, cut from `comps-v26-1` at `ebb93316`. Not merged.

| Part | Commit |
|---|---|
| References, the V27 locks and their red-first readings | `8bb3e8ba` |
| A · header copy | `1a177779` |
| B · the empty page | `dd45fdc9` |
| C · the pop-up | `e071d0f0` |
| CV25 L1's mutation; project notes | `728d3a93` |
| CV25 F1 and A3 repointed | `8b5b37b7` |

The consolidated lock run was made at **`8b5b37b77b7492cc10e5759ba45d1b30b8e41175`**. The dev build is recorded in `INTEGRATION.md`, on the dev branch only.

## 1. False premises

1. **"Nothing below the header while loading" retires v25's no-jump lock for the strip and the library.** CV25 L1 held that the strip and the library heading had the same boxes loading and loaded, because v25 drew them as placeholders. v27 says to draw neither while loading. I followed v27: the strip and the library now arrive with the data, and L1 holds the panel only (and that nothing is below it while loading). This is a real cost: an account with comps sees the page grow under the header once, at load.
2. **"The panel size is unchanged" is not true.** The title went from two lines to one, so the panel is 256px tall where it was 270. The link row did not add height: the drawing sets it. The panel is the same height in both states and from loading to loaded.
3. **Five CV25 locks read the header or the band, not two.** B1 and C1 as named; also L1 (item 1), F1 (it listed the band among what full screen hides) and A3 (it reached the picker through the band's link). F1 and A3 are repointed; their claims are otherwise unchanged.
4. **There is no centred-dialog primitive.** The picker is a hand-built portal on the escape stack. The pop-up is built the same way, in its own file.
5. **`CompCard` had no other caller**, so it is deleted with the exhibit. `CompsQueryLine.tsx` has had no importer since v26 and is still in the tree; I left it.
6. **The mock disagrees with the prompt in small ways** (the prompt won each time):
   - its button row has a 12px gap; the shared header's is 10, unchanged;
   - its pop-up sits at z-index 75; ours is the picker's own layer, 62;
   - its link underlines the whole button, which would run under the ringed "?"; ours underlines the words;
   - its sheet carries rules for a large "add" button under the steps (`.hw-cta`, `.bigadd`) that its markup never uses; not built.

## 2. §0 findings

- **The header.** Title and subline are set in `ComparableTitlesPage.tsx` (now `COMPS_TITLE`, `COMPS_SUB`). The old ones were named by CV25 B1, the page smoke test (it required the manuscript's name in the subline) and a comment in `headerV3.measure.ts`. All updated.
- **The band.** `comps25/CompsHow.tsx`, read by CV25 C1, F1 and A3, the smoke test and the v25 shots spec.
- **The empty state.** `CompsEmpty.tsx`: a heading and the exhibit (three `CompCard`s in example mode). `CompCard` had no other caller. **Both deleted.**
- **The loading rule.** `loading` is "collections not ready" (or the dev-only hold). Before, loading drew the strip and library as placeholders. Now: `empty = !loading && comps.length === 0`, `listed = !loading && comps.length > 0`, and while loading the page is the header alone. The header's loading state shows the with-comps buttons and the link, disabled.
- **The dialog primitive.** None shared (item 4). The pop-up uses `useEscapeLayer` at `ESC_LEVEL.pageModal`, the picker's level.

**Deleted:** `CompsEmpty.tsx`, `CompCard.tsx`, `comps25/CompsHow.tsx`; the two unit cases that rendered the exhibit and the live card; 51 selectors from `compsV2.css` that only they used (every other rule compared and still present) and the tokens `--cpv-ring` and the manuscript-name rule; the band's 23 lines in `compsV25.css`.

## 3. V27 locks: red and green

**Consolidated green run:** every V27, AD and CV25 lock in one pass at 1512 × 900 and 1280 × 800, on a dev bundle built from the clean tree: **35 passed; V27 106 readings, AD 161, CV25 185, all green** (`run-consolidated.txt`, `ledger/`, `ad-ledger/`, `cv25-ledger/`). Gates at the same code: typecheck clean (app and functions), both builds clean, Vitest 571 files, 8,629 passed, 3 skipped (baseline 570 / 8,626).

**Red first** is each lock against the unchanged build (`red-first/`). **Red under mutation** is against the finished build (`mutation-runs/`); seven are source edits with a rebuild, restored from copies.

| Lock | Red first | Mutation | Red under it | Green |
|---|---|---|---|---|
| V1 header | 12 of 12 red (old title and subline) | Restore the old subline | `"Log the comps each letter names, and see which agents saw them."` in both states | "Comparable titles" on one line; the subline exact; 0 manuscript titles |
| V2 empty | 10 of 16 red | Render the strip when empty | `no strip — 1` | one button, "+ Add your first comp"; the note; 0 strip, library, Scout tab, link, exhibit |
| V3 card | 6 of 10 red | Restore the full-width tint | `outside 251,249,245 · the page 242,238,232` | card 296.4–1455.6, panel 296.4–1455.6 (1280: 289–1231 both); 32 below; outside is the page |
| V4 first | 2 of 6 red | Open in "Add a comp" mode | `"Add a comp"`; explainer `open false · 0 points` | "Add your first comp"; explainer open, 3 points |
| V5 switch | 2 of 12 red | Require a reload to switch | after saving: `card 1 · strip 0 · heading 0 · rows 0` | saved: strip, heading and one row, same document; removed: the card back, same document |
| V6 no flash | 2 of 6 red (something below the header while loading) | Treat "loading" as empty | `3 reading(s) with the card` (1280: 10) | a loading state seen, then 7 rows; 0 readings with the card; 0 with anything below |
| V7 no band | 4 of 6 red | Leave the band on the page | `4 element(s)`; `1 in the pop-up · 1 on the page` | 0 steps in the document; strip 34 below the panel; then 1 in the pop-up, 0 on the page |
| V8 pop-up | red (no link) | Drop the focus return | ✕, Escape, scrim: `closed true · focus on body` | dialog, modal, labelled "How comp tracking works."; 1080 wide; scrim `rgba(27, 36, 51, 0.5)`; ✕ 36px at 16 and 16; focus on ✕, then back on the link, three ways |
| V9 picker | red (no link) | Leave the pop-up open beneath the picker | `1 pop-up · 1 picker`; after Escape `0 picker · 1 pop-up` | the pop-up closes, the picker opens on a letter; one Escape leaves nothing open and 7 rows |
| V10 one component | red (no hosts) | Copy the steps markup into the pop-up | card `<SECTION class="cv-hsteps">` · pop-up `<SECTION class="hw">` | same tag, class set, shape and words in both hosts |

V10's source half is a unit lock (`compsSteps.test.tsx`): only `CompsSteps.tsx` writes the steps' words or emits their classes, and exactly two files mount it.

One thing the locks did not catch and a screenshot did: my first class name for the steps collided with the Scout drawer's list in the same stylesheet, and the steps were laid out as the Scout's rows through ten green locks. Renamed (`cv-hsteps`).

## 4. The CV25 and AD re-run

- **CV25:** 12 locks, 185 readings, all green. C1 is retired. B1 is rewritten (the new h1, one line, the new subline, no manuscript title). L1 is rewritten (item 1) with a new mutation: the old one no longer changes anything, and hiding the link row does not either, because the drawing sets the panel's height. F1 and A3 are repointed (item 3). B2, D1, D2, D3, D4, E1, E2 and A1 read as before.
- **AD:** 9 locks, 161 readings, all green. AD9 is retired (V2 holds the exhibit's absence). AD1 to AD8 and AD10 read as before, reading for reading.
- Rewritten locks proved red again: B1 under "restore the number panel" (6 red), L1 under "give the loading header its own height" (`306.0 → 256.0`).

## 5. Suites on the merged dev build

In `INTEGRATION.md` on the dev branch: gates, V27, AD, CV25, query panel v1, onboarding v9 and the onboarding walk.

## 6. Decisions to check

1. **While loading, the header shows the with-comps buttons and link, disabled.** An account with no comps therefore sees that row swap to the one large button at load. The panel does not change height.
2. **The Scout tab is also hidden while loading**, and while the pop-up is open.
3. **"Compact" is the mock's own rule: a window 1100px wide or less.** At 1280 the card and the pop-up use the full values (52 / 48 padding, heading 38).
4. **The steps' figures are 140 tall in the card at both lock sizes** (170 on the wide sheet), as the mock draws below 1440; the prompt gives no figure height for the card.
5. **The page with no manuscript at all is unchanged** ("Add a manuscript to build its comp list.").
6. **The pop-up's text steps up at a 1440px window**, not on the shell's wide-sheet class, because a portal is outside the shell.

## 7. Not done, and not verified

- **Reduced motion** for the pop-up is a CSS rule; it was not measured.
- **The phone layout** of the card and the pop-up was not looked at. Below 768px the steps stack in one column by rule.
- **`CompsQueryLine.tsx` and `CompsScoutRail.tsx`** are still in the tree with no page mounting them.
- No suite beyond V27, AD, CV25, query panel v1 and onboarding v9 was re-run.

## 8. Shots

In `reports/comps-v27/shots/`, each beside its reference in `design-refs/comps-v27/`:

| Reference | Shot |
|---|---|
| `ref-empty-1512@2x.png`, `ref-empty-1280@2x.png` | `empty-1512.png`, `empty-1280.png` |
| `ref-with-comps-1512@2x.png`, `ref-with-comps-1280@2x.png` | `with-comps-1512.png`, `with-comps-1280.png` |
| `ref-how-it-works-1512@2x.png`, `ref-how-it-works-1280@2x.png` | `how-it-works-1512.png`, `how-it-works-1280.png` |

Also the empty page with the first-comp drawer open: `empty-first-drawer-1512.png`, `empty-first-drawer-1280.png`.
