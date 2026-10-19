# Header rules v1 / v1.1: one hero geometry for every workspace page, taken from the Contact list

Branch `header-rules-v1` (worktree `~/ScriptAlly-hr1`). Built 19 Oct 2026. Integration branch and dev build: §8.
**Not merged to main.**

## 1. False premises

- **The v1 oracle came from the Contact list v19.2 mock, not from dev.**
  - Step 0 measured the Contact list on dev at the four widths, and it differed from the v1 table on almost every column by up to 14px.
  - The build had drifted from the mock: a 36 top (not 34), 44 / 50 titles (not 40 / 50), a 12px eyebrow line box (not 14), a 26px byline box (not 24), a 24 / 40 action gap (not 16 / 32), and a 44 gap below (not 54).
  - It also switches to wide only when the sheet is wider than 1440, so 1512 is compact.
  - I stopped there, as v1 says to. v1.1 made dev the oracle, using those Step 0 measurements unchanged.
- **The right item's width isn't in the Contact list's code.**
  - Its card is sized by its content (321 compact, 363 wide). There's no width to "take from the code".
  - The v1.1 mock draws the Query Centre's chart at 332 / 370, so those are a new token, `--hero-right-w`.
  - Right items with no width of their own use it: the Query Centre's chart, Analytics' card and Discover's card.
  - Cards that have a content width keep it: the Contact list (321 / 363), Responses (431.6), Packages (346 / 367) and the To-do calendar (404 / 496).
  - HR1-5 asserts the width only where the page uses the token.
- **Decisions 1 and 5 together mean HR1-7 can't hold at every width.**
  - Decision 1 holds the text column at 243 even with no art, so the reserved slot takes 179px of a compact 900px row.
  - With a card beside it, several titles don't fit at 44px, and decision 5 has them wrap rather than shrink. The stack grows, and the content follows it.
  - So Analytics' content top differs from the Query Centre's at 1280, 1440 and 1512, and Discover's from the Contact list's at 1280 and 1440.
  - HR1-7 asserts the eyebrow and title positions are identical everywhere. It asserts the content tops are identical wherever both stacks are the oracle's height, and records the wrapped widths with their numbers.
- **At a 1280 window some heroes don't fit even with the title wrapped.**
  - Analytics' row needs 953px of its 896: the 179 art slot, 418 of buttons, 24, and the 332 card.
  - Its buttons therefore wrap onto a second line. Before this change, they ran under the card.
  - Responses' and Packages' buttons wrap the same way beside their wider cards.
  - Nothing overlaps and nothing shrinks, but those heroes are taller at compact widths. See §6 for the decision this needs.
- **Discover shows its coming-soon panel on dev, not the hero the inventory names.**
  - `DISCOVER_LIVE` is false, so dev renders `DvEmptyHeader`: a navy feature panel with a lede, not a byline, and its art in a disc on the right.
  - The live hero, `DvHeader`, is the stack. It is reachable only through the dev review aid (`window.__SA_DV_STATE = "live"`).
  - The live hero is what went onto the tokens. The coming-soon panel is untouched, and HR1-8 holds it.
- **The Dashboard's hero isn't a stack.**
  - Its buttons sit on the right at the title's height, and it has no art and no right item.
  - It's report-only. Turning it into a stack would be a redesign.
- **The To-do list's title used to step its font down to fit (to 26px)**, so the header never grew (v5.2's one-screen law). Decision 5 forbids shrinking.
  - It now wraps at its size. The fit code stays in `TrayHeader`, unreached.
  - On the harness account the title fits at every width, so nothing wraps there today.
- **Discover's "How the Scout finds agents" link** sat 18px under the buttons, inside the stack's 44px gap.
  - It now hangs out of the flow in the top of that gap, so the stack ends at the actions as H7 defines.
  - Moving it into the actions row instead wrapped the buttons even at 1920, and was reverted.
- **Two of my commit messages misstate a before-value.** They stay on the record and are corrected here:
  - `db6fe946` (Responses) says the eyebrow sat at 30. True at 1280 and 1920, but at 1512 the card pushed it to 38.3.
  - `81b97c1c` (To-do) gives the filter row's before positions as 239 / 239 / 261. They were 235 / 235 / 257 (the row ended at 209, then 26).

## 2. The base and Step 0

- **Tip:** `bbd9f309`, `dev/…-cl191-qc140-cl192-qc1401`, which dev served as `index-DSAY7Z_7.js`; a build of it reproduced that hash.
  - It carries Contact list v19.2 (`f758e550`) and Query Centre v140, **and v140.1 is in it**.
  - `origin/contact-list-v19-2` has one later commit (`d0333f9e`), which touches only its report.
- **Design refs:** v1's eight files and v1.1's seven all matched their SHA256s.
  - Only v1.1's are enrolled, in `design-refs/header-rules-v1-1/`; v1's were withdrawn.
- **Baseline gates:** tsc 0, both builds 0, Vitest 617/617 files (9,155 passed, 3 skipped).
- **Baseline locks** (on the base build, before any edit): 13 suites, **all green** (197 tests).
  - QC140 15, QC1401 5, QC139 14, QC138.6 10, CL19 15, CL19.1 9, CL19.2 9, Analytics v24 15, Responses (rs2) 18, Discover v1 21, Packages (pk4) 39, To-do v5.2 23 (+1 skipped), Dashboard v60.1 3.
- **Oracle check:** the v1.1 table is the Step 0 measurement of dev, value for value.
  - After Phase 1 the Contact list measured identically at all four widths, with 0 differences in any part.

## 3. The tokens (`src/components/shell/pageHeroFrame.css`)

**Placement.** The tokens are on the shell root (`:root, .ws-app`), with the wide values on `.ws-app.sheet-wide`, the shell's one switch. They are not on `.phf`, because the gap below is applied to the content *after* the hero, which can't read the hero's own custom properties. `--phf-inset` stays on `.phf`, because it is in container units of the hero.

| Token | Compact | Wide | Source |
|---|---|---|---|
| `--hero-top` | 36px | 36px | `contactV19.css:659` |
| `--hero-gap-below` | 44px | 44px | `contactV19.css:660` |
| `--hero-w` | min(1600, sheet − 48) | same | `contactV17.css:17` |
| `--hero-ey-lh` / `--hero-ey-gap` | 12 / 15 | same | the eyebrow |
| `--hero-title-size` | 44px | 50px | the title |
| `--hero-by-gap` / `--hero-by-lh` | 12 / 26 | same | the byline |
| `--hero-act-gap` / `--hero-act-h` | 24 / 46 | 40 / 46 | the row gap, the buttons |
| `--hero-stack-h` | 179 (computed) | 201 | the sum of the stack's parts |
| `--hero-art-x` / `-ratio` / `-gap` | 14 / 1.123 / 28 | same | `contactV182.css` |
| `--hero-art-h` / `--hero-art-w` | the stack's height / height × ratio | same | the archivist |
| `--hero-text-x` | art-x + art-w + gap = 243 | 267.7 | H5 |
| `--hero-right-w` | 332 | 370 | the v1.1 mock (see §1) |
| `--hero-frame-x` | (sheet − hero-w) / 2 | same | where a hero frame starts |

## 4. What changed, phase by phase

| Phase | Commit | Page | What moved |
|---|---|---|---|
| refs | `63acc34c` | — | v1.1's mock and six screens enrolled |
| 1 | `92f277d0` | Contact list | Every constant replaced by its token; **nothing moved** (0 differences at four widths) |
| 2 | `559afa5c` | Query Centre | Stage-tab row unrendered (`GlyphRow` kept). Top 14 + row + 22 → 36. Hawk: a 250 / 190 grid item → laid out as the archivist (14, stack-tall, contained, anchored left). Text 242 / 302 → 243. Actions 22 → the act gap. Chart minmax(260, 420) → 332 / 370, stack-tall, centred. Gap 54 → 44 |
| 3 | `b93fd9b2` | Analytics | Header from the column (41 / 48.4 / 204, 44 / 40 padding, a rule beneath) → `--hero-w` centred, no padding, no rule. Eyebrow line 18 → 12. Title 40 / 50 / 56 (by viewport) → 44 / 50 (by the shell switch), line-height 1.12 → 1. Card → the shared inset and `--hero-right-w`, centred and overhanging. Desk 56 → 44 below the stack |
| 3 | `db6fe946` | Responses | Top 30 → 36. Text from the inset → 243 / 267.7. Card from the column's edge → the inset, centred. Wrapping flex row → grid. Carousel 44 by token |
| 3 | `f2985922` | Discover (live) | As Analytics, plus the PRO tag held in a 12px eyebrow box, and the "how it works" link hanging in the gap. `workspacePageGrid.test.tsx`: `.dv1-hd` leaves the "nothing states a width" chain, with the reason |
| 3 | `2b2478b5` | Packages | Top 30 → 36. Text → 243 / 267.7. Card on the shared inset, centred. Filter row 26 → 44 below the stack |
| 3 | `81b97c1c` | To-do list | As Packages. The calendar is stack-tall by construction, so it takes no overhang. The title no longer steps down (decision 5) |

## 5. Before and after

### Before (the base build, `index-DSAY7Z_7.js`)

| Page | Width | Eyebrow (l, t) | Title (t, size) | Actions (t, b) | Art (l, t, w, h) | Right inset | Content top |
|---|---|---|---|---|---|---|---|
| Contact list | 1280 | 243, 36 | 63, 44 | 169, 215 | 14, 36, 201, 179 | 64 | 259 |
| Contact list | 1512 | 243, 36 | 63, 44 | 169, 215 | 14, 36, 201, 179 | 178 | 259 |
| Query Centre | 1280 | 242, 92 | 119, 44 | 223, 269 | 30, 97.1, 190, 174.9 | 64 | 323 |
| Query Centre | 1512 | 302, 93.5 | 120.5, 44 | 224.5, 270.5 | 30, 72, 250, 230.1 | 178 | 326.1 |
| Analytics | 1280 | 41, 44 | 76, 40 | 187.4, 234.6 | – (none) | 41 | 331.6 |
| Analytics | 1512 | 68, 44 | 76, 50 | 198.6, 252.2 | – (none) | 68 | 349.2 |
| Responses | 1280 | 64, 30 | 57, 44 | 163, 209 | – (none) | 528.4 | 470.6 |
| Responses | 1512 | 178, 38.3 | 65.3, 44 | 171.3, 217.3 | – (none) | 24 | 269.6 |
| Discover (live face) | 1280 | 41, 44 | 76, 40 | 188.8, 236.8 | – (none) | 41 | 346.8 |
| Discover (live face) | 1512 | 48.4, 44 | 76, 50 | 200, 248 | – (none) | 48.4 | 358 |
| Submission packages | 1280 | 64, 30 | 57, 44 | 163, 209 | – (none) | 64 | 294 (body); filter row 235 |
| Submission packages | 1512 | 178, 30 | 57, 44 | 163, 209 | – (none) | 178 | 294 (body); filter row 235 |
| To-do list | 1280 | 64, 30 | 57, 44 | 163, 209 | – (none) | 64 | 316 (sheet); filter row 235 |
| To-do list | 1512 | 178, 30 | 57, 44 | 163, 209 | – (none) | 178 | 316 (sheet); filter row 235 |
| Dashboard | 1280 | 34, 20.8 | 40.8, 44.8 | 48.7, 88.7 | – (none) | – (none) | 134.2 |
| Dashboard | 1512 | 50, 23.4 | 43.4, 50.4 | 54.1, 96.1 | – (none) | – (none) | 146.6 |
| Manuscripts | 1280 | – (none) | 76.9, 50 | 189.1, 233.1 | – (none) | 98 | 348 |
| Manuscripts | 1512 | – (none) | 76.9, 50 | 189.1, 233.1 | – (none) | 105.4 | 360 |
| Comparable titles | 1280 | 41, 44 | 76, 40 | 187.4, 234.6 | – (none) | 41 | 351.7 |
| Comparable titles | 1512 | 48.4, 44 | 76, 50 | 198.6, 252.2 | – (none) | 48.4 | 369.3 |
| Calendar | 1280 | – (none) | 57, 50 | 130, 174 | – (none) | – (none) | 210 |
| Calendar | 1512 | – (none) | 57, 50 | 130, 174 | – (none) | – (none) | 210 |
| Corkboard | 1280 | – (none) | 83.3, 34 | – | – (none) | 98 | 310 |
| Corkboard | 1512 | – (none) | 108.2, 34 | – | – (none) | 105.4 | 310 |

### After (the branch build): every in-scope page against the oracle

Oracle at 1280: eyebrow 243, 36 · title 63, 44 · actions 169, 215 · art 14, 36, 201, 179 · right inset 64 · content 259. At 1512 the same, with the right inset 178. **Bold** marks a value off the oracle. Every one comes from the stack growing: a long title wrapped beside the card (decision 5), and at 1280 the buttons too (§1). The eyebrow, the text column, the right inset and the 44 gap hold everywhere.

| Page | Width | Eyebrow (l, t) | Title (t, size) | Actions (t, b) | Art (l, t, w, h) | Right inset | Content top | Content − stack |
|---|---|---|---|---|---|---|---|---|
| Contact list | 1280 | 243, 36 | 63, 44 | 169, 215 | 14, 36, 201.1, 179 | 64 | 259 | 44 |
| Contact list | 1512 | 243, 36 | 63, 44 | 169, 215 | 14, 36, 201.1, 179 | 178 | 259 | 44 |
| Query Centre | 1280 | 243, 36 | 63, 44 | 169, 215 | 14, 36, 201, 179 | 64 | 259 | 44 |
| Query Centre | 1512 | 243, 36 | 63, 44 | 169, 215 | 14, 36, 201, 179 | 178 | 259 | 44 |
| Analytics | 1280 | 243, 36 | 63, 44 | **213**, **317** | – (none) | 64 | **361** | 44 |
| Analytics | 1512 | 243, 36 | 63, 44 | **213**, **259** | – (none) | 178 | **303** | 44 |
| Responses | 1280 | 243, 36 | 63, 44 | **257**, **359** | – (none) | 64 | **403** | 44 |
| Responses | 1512 | 243, 36 | 63, 44 | **213**, **315** | – (none) | 178 | **359** | 44 |
| Discover (live face) | 1280 | 243, 36 | 63, 44 | **213**, **259** | – (none) | 64 | **303** | 44 |
| Discover (live face) | 1512 | 243, 36 | 63, 44 | 169, 215 | – (none) | 178 | 259 | 44 |
| Submission packages | 1280 | 243, 36 | 63, 44 | **213**, **315** | – (none) | 64 | **359** | 44 |
| Submission packages | 1512 | 243, 36 | 63, 44 | 169, 215 | – (none) | 178 | 259 | 44 |
| To-do list | 1280 | 243, 36 | 63, 44 | 169, 215 | – (none) | 64 | 259 | 44 |
| To-do list | 1512 | 243, 36 | 63, 44 | 169, 215 | – (none) | 178 | 259 | 44 |

## 6. Pages left alone, and their deviations from the rules

| Page | Why | Deviations (1512) |
|---|---|---|
| Dashboard | Report-only: one row, not a stack (buttons to the right at the title's height; no art; no right item) | Eyebrow 50, 23.4; title 50.4px at 43.4; buttons at 54–96 beside the title; no gap rule |
| Calendar | Report-only: title and actions only (no eyebrow, no byline) | Title at 57, 50px; actions 130–174; content at 210 |
| Corkboard | Report-only: no eyebrow; its art is a right-hand disc | Title at 108, 34px; content at 310 |
| Discover (coming soon) | Report-only: the face dev shows is a navy feature panel (lede, right-hand disc) | Held by HR1-8 |
| Manuscripts | Out of scope (`src/components/manuscripts/**`) | No eyebrow; title at 76.9, 50px; actions 189–233; right inset 105.4; content 360 |
| Comparable titles | Out of scope (`src/components/manuscripts/**`) | Eyebrow 48.4, 44; title 76, 50px; actions 199–252; right inset 48.4; content 369.3 |

**One decision for Nick, about every page with a card wider than the Contact list's.** Beside a 332–432 card, the compact column (900 wide, the text starting at 243) can't hold a long title or two buttons on one line. The rules as written make them wrap, and those heroes are taller at compact widths. The ways out:
- shorter titles or button labels;
- narrower cards;
- the text sliding left on pages with no art (decision 1 says it doesn't).

## 7. Locks: HR1

`tests/e2e/hr1.measure.ts` runs one collect pass (seven pages at four widths, each opened once). HR1-1 to HR1-7 assert against it, each into its own ledger. HR1-8 is a separate case. The breaks are in `tests/e2e/hr1Mutate.sh`, and each break's first red line is in `mutations.jsonl` beside this report.

| Lock | Base (bbd9f309) | Break → first red | Green (branch) |
|---|---|---|---|
| HR1-1 oracle | green 28/28 (the base is its reference; proved by its break) | `hero-top-plus-6` → HR1-1 · contacts 1280 eyebrow (l, t) — 243.02,42 vs 243,36 | 28/28 |
| HR1-2 top | red 56/84: queries 1280 eyebrow top 36 — 92 | `stage-tabs-back` → HR1-2 · queries 1280 eyebrow top 36 — 114 | 84/84 |
| HR1-3 column | red 40/84: analytics 1280 eyebrow left on H5 — 40.95 vs 243 | `responses-left-hardcoded` → HR1-3 · responses 1280 eyebrow left on H5 — 64 vs 243 | 84/84 |
| HR1-4 art | red 20/32: queries 1280 art left 14 — 30 | `art-plus-20` → HR1-4 · queries 1280 art bottom = stack bottom — 235 vs 215 | 32/32 |
| HR1-5 right | red 67/96: queries 1280 width is --hero-right-w — 285.63 vs 332 | `right-pinned-to-gutter` → HR1-5 · packages 1280 right inset on H6 — 24 vs 64 | 96/96 |
| HR1-6 gap | red 61/84: queries 1280 content − stack bottom = 44 — 54.00 (content 323, stack 269) | `gap-54` → HR1-6 · analytics 1280 content − stack bottom = 44 — 54.00 (content 371, stack 317) | 84/84 |
| HR1-7 pairs | red 16/32: contacts/discover 1280 eyebrow identical — 243.02,36 vs 40.95,44 | `discover-title-plus-4` → HR1-7 · contacts/discover 1280 title identical — 243.02,63 vs 247.02,63 | 32/32 |
| HR1-8 untouched | the base is its reference (captured from it); proved by its break | `out-of-scope-moved-6` → HR1-8 · manuscripts 1280 [data-ms21='header'] — 289,133.8,942.1,260 vs 289,111.8,942.1,260 | 66/66 |

**HR1-9 (the other suites) runs on the integration build (§8).** The baseline for it is the 13 suites listed in §2, all green on the base.

## 7a. Screenshots

`shots/`: each in-scope page at 1280 and 1512, with the rule lines drawn from the rules (not from the elements), so a page off the rules shows the gap.

## 8. Integration and dev

DEPLOY
