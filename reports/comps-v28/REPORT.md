# Comparable titles v28 — report

Branch `comps-v28` from `origin/main` at **30439920** (it contains comps v27.1: `reports/comps-v27-1/REPORT.md` and
`lib/compUsage.ts`). Worktree `../ScriptAlly-comps28`. **Not merged to main.** Ref: `design-refs/comps-v28/` (23 files,
every SHA256 the prompt's, enrolled in `design-refs/.refhashes.json`). Rules: unchanged.

## False premises

1. **"The same components as the Query Centre and Analytics" — there were none to share.** Every page that draws these
   two headers draws its own: Analytics' `A21Header` / `A21Empty` and the Contact list's `ContactLightHeader` exist only on
   unmerged branches (main's Analytics is v17), and the Query Centre's `QcHeader138` / `QcEmpty138` are page-local on main.
   So the comps header was **lifted into shared parts** (`shell/LightHeader.tsx`, `shell/EmptyPanel.tsx`), built to
   `A21Header`'s values, and comps is their first user. The three page-local copies are candidates to move onto them.
2. **H1's "same component and class set as Analytics' header" cannot be literally true** while Analytics keeps its own
   copy (`a21-*` classes). H1 asserts what can be true: comps renders the shared part in each state, no v27 panel in
   either, and **on a build that has Analytics' headers, comps' computed values equal Analytics'**: title, eyebrow,
   by-line or body, button, card and box. That half reads "absent" on `comps-v28` alone and runs on the dev merge.
3. **Running that half found a real difference.** Analytics maps the mock's 1440px viewport breakpoint onto the app's own
   `sheet-wide` switch (a window over 1440px). At a 1512 viewport with the sidebar open, Analytics' empty panel is
   therefore compact (54px title, 44/52 padding), where the mock draws 64. `EmptyPanel` now does the same (f2a1b59d). The
   light header already matched.
4. **The v27 steps card did not read "How it works."** On main it read "How comp tracking works." It now reads "How it
   works." with the foot line, as the prompt and mock have it. Consequence on dev: compsSteps V10 claimed no other file
   writes the heading, and Analytics v24's own steps card writes the same words. V10 now holds the three step headings
   only.
5. **"Compact = page width under 1300" is a viewport width here**, not the shell's `sheet-wide` (that is a window over
   1440, false at 1512 with the sidebar open, where the mock draws three columns). The shelf's breakpoints are the mock's
   viewport ones (1300, 1100).
6. **At 1024 the toolbar did not fit as drawn.** With the sidebar open the column is ~700px; the segments plus "Sorted by
   Your order" need ~727, so the sort took a line of its own, which S1 forbids. Below 1100 the "Sorted by" lead-in is
   hidden (the button keeps the accessible name "Sorted by {value}") and the segments tighten, so only find wraps.
7. **"Focus the re-rendered opener" has a case with no opener left.** A shelf comp's "Log in a letter" link disappears
   once a letter names the comp (the comp becomes a draft). Focus then goes to that comp's card, which is the link's
   identity (`pick:K` → `card:K`). E2 asserts that case.
8. **Cancel already returned to the detail in v26.** ✕ and Escape did not. All three do now, and Save does too, but only
   when the edit was opened from the detail. An edit opened from a card's "Add publisher" closes on Cancel and Save.
9. **The v26 form had a preview of the list row**, and the v28 form has none. With the list retired, the preview went
   too, and AD8 with it.
10. **Analytics' request rate on main shows "n of d" below 20 queries** (`MIN_SAMPLE`). "Your average" on this page always
    shows a percentage, as the mock draws it. The numerator and denominator are Analytics' (unit-locked equal).
11. **Mock copy the prompt does not state, taken from the mock:** the explainer's first point ("Out in the last five years
    or so", which matches the five-year age rule; the app said "few years"), the picker's header ("Comps this letter names
    / Choose every comp the letter mentions") and its count ("4 comps named"). **Kept from the app:** the add toast "Added X
    to your library." (the mock says "to your shelf"); letter chips use the short name ("QL v2").
12. **Dev moved during the pack.** At recon it served `…-cl1831b-cl1832` (`index-LkecNKe9.js`). Before deploying it served
    `…-cl1832-cl1833` (`index-BuhCraZJ.js`, Contact list v18.3.3, confirmed identical under `src/` to the build that holds
    that bundle). The deploy branch is built on the latter.

## §0 findings

- **The headers (§0.1):** none shared (premise 1). Lifted: `shell/LightHeader.tsx` (+ `LightCardRows`, `LightCardRing`) and
  `shell/EmptyPanel.tsx`, with their own `slh-` and `epn-` classes. `HalfDrawer` gains one optional prop, `onDim` (default
  `onClose`); no other drawer changes.
- **Comps on main (§0.2):** the v27 page (`PanelHeader` title panel, `CompsStrip` "At a glance", `CompsLibrary` list with
  bar, column sort, grouping, row tray and full screen), `CompDrawer`, `CompForm` (v26), `CompLetterPicker`, `CompsSteps` and
  `CompsHowDialog` (v27), and `CompsScout`. Locks reading them: CV25 (A1 A3 B1 B2 D1–D4 E1 E2 F1 L1), AD1–AD8 and AD10,
  V27 V1–V10, V27.1 W1 W2 X1, the four comps screenshot suites, and unit locks `compsLibrary`, `compForm`, `compsSteps`,
  `compExplainer`, `compsV2`, `compsInQueryRetired`, `materialsPageSmoke`, `shortcuts`.
- **"Asked for more" (§0.3):** `compUsage.askedForMore` is `analytics.buildRows(...).reachedRequest`, which already
  includes partial, full, R&R and offer (so Analytics v24's `reachedRequest || reachedOffer` is the same set). "Your
  average" is `averageAsked()`: `reachedRequest` over every query of the manuscript, waiting ones included, which is
  `analyticsModel`'s request rate on all time. Unit-locked equal.
- **The current letter (§0.4):** `compUsage.currentLetter`, the newest Query Letter that isn't retired.

## Commits (on `comps-v28`)

`5f1c3e41` derivations · `f5906e40` shared header parts · `ef960c5d` Parts A–E · `ebcd4110` locks, retirements, evidence ·
`f2a1b59d` H1 against Analytics, and EmptyPanel's switch · then this report.

**Deviation: one commit for A–E, not five.** The page file renders all five parts and passes the drawer and picker their
new props, so no part builds on its own. The derivations and the shared parts each went in first, and each was
checked to typecheck and pass its tests at its own commit.

## Deleted

- **Components:** `comps25/CompsLibrary.tsx`, `comps25/CompsStrip.tsx`; `CompForm`'s list-row preview section.
- **Logic:** from `lib/compsLibrary.ts`: `FILTERS`, `passes`, `filterCounts`, `visibleRows`, `SortKey`/`SortState`,
  `COLUMNS`, `nextSort`, `sortRows`, `ariaSort`, `GroupBy`, `GROUP_OPTIONS`, `Band`/`BandTone`, `groupRows`, `NextMove`,
  `nextMove`, `libraryTag`, `Glance`, `glance`, `libraryPills`, `draftRow`. The page's `COMPS_FULL_KEY`, `COMPS_TITLE`,
  `COMPS_SUB` and the full-screen hook use. The `compsFull` (F) shortcut registration.
- **CSS:** 172 rules of `compsV25.css` (title panel, strip, list, bar, groups, full screen, preview) plus `.cv-q` and
  `.cv-pill`: 43KB → 27KB.
- **Tests:** the v25 list cases of `compsLibrary.test.ts`; `compForm.test`'s preview case (now asserts the absence).
  e2e: `compsV27.measure.ts`, `v27Mutations.sh`, and the four comps screenshot suites.

## The locks: CX28 (`tests/e2e/compsV28.measure.ts`)

Readings are written to a ledger, and a floor case fails a run under 120 readings.

- **Red first:** on **30439920** (the base), all fifteen red at a named reading, none a crash or a guard refusal
  (`redfirst/base-run.txt`, `base-ledger.jsonl`).
- **Mutation:** each lock red by its named mutation, an exact-once source edit restored byte-for-byte
  (`tests/e2e/cx28Mutations.py`, `mutation-proofs.jsonl`).
- **Green:** one consolidated run at **f2a1b59d**: CX28, CV25 A1 A3 E2, AD1–AD7 AD10 and X1, **32 of 32 passed**, 214
  CX28 readings, none failing (`green/consolidated-run.txt`, `green/consolidated-cx28-ledger.jsonl`). On this branch
  H1's Analytics half reads "absent", because main's Analytics is v17; it runs on the dev merge (below).
- An earlier attempt at that run measured nothing: Firebase's password-verification quota ran out (`auth/quota-exceeded`
  in the seeder) after a day of seeding. It is not counted here, and was rerun once the quota recovered.

| Lock | Red on the base | Red by its mutation | Mutation |
|---|---|---|---|
| H1 same header | the shared LightHeader is the header | no v27 title panel | keep the v27 panel when populated |
| H2 card | the card's rows | the card's rows (+ unit) | count draft comps as sent |
| H3 empty | the panel | no notice, shelf or band | render the band when empty |
| N1 notice | one letter: banners | two letters: still one banner | one banner per letter |
| S1 grid | the grid and toolbar were read | find: 230 when the row has room | let the find box take `flex: 1` |
| S2 card | sent (Salt Road) | not ready (The Ferry at Dusk) (+ unit) | show "Log in a letter" on a not-ready comp |
| S3 age | every card's chip | every card's chip (+ unit) | turn blush at 5 |
| S4 sort | the sort button is on the page | sorted by rate (+ unit) | sort Best response ascending |
| S5 filters | type toggles shown | on your shelf (+ unit) | OR the filters |
| D1 landing | What's landing is on the page | the average's label | use the comps-only average |
| D2 letters | What's landing is on the page | blocks (+ unit) | hide unrecorded letters |
| E1 back | Salt Road's card is on the page | cancel: back on the detail | close the drawer on Cancel |
| E2 focus | Salt Road's card is on the page | picker saved: focus | drop the re-render lookup |
| E3 picker | the header's Log comps in a letter is on the page | Save stays enabled | disable Save when the tip shows |
| L0 no jump | saw: empty panel · loading header · shelf while loading | the same reading | treat loading as empty |

**S1 needed tightening.** Its first form ("find is 150–230") stayed green under `flex: 1`: the find box shared the row's
spare with the spacer and settled at its 150 floor. It now requires 230 whenever the row has room to spare, and is red by
the mutation (`S1-before-tightening` is kept in the proofs).

**Two fixture states the shared fixture cannot show** are opt-in seeder variants, each undone in the same run:
`--variant two-unrecorded` (N1's "several" branch) and `--variant light` (D1's hollow dot, a comp sent with two
queries).

**Unit locks** (`src/lib/compsShelf.test.ts`, 25 cases): S3 (ages 0, 1, 3, 5, 6, 9; no year), S4, the slip table, the
filters and counts, the notice, landing rows and letter order, `letterRate`, the average equal to `analyticsModel`'s, and
the picker's record and tip.

## Retired and rewritten

Case by case in `tests/e2e/RETIRED-comps-v28.md`.

- **Retired:** CV25 B1 B2 D1–D4 E1 F1 L1; AD8; V27 V1–V10; V27.1 W1 W2.
- **Rewritten as CX28:** D2→S1, D3→S4, L1/V6→L0, V2/V4→H3.
- **Kept, re-pointed and green:** CV25 A1, A3, E2 (and A2, A4 unit); AD1–AD7 and AD10 (AD10 now asserts the back step); X1.
  A4 now reads every file in the page's folders.
- **Uncovered on the rendered page:** V5 (the first save switches the page with no reload; smoke only) and V9 (the pop-up
  hands over to the picker).

## Gates

| Gate | Baseline (30439920) | comps-v28 tip |
|---|---|---|
| tsc | clean | clean |
| Vitest | 588 files · 8,852 passed · 3 skipped | 589 files · 8,862 passed · 3 skipped |
| Production build | no warnings | no warnings |
| Dev build | no warnings | no warnings |
| Refs | — | 335 guarded |

## Shots

`reports/comps-v28/shots/`, beside every reference: top, shelf, landing, drawer, edit, picker, how-it-works, empty,
empty-steps, explainer and first-comp, at 1512 and 1280; top, shelf, landing and empty at 1920×1080 and 1024×768.

## Deploy

- **What dev served before:** `dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386-db60-cl183-an24-cl1831-an241-db601-cl1831b-cl1832-cl1833`
  (963ea282, Contact list v18.3.3, `index-BuhCraZJ.js`), checked again immediately before the deploy.
- **Deploy branch:** `dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386-db60-cl183-an24-cl1831-an241-db601-cl1831b-cl1832-cl1833-cx28`
  at **f7651e9f**: that branch with `comps-v28` (f2a1b59d) merged in. Everything dev carried is kept. The one conflict
  was `design-refs/.refhashes.json`: both sides added entries. It is resolved as their union, with no key differing, and
  all 515 refs check.
- **On the merged tree:** tsc clean; Vitest 604 files, 9,031 passed, 3 skipped; production and dev builds with no
  warnings. The comps locks on its build: CX28 (all fifteen), CV25 A1 A3 E2, AD1–AD7 AD10 and X1, **32 of 32 passed**
  (`dev-merge/run.txt`, 218 CX28 readings). H1 found Analytics' light header and empty panel present, and equal to
  comps' in both states at 1512 and 1280.
- **Deployed:** hosting only, `--config firebase.dev.json --project scriptally-dev`, from the clean integration worktree.
  Dev now serves **`index-jU8VeOuO.js`**. Both branches are pushed. Nothing is merged to main. No rules or functions
  changed.

## Not done, and for Nick

- **Move Analytics, the Query Centre and the Contact list onto `LightHeader` / `EmptyPanel`.** Each should be proved
  unchanged by its own header locks. H1 is the tripwire meanwhile: it fails the day comps' and Analytics' values part.
- **The add toast says "library"** where the page now says "shelf". It is a one-word change, left as the app has it.
- Prod rules are untouched: nothing here needs them.
