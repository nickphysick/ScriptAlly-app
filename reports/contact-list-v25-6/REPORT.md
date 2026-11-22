# Contact list v25.6: the list pins with a gap, List health in navy with a coloured ring, and typewriter menus

## The revised pack, first

- **An earlier draft of v25.6 had a List health ring in the navy bar. That draft was never on dev**, but it was built and committed on this branch (`23611713`).
- The revised pack takes the ring out, so `2df50c9a` removes it. H5 was rewritten to lock its absence, and H4 now reads the two rings that remain.
- The history keeps both commits; the bar ends up as it was before v25.6.

## False premises

1. **"Placeholders (genre search in Filters)".** The Filters panel has no genre search field: genres are a list of chips. There is no placeholder to restyle.
2. **"Also the Query Centre's list if it shares the sticky rule".** It doesn't.
   - The Contact list's bar sticks through its own `.cl24-*` rules.
   - The Query Centre's bar has its own rule, so it didn't change.
3. **"Every list health ring … Housekeeping's ring (on light, or on its ink header as built)".**
   - Housekeeping's ring is `HeadRing` on its ink header, so it takes the on-navy colours.
   - The only ring on a light background, `ContactSummaryCard` (in `ContactLightHeader`), is mounted nowhere on a live page.
   - So no live surface shows the light colours. The unit lock on `ringColours` holds them.
4. **"Full screen is unchanged".** This holds: full screen is its own list with its own bar.
5. **H5's "red first" cannot come from the base for the bar check itself.** The base bar never had a ring, so "no list health in the bar" is already true there.
   - On the base, H5 is red only on pinning; the bar-ring check stays green.
   - Its mutation (a ring injected into the bar) is what proves the bar check can go red.

## Base

- **Built on:** `eced7acd`, the then-tip of the dev stack, `…-cl254-cl255-db105-pk38`. It carries Contact list v25.5 (CL255).
- **Dev moved during the run** to `…-pk38-pk39-db116` (568a3056, `index-CCukoHg6.js`). That branch contains `eced7acd`, so it was used as the integration base.

## Commits (branch `contact-list-v25-6`)

| Commit | Part |
|---|---|
| `54abb39d` | Enrol the reference; all seven SHA256s matched |
| `57553bfc` | A · pinning with a gap |
| `05eb6c01` | B · four equal cells, foot lines, navy List health |
| `23611713` | C · `healthTone` (plus the bar ring the revised pack removed) |
| `df3ee9e1` | D · typewriter menus |
| `2df50c9a` | C (revised) · no ring in the navy bar; the dev-only score stub |
| `47d88af3` | B (follow-up) · the Filters panel stays inside the window |
| E | Locks, CLAUDE.md, this report |

## Per part

### A · Pinning
- **The strip:** the bar sits in `.cl256-pin`, a sticky strip in `--ws-page` (`margin-top: -12px; padding-top: 12px; top: 0`).
  - When pinned, the strip fills the 12px above the bar.
  - Its `::before` runs 14px past the sheet on each side.
  - The bar's rounded top corners show the page colour behind them.
- **The sheet's clip:** the sheet clips (`overflow: clip`), so it takes `overflow-clip-margin: 14px`. In Safari, which ignores that property, the overhang falls back to the sheet's own width.
- **What pins below it:**
  - the column headings at 64;
  - the group header at 110;
  - Cards' group heads at 64.
- **At rest:** the strip sits under the sheet's own rounded clip, so nothing moves when the bar pins. H1 checks this in 13 steps across the moment of pinning.

### B · At a glance
- **Cells:** four equal cells, 300px each at 1512 and 244 at 1280.
- **Foot lines:** from the pure `glanceFeet` (`src/lib/contactV256.ts`, unit-tested):
  - not queried: "{n} want {genre}s", using the book's first genre, or "{n} with genres on file" when the book has none;
  - querying: "{n} waiting on you";
  - closed: "{n} passed";
  - List health: "{n} gaps to fill →".
  - A foot line whose number is zero is not drawn.
- **The List health cell:**
  - navy `#2a3a52`, hover `#24334a`;
  - cream label and count, swatch `#e0a188`, the count at 44 (36 at ≤1440);
  - a click opens Housekeeping; it never filters and is never pressed.
- **Follow-up:** the foot lines lower the list bar by 29px. The Filters panel opened below its button with no height cap, so its last option, "Missing details", ended up under the window's bottom edge at 1512 × 900 (CL254-F6 caught it). The panel now takes ListPills' cap and scrolls inside itself.

### C · `healthTone`
- **The functions:** `healthTone(pct)` and `ringColours(pct, "light" | "navy")`, unit-tested at 79/80 and 59/60. The colours are set inline, so no older `stroke` rule can outrank them.
- **No ring in the navy bar.**

### D · Typewriter menus
- **Which menus:** Filters, group and sort.
- **Type:** every word in Special Elite, upright; options 15, counts 13.5, buttons 14.5.
- **Section headings:** mono caps. The group menu's heading moved to mono.
- **The Query Centre:** the sort menu is the shared `SortChipMenu` (`shell/sortChip.css`), so its sort menu changed too. Its italic note is now upright.
  - QC150 and QC1501 still pass.

## Ring mounts changed

| Mount | Background | Colours |
|---|---|---|
| `HealthRing` in At a glance (`ContactGlance251`) | navy | navy |
| `HeadRing` in Housekeeping's header (`HousekeepingDrawer`) | ink | navy |
| `HealthRing` in `ContactSummaryCard` (`ContactLightHeader`) | light | light (mounted nowhere live) |

- **Removed:** v25.1's override that painted the ring's track `#e6c9bd`.
- **Untouched:** the To-do tray's `ClearedRing`, which is not a list health ring.

## Decisions made

- **The pin is a strip, not `top: 12px` on the bar.** A bar stuck at 12 with rounded corners would show rows passing behind those corners.
- **"Passed" means a close by Rejected only.** A No Response or Withdrawn close is not a pass.
- **Plurals:** "{genre}s" pluralises single-word genres only. Labels of two or more words, or ending in s, are left as they are. The verb is "wants" when n is 1.
- **The List health foot line** is hidden at zero gaps, like the others.
- **A dev-only stub, `window.__SA_CL_HEALTH = n`,** sets every ring to that score. It is checked against the build mode at the call site in AgentList, and the production bundle does not contain it.
  - It exists because one account cannot show 93, 72 and 44 at once.
  - The dev shots below use it.
- **Special Elite has one weight,** so the chosen option in a menu is marked by its tick, not by bold.

## Locks: CL256 (1512 × 900 and 1280 × 800, with the shell)

| Lock | v25.6 | Base `eced7acd` | Own mutation |
|---|---|---|---|
| H1 pin | 24/24 | 8 red (bar pins flush, 0.0) | red (`top: -12px`) |
| H2 cells | 24/24 | 8 red (no foot lines) | red ("0 passed" shown) |
| H3 navy | 10/10 | 2 red (cell is white) | red (a click filters) |
| H4 tone | 18/18 | red (old colours, no stub) | red (navy arc) |
| H5 bar clear | 26/26 | 2 red (no gap when pinned; see false premise 5) | red (ring in the bar) |
| H6 menus | 10/10 | 4 red (serif options) | red (Georgia) |

Every lock checks that it found something to measure before it makes its claim.

## L1

Run on the v25.6 build (`127.0.0.1:4561`); reds compared against the base `eced7acd` (`:4562`).

| Suite | v25.6 | Notes |
|---|---|---|
| CL255 | 6 of 7 | G3 is red on the base too: "0 long stories" means the account has no query history of three or more steps. It's a fixture gap, not v25.6. |
| CL254 | 7 of 7 | F6 went red first ("Missing details" fell under the window's bottom). Fixed in `47d88af3`, not by a re-point. |
| CL253 | 3 of 3 | |
| CL251 | 6 of 6 | **Re-pointed:** A1's "rules between" accepts no hairline on cell 2, the cell beside the navy List health block (comment at the assertion). |
| QC150 | 25 of 25 | On integration L3-1280 was red once, read 54, then 34 rows, and passed on the second re-run: it varies between runs. |
| QC1501 | 15 of 15 | |
| QC1492 | 4 of 4 | |
| QC149 | L9 red in the full run, 3 of 3 alone | On the base it is red at L8 (count 202 against 122, the account moving), and L9 alone is red there too. It varies between runs, not a regression. |
| HR1 | 2 of 3 | HR1-8 (the phone on `/agents`) is red on the base too. |

On the integration build all of CL256 is green again (7 passed), with the same three reds above (CL255 G3, and QC150 L3-1280 once).

## Dev shots

| Reference | Dev |
|---|---|
| `screens/01-glance-93-1512@2x.png` | `screens/01-glance-93-1512.png` |
| `screens/02-glance-72-1512@2x.png` | `screens/02-glance-72-1512.png` |
| `screens/03-glance-44-1512@2x.png` | `screens/03-glance-44-1512.png` |
| `screens/04-glance-93-1280@2x.png` | `screens/04-glance-93-1280.png` |
| `screens/05-pinned-1512@2x.png` | `screens/05-pinned-1512.png` |
| `screens/06-pinned-1280@2x.png` | `screens/06-pinned-1280.png` |

- **Where they come from:** the dev shots are from dev itself (`SA_E2E_BASE_URL=dev`). The scores are set with the dev-only stub.
- **The reference screens still draw the bar ring the revised pack removed,** so the bar differs from the reference there and nowhere else.

## Integration and deploy

- **Integration branch:** `dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4-cl252-pk40-cl253-db93-cl254-cl255-db105-pk38-pk39-db116-cl256`.
  - Cut from what dev served, `…-pk38-pk39-db116` (568a3056, `index-CCukoHg6.js`).
  - Merge `24b65589`; pushed.
- **Gates on it:** tsc clean; both builds clean; Vitest at baseline (the same three files red: `functions/eval/run.test.ts`, `functions/src/email.test.ts` and the `smartImportCore` 32k test).
- **Deploy:** hosting only, from a clean worktree, with `--config firebase.dev.json --project scriptally-dev`.
- **Dev serves `index-C8Z6nkdu.js`.**
- `contact-list-v25-6` is pushed. **Nothing merged to main.** No rules or functions deployed.
- **Worktrees:** `ScriptAlly-cl256`, `ScriptAlly-cl256base` and `ScriptAlly-cl256int` were removed when the run ended.

## For Nick

- **The shared harness account changed while I took the shots:** 53 agents in the first, 87 in the third, with the To-do count moving too.
  - Another session was writing to it.
  - The figures in the shots are real but not stable, and the foot lines change with them.
- **The base worktree was deleted mid-run by something outside this session.**
  - A `cd` into it then failed, and one `build:dev` ran in the primary checkout.
  - It rewrote only that checkout's ignored `dist/`; no tracked file changed.
  - Worth knowing if anything there looks newly built.
- **Safari:** the pinned strip's 14px overhang beyond the sheet relies on `overflow-clip-margin`, which Safari ignores. There, the mask is the sheet's own width. Rows still never show above the bar, but the strip doesn't reach past the sheet's edges.
- **The Query Centre's sort menu** shares `SortChipMenu`, so it is now typewriter, with its italic note upright.
