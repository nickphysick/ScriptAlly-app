# Submission packages v42 — report: stat tiles, one builder container, navy icons, an animated How it works

Branch `submission-packages-v42`, cut in its own worktree (`../ScriptAlly-pk42`) from the tip of
`submission-packages-v41` at **ce2712af**. v41 had landed on dev: every v41 code commit is in the branch dev served
(`dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41-cl262-db21-sip12-pk41w-qc152-fn121`, aed487e6,
`index-B4t-KZ6J.js`); only v41's last report-only commit (ce2712af itself) was not. The pack's hashes all verified:
the ref 13cb7d2c…, `SHA256SUMS` 2289dd98…, and its 31 lines (the ref and 30 screens). The ref is enrolled in
`.refhashes.json`.

## 1 · False premises (first)

1. **The Query Centre and the log-a-query journey never drew a package's icon or colour.** The Query Centre shows a
   generic package glyph (`ICON.pkg` / `PKG_ICON`, `currentColor`) beside the package's name; the log journey's package
   list draws a plain radio dot (`<i />`). No `pcStyle`, `--pc` or stored colour reaches either. So Part E changed
   nothing there; L4 holds that neither paints a stored colour (rendered), and a unit lock holds that no file in
   `components/queries` or `components/queryActions` takes a package colour at all.
2. **`firestoreTarget` is not on this branch.** The suite (`src/test/firestoreTarget.test.ts`) arrived on main with the
   emulator work (56a58004), after v41 branched; it does not exist on `submission-packages-v41`, so it cannot enter
   either side of the comparison. Every unit gate here is green at both ends.
3. **The ref's How it works is 1080 wide at BOTH 1512 and 1280**, not "about 960, scaling down at 1280". Its computed
   card is 1080 (a 7px rim at radius 22) at both widths; the stations are 221 wide 40 apart at 1512 and 235.5 wide 26
   apart at 1280. The build follows the computed ref (the brief makes it the authority), with `max-width:
   calc(100vw − 32px)` so it never overflows a narrower window.
4. **"Use for current batch" on a Draft.** The ref's screen 04 draws the button on a draft package. The existing
   active-package writer is gated (`canMakeActive`: a Ready or Out-with-agents package only), and behaviour stays as
   built, so a Draft shows no button. Report only; one condition to change if a draft should be usable.
5. **The ref hides the builder's status pill at ≤1400** (its computed heading at 1280 has no pill). v41 hid it too; v42
   keeps that (the open tile's foot says where the package stands).
6. **The ref's tile foot for a draft reads "1 of 2"**; the fixture's draft has neither piece, so the app's reads
   "0 of 2 pieces in" — the same rule (`2 − what it needs`).
7. **There are no shared Dashboard band tokens on this base.** Dashboard v2 (and its framed card) is on the dev line,
   not here, as v41 also found; the bands are the palette-A literals the brief names (sage #e2e6e0, sand #f4e6d6, blush
   #f3e2dc, sage accent #4e6b58 on #f3f6f2, the preview well #fbf6f0). v41's page-local frame (`.p41-fr`: padding 7,
   radius 20, an inner #e3d5c9 frame at 14) is a different construction from the ref's builder container (one white box,
   radius 24, the rim as a box-shadow), so the builder does not reuse it; Results still does.
8. **A station in the ref starts at opacity .35**, i.e. visible. The build starts each at 0, so "station 4 is not
   visible at 1s" is true of the page (L7).
9. **The brand-new page still needs v39.3's draft.** With no letters or synopses the page shows v26's hero, whose
   "build" scrolls to the builder's draft "My first package". Part F's empty card is for a writer with materials and no
   live package; the hero path is kept as built.

## 2 · What changed, by part

| Part | What | Where |
|---|---|---|
| A | the rail (grid, sticky card, groups, keys, empty line), the batch strip and its "Change" picker, the drawers' colour field, the popover's swatches, the builder band's wash and stripe — **deleted** | `Pk41Rail.tsx`, `Pk41Batch.tsx` (PkTile and vnumOf moved to `v42/PkTile.tsx`), pk41.css C/D, pk39/pk391 swatch rules, 11 generated `.pa-pd-cols` rules, packagesV41's BATCH_*/RAIL_*/railGroups/statusWords, packagesV39's firstFreeColour |
| B | the header closes under its subheader | `Pk41Header.tsx` (no batch slot) |
| C | the stat tiles | `Pk42Tiles.tsx`, pk42.css C, `tileFoot` (lib/packagesV42) |
| D | the builder container and its bands; "Use for current batch" | pk42.css D (`.p42-bw`), pk41.css F/E changed in place, `Pk393Builder.tsx` |
| E | navy icons, drawer copy, the icon hint | `pcStyle` (lib/packagesV39), every `var(--pc, #1d4b63)` fallback → #2d3a50 (19), `.p41-ic` glyph cream, `Pk26Dialog.tsx`, `Pk26Builder.tsx` (popover) |
| F | the empty card | `Pk42Empty.tsx`, pk42.css F; v40's start card deleted |
| G | How it works, one animated infographic | `Pk42HowItWorks.tsx`, `howArt.tsx`, pk42.css G; `Pk41HowItWorks.tsx` and its test deleted |

### Every place a package's colour was read for display, and what changed

| Where | How it read the colour | Now |
|---|---|---|
| the rail's rows (tile, open-row wash and edge) | `pcStyle(p)` → `--pc` | deleted with the rail |
| the batch strip and its picker | `pcStyle(p)` | deleted |
| the stat tiles (new) | `PkTile` → `pcStyle` | navy |
| the builder's icon tile | `--pc` on `.p93-bh` | navy (#2d3a50 stated in the builder rule) |
| the builder's band (wash + 5px stripe) | `color-mix(--pc 11%)`, `inset 0 5px 0 --pc` | retired (white) |
| Results: the three cards and the package table | `PkTile` → `pcStyle` | navy |
| the package drawer's header (`.p8-dpk`) | `pcStyle(p)` | navy |
| the icon popover's chosen icon | `pcStyle(p)` | navy |
| New / Details drawer: the chosen icon, Start from, the header | `pcStyle({ colour: col })` | navy |
| v39-era rules in pk39/pk391/pk393 (`var(--pc, #1d4b63)`) | fallback Harbour | fallback navy |
| the Query Centre, log-a-query | **never read it** (false premise 1) | unchanged |

**New packages are written without a colour** (the model's writers already treated it as optional; absent reads as
Harbour and nothing paints it). Edits leave a stored colour as it is. The stored field, its rules and `colourOf` /
`hexOf` / `PACKAGE_COLOURS` (and their rules-agreement test) are kept; nothing outside lib/packagesV39 may call them
(unit-locked).

### Retired versus kept

- **Deleted:** the rail, the batch strip and picker, the colour field and swatches (component, restated and generated
  CSS), the band's wash and stripe, v41's five-step guide (component, test, CSS), firstFreeColour, v40's start card
  (unreachable once the empty card replaced it), v41's 1700px two-column builder rule.
- **Kept:** `railLine` / `railLineText` (the tiles' foot reads them), v39.3's draft first package (the brand-new page's
  hero still scrolls to it), the stored colour field and its readers, v40's package guidelines under the builder,
  `.p41-fr` (Results), the founding strip, the folder tab, the pinned hawk, every handler and writer.

## 3 · Gates (baseline → final)

| Gate | Baseline (ce2712af) | Final |
|---|---|---|
| tsc | 0 | 0 |
| build (`build:dev`, grepped) | clean | clean |
| Vitest | 680 files, 10,644 passed, 3 skipped | 681 files, 10,649 passed, 3 skipped |
| e2e, this page | SP41 L1–L9 (v41's record) | **SP42 L1–L8: 16 of 16 cases green at 1512 and 1280**; SP41 L1/L2/L3/L6/L8 (10 cases), pk393 L10–L14 (6), pk39 L5, pk38 L1/L3/L4/L7/L10/L11, pk26 R/N×2/H: all green |

## 4 · Commits

| Phase | Commit | Files |
|---|---|---|
| 1 · retirements, header | 193f03b0 | `SubmissionPackages.tsx`, `Pk41Header`, `Pk41Results`, `Pk26Builder`, `Pk26Dialog`, `Pk393Builder`, pk39/pk391/pk391.generated/pk41 css, `packagesV41`(+test), `v42/PkTile`, `packagesV42`, the ref; `Pk41Rail`, `Pk41Batch` deleted |
| 2 · stat tiles | ebe5ea51 | `Pk42Tiles`, pk42.css, `packagesV42.test`, smoke, `pk42.shots.measure.ts` |
| 3 · builder container | 8376837d | `Pk393Builder`, pk41.css, pk42.css |
| 4 · navy, drawers, empty | b688908c | `packagesV39`(+test), `Pk26Dialog`, `Pk26Builder`, `Pk42Empty`, the css fallbacks, `pk41Fixture.mjs` |
| 5 · How it works | c72e9388 | `Pk42HowItWorks`, `howArt`, `pk42HowItWorks.test`, pk42.css; `Pk41HowItWorks` (+test) deleted |
| 6 · locks, CLAUDE.md, report | (this commit) | `pk42.measure.ts`, pk41/pk38/pk39/pk393/pk26 measures, `RETIRED-submission-packages-v42.md`, `packagesV42.test` (colour locks), CLAUDE.md, this report, screens and ledgers |

## 5 · Locks

`tests/e2e/pk42.measure.ts`, at 1512 × 982 and 1280 × 832, each with a reading floor; fixtures `seedPk40.mjs` +
`pk41Fixture.mjs` (`--one-package`, `--retired-only` added), restored in afterAll.

- **L1 Retired pieces** — no rail, no batch strip, no rail row, no picker; the New and Details drawers and the icon
  popover hold no swatch and no Colour field (twelve icons); no horizontal overflow.
- **L2 Tiles** — the row is under the header, above the builder and outside its box; one tile per live package in the
  model's order (newest first); the retired one absent until "Retired (1)", then at 65%; each ≤ 300 wide, equal ±1;
  each foot in its stage's words; exactly one Current batch, the stored active package; a click opens that package
  with no scroll and the tile computes the 2px navy ring; one package: one tile and no Retired link.
- **L3 Builder** — one white container with a 7px white rim; the bands rgb(226,230,224) and rgb(244,230,214), the sent
  note rgb(243,226,220); steps and preview tops equal ±1, the preview to the right; a sent package's buttons inside the
  preview; no button on the current batch; "Use for current batch" on Ready one sets the stored active package, the tag
  moves and the button goes.
- **L4 Navy icons** — with Standard stored Plum and Ready one stored Pine: both builder icon tiles and their stat-tile
  icons, and every package icon on the page (tiles, builder, Results), compute rgb(45,58,80); the page, the open
  log-a-query journey and the Query Centre paint neither stored colour.
- **L5 Drawers** — the New and Details titles and lines and the icon hint, exactly; twelve icons, no swatch; the
  popover's hint.
- **L6 Empty** — no packages: the card, its heading and button, no tiles, no builder, no Retired link; the button opens
  the New drawer. Only retired: the card and "Retired (1)", no builder.
- **L7 How it works** — station 4 at opacity < .05 at 1s and 1 by 13s; the title, intro and four station titles
  exactly; none of v41's guide strings; Play again restarts (station 4 hidden again a second later); Escape closes;
  with reduced motion all four stations are at opacity 1 at open.
- **L8 No regression** — the founding strip on one line with its text uncut, the folder tab rgb(251,239,233), the hawk
  fixed, 212 ±2 tall, on the viewport's foot.

Unit: `packagesV42.test.ts` (tile feet, the retired link, How it works's words, **"nothing outside lib/packagesV39
reads a package's colour"** and **"the Query Centre and log-a-query take no package colour"**),
`pk42HowItWorks.test.tsx` (words, four swappable drawings, the reduced-motion construction), `packagesV39.test.ts`
(pcStyle is navy for any stored colour), `materialsPageSmoke.test.tsx` (tiles before the builder; no rail or strip).

### Red before green

Every SP42 lock was run at 1512 with its named break (`PK42_MUTATE`) and went red on readings, not by a crash
(`redproofs.txt`): L1 an injected batch strip (`[data-pk41="batch"]` 1 in the DOM); L2 tiles forced to 320 wide; L3
the steps stacked and the sage band white (three reds); L4 Plum and Pine painted on the icons (seven reds, including
"this page paints neither stored colour"); L5 the hint rewritten (three reds); L6 the card hidden (three reds — the first
attempt went red by a click timeout, so the click is guarded and it was re-proved); L7 the stations' animation off
(station 4 visible at 1s, and after Play again); L8 the hawk at 260 and the tab cream (two reds). The unit colour lock
went red with one `.colour` read appended to `SentHow.tsx` and green again once restored. A natural red against the
v41 build was not run: the harness account's sign-in quota allowed one pass per ~10 minutes, and the breaks name each
lock's claim directly.

### Re-pointed and retired

`tests/e2e/RETIRED-submission-packages-v42.md`: SP41 L4 (batch), L5 (rail), L7 (preview under the steps), L9 (five
steps) and L6's builder half retired; SP41 L1, L3, L6 re-pointed (tiles; the v42 heading row; Results frames only);
pk26 R and H, pk38 L1/L3/L4/L7/L10/L11, pk39 L5 and pk393 L10–L14 re-pointed from the rail rows to the tiles.

All of them were run on the v42 build: SP41 10 passed / 8 skipped (the retired); pk393 + pk39 7 passed / 9 skipped;
pk38 + pk26 10 passed / 10 skipped (skips are v41's and earlier retirements).

## 6 · Screens

`reports/submission-packages-v42/app/` holds the app at each of the pack's states, named as the pack's
`design-refs/submission-packages-v42/screens/*` files are (without `@2x`): 01-top, 02-builder-sent, 03-tile-draft-open,
04-builder-draft, 05-builder-ready-linking, 06-retired-shown, 07-results, 08-results-tables, 09-drawer-new,
10-icon-picker, 11-how-it-works-mid, 12-how-it-works-end, 13-banner-dismissed, 14-one-package, 15-no-packages, each at
1512 and 1280. (`tests/e2e/pk42.shots.measure.ts`, `PK42_SHOTS=1`.)

## 7 · Dev

Dev serves v42 from **`dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41-cl262-db21-sip12-pk41w-qc152-fn121-pk42`**
(6e13c224, pushed), bundle **`index-Bi8AGvkp.js`** (was `index-B4t-KZ6J.js`, which aed487e6 — the branch dev served —
was rebuilt and matched before merging). Hosting only; no functions or rules. Prod untouched.

The merge needed one integration fix: the dev line's phone Packages page (`PackagesPhone.tsx`, not on v42's base)
imported v41's How it works steps and `firstFreeColour` and painted each package's stored colour in five places. On the
merge branch it lists v42's four stations, paints packages navy and creates them without a colour (v42's colour lock
caught the reads). **When v42 merges to main, the same change is needed wherever the phone page has landed.** On the
merged tree the only reds are the two `firestoreTarget` cases already red on the dev line (28 older e2e scripts create
their own Firebase app), kept out of the comparison as the pack directs.
