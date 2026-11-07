# Page width v1 — one content column (desktop)

Branch `page-width-v1` (worktree `../ScriptAlly-pw1`), cut from the branch dev served at the start
(`dev/…-db22-ql1-rv2` @ `46a518151`, bundle `index-D4-_I14k.js`). **Not deployed. Not merged.**

Scope as ruled by Nick after the §0 recon:
- the shared rule stays at **1256**, not the pack's 1320;
- the Query Centre (and Responses, Analytics) go onto the shared rule;
- the gutter is **40** below the cap;
- the top bar and the corner tab are untouched;
- Contact list, Corkboard, Query letters and Versions also move onto the rule;
- Submission packages keeps its own width.

## False premises

1. **"The working pages sit in a centred 1100px column."**
   - Only the Query Centre was 1100 (`--qc151-w`).
   - Most pages were already 1256, from the shared `.wpg-scroll > *` rule (1360 box with a `clamp(28px, 3.2vw, 52px)` gutter inside it).
   - The rest set their own widths: Contact list 1216 (`min(S − 64, 1136) + 80`), Corkboard 1216 (a copy of that formula), Packages 1288 + 150px right padding, Query letters 1328, Versions uncapped.
2. **The tab already sits in the sheet's top-left corner** on every page at every size. W1 was green before any change, so its only red is its mutation.
3. **The gutter was not 40 everywhere.** `3.2vw` is 41 at a 1280 window but **48 at 1512**, open or collapsed.
4. **"Materials" and "Wall of no" are not pages.**
   - Materials is a sidebar section; its only route is Query letters (`/materials/letters`).
   - Wall of no is a section of Responses.
5. **Submission packages lives at `/queries/packages`**, not `/manuscripts/packages`.
6. **v152.2 was not running alongside.** Its tip was already inside the branch dev served, so this pack stacked on it.
7. **The Contact list's width did not come from `contactV25.css`.**
   - That file's `--cl25-w` is not in the bundle at all: its importers (`ContactHeader24`, `ContactListTitle25`) are unmounted.
   - The live rule is `contactV24.css`'s `--cl24-list`.
   - The CSS map (and my first edit) pointed at the dead file. The rendered measurement caught it.
8. **The To-do list never had the shared gutter.** `.tws { padding: 14px 0 24px }` is a 0-1-0 shorthand that zeroed the shared rule's `padding-inline`. Its workspace ran to 14px from the sheet's edge at 1512.
9. **`--wpg-measure` / `--wpg-gutter` are gone and `contentColumn.css` is dead.** CLAUDE.md still describes them as live.

## §0 answers (summary)

| Page | Before | After |
|---|---|---|
| Query Centre (+ Responses, Analytics under its tabs) | QC 1100 · Responses and Analytics 1256 | shared rule |
| Contact list | 1216 at 1920 (`contactV24.css`) | shared rule |
| Discover, Comparable titles | 1256 | shared rule (unchanged) |
| To-do list | 1336 at 1920, no gutter | shared rule |
| Corkboard | 1216 | shared rule |
| Versions | uncapped (1760 at 1920) | shared rule |
| Query letters (outside the grid) | 1328 | reads the two tokens |
| Submission packages | 1288 + 150 right | **own width (kept)** |
| Dashboard, Manuscripts, Settings, Help, Plans | own | **own width (kept)** |

- **Top bar:** owned by `WorkspaceShell.tsx:1276–1395`. `FolderTab` is absolute at `left: 0` (`inkShell.css:101`), followed by a spacer and the Search / Log a query / help group. It is untouched.
- **Right rails:** none sits beside a page column. The To-do tray (340) is inside its card.

## Commits

- **`2c305757e`** — §1.
  - `--page-cap: 1256px` and `--page-gutter: 40px` in `workspacePageGrid.css`, read by the three rules that state the column.
  - The per-page caps above are removed.
  - `workspacePageGrid.test.tsx` is re-pointed from the literals to the tokens.
- **`36073b397`** — the locks.
  - `tests/e2e/pageWidth.measure.ts` (W1–W4, W6) and `src/test/pageWidth.test.ts` (W5).
  - The design refs (hashes verified against the pack).
  - Four locks re-pointed (W7, below).
- §2 (the top bar) has no commit: there is nothing to change.

## Locks — red, then green

Rendered on the emulators at 1280 × 800, 1512 × 900 and 1920 × 1080, sidebar open and collapsed. Ten pages are on the rule; six own-width pages get W1 and W6 only.

| Lock | Mutation (`PW1_MUTATE`) | Red | Green |
|---|---|---|---|
| W1 tab in the corner | `indent` — tab `left: 40px` | 30 reds ("tab left 288 vs sheet 248") | all sizes |
| W2 one width | `banner` — blocks `margin-inline: -20px` | 14 W2 reds (".qc151 268–1252 vs column 288–1232") | all sizes |
| W3 cap | `cap1100` — `--page-cap: 1100px` | 10 reds at 1920 collapsed ("column 1100 vs 1256") | 1256 ±1, margins equal |
| W4 gutter | `gutter24` — `--page-gutter: 24px` | 10 reds at 1280 open ("gutters 24/24 vs 40") | 40 ±1 below the cap |
| W5 token (unit) | 1100 re-added on the Contact list; the To-do `padding` shorthand restored | each red ("--cl24-list: min(…, 1100px)" / "padding: 14px 0 24px") | 4/4 |
| W6 no overflow | `row1500` — row blocks `min-width: 1500px` | 5 reds ("horizontal overflow 516") | no sideways scroll, no wrapped row button |

Final green: `7 passed` (setup + six sizes). Natural reds on the base build, from the §0 probe: the Query Centre at 1100 against 1256 (W3), and 48px gutters at 1512 (W4).

Lock fixes made along the way:
- The column is now found structurally: the content box of the scroller's child that holds the page.
- W6 ignores whole-row buttons that stack blocks on purpose.
- Waits target the visible copy of a page, because every page stays mounted.

## W7 — existing locks

Re-pointed and named:
- `qc151` L1 (was `min(S − 80, 1100)`; its mutation now states the width because `--qc151-w` is retired);
- `cl25` D1 (was `min(S − 48, 1200)`);
- `pageHeaderV1` §2 (gutter 40, box 1336; was the clamp and 1360);
- `pageHeaderV2Lib`'s column finder (1336).

**Not run:**
- The 24 existing page suites, and the four re-pointed ones on the rendered page. The run was stopped because it, plus two other sessions' emulator and type-check runs, made the laptop unusable.
- tsc and the full Vitest suite on the committed tree.

What was run:
- The two width test files: pass.
- The re-pointed `workspacePageGrid.test.tsx`: passes.
- tsc on the same change before committing: clean.
- One `build:dev`: clean, no warnings. `index-CTDnKqT9.js` carries `--page-cap: 1256px` and `--page-gutter: 40px`.
- The baseline's own two `firestoreTarget` failures (the Contact list seed scripts) are unchanged.

## Screens

`screens/qc-{open,col}-{1280,1512,1920}.png` and `screens/cl-…`, beside `design-refs/page-width-v1/screens/D-*`. At 1920 the Query Centre's column is 1256 and centred with equal margins, matching D's geometry at the ruled cap.

## Not done, and why

1. **Dev deploy — stopped.**
   - Dev moved while this ran: it now serves `index-DKTpyp9P.js`.
   - Two other sessions have each cut their own integration branch off the same base: `…-rv2-qc1522c` (pushed; very likely the one served) and `…-rv2-td52` (unpushed).
   - None contains the others, so whichever deploys last removes the other two from dev.
   - Needs one combined branch, or an order.
2. **⚠️ RULED (Nick, 7 Nov): THIS PACK OVERRIDES To-do v52's page width.**
   - The To-do list follows the shared 1256 rule like every other page.
   - v52's own `.tws` column (centred, **1320** cap, on `…-rv2-td52`) goes.
   - **To-do v52's report must be re-pointed:** its Part A "one centred column … with a 1320 cap" no longer stands, and any v52 lock asserting 1320 for `.tws` re-points to the shared column.
   - W5 holds it: `src/test/pageWidth.test.ts` lists `todoWs.css`'s `.tws` among the on-rule roots. Any width, `--hsheet-w` term or horizontal padding there fails the test, so v52's version cannot land unnoticed. The rendered W2–W4 also measure `/todo`.
   - When the two branches meet, `todoWs.css` conflicts; resolve it to this pack's `.tws { padding-block: 14px 24px; … }` with no width of its own.
3. **Row button overhang, Query Centre at 1920.**
   - The longest row buttons ("Send your revision →") overhang the list card's right edge by about 8px.
   - Not yet checked against the base build.
4. **The worktree stays** until the deploy is settled. It holds the built `dist/` for it.
