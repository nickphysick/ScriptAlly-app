# Phone Birds-eye world v1 — the zoomable finish line

Branch `phone-birds-eye-world-v1`, cut from `origin/main` 7f70f99f7. Not merged. Dev: **https://scriptally-dev.web.app** → Queries → Birds-eye (or `/queries/all?view=birds`; add `&be=calendar` or `&hawk=0` to compare). Served bundle `index-Bo4vXLoW.js` (the world is in `AppRoot-Bhgm9Zgk.js`), built from a clean checkout of the pushed tip f5b4a04db. Before the deploy, dev served `index-rr5EuPKO.js` (`app-site-v1` @ 0c4bad1c3), which is an ancestor of this branch.

## False premises (first)

1. **Local `main` was 1,859 commits behind `origin/main`** and had no phone v5 at all (no BirdsViewV5). The worktree was re-cut from `origin/main` 7f70f99f7, level with it (0 behind).
2. **844 × 390 is the desktop layout here.** 844px is above the 768px breakpoint, as PA5-8 already records. The landscape lock runs at **740 × 360**, and BW-10 records the 844 premise as a reading.
3. **`npm run build` is the landing-only build** (419 modules). It never compiles the phone code. The deploy's `build:dev` (the app) was also run and was clean.
4. **The ref's maths cannot reach its own Timeline level on a real campaign.** Its `fitS = min(width fit, height fit)` and fixed MAXZ 6.5 suit its 22 rows. On the harness (70 live queries) time was squeezed into a third of the screen and rows topped out at about 72px. Three departures, each commented where it is made in `src/lib/birdsWorld.ts`:
   - Time keeps the width fit and rows take the height. The ref's own comment says "time keeps the width fit".
   - The zoom ceiling keeps the ref's 1.3× headroom over 100px rows. It is 6.5 on the ref's data; on the harness's 70 rows it rises to about 19.
   - A **30px floor under group gaps**. At 70 rows the fitted gap fell to 6px and the headings overlapped.
5. **The ref's axis extent is fixed** (−140…+70 days, or −180…+60 on the calendar). An early build widened it to the data, and one two-year-old harness query stretched the ruler to −132 weeks. It is back to the ref's extent; bars past it are held at the edge, as the ref's `wxd` does.
6. **The ref's replay button does nothing**, and the ref has **no "No date" group**. Both are built to the prompt's words.
7. **In the ref the hawk sits *under* the header** (the header is z 7 outside the isolated `.vp`). The prompt puts it over the header, so the build does that: the world layer is not isolated, and the hawk is z 8 at the root.

## Gates: baseline vs final

| | Baseline (before any edit) | Final (f5b4a04db) |
|---|---|---|
| `npx tsc --noEmit` | exit 134: JavaScript heap out of memory at the default 2 GB. With `NODE_OPTIONS=--max-old-space-size=8192`: exit 0. The first run also had 7 TS2307 errors in `functions/`, from the missing `functions/node_modules` link | exit 0 (8 GB heap) |
| `npm run build` | exit 0, `✓ built in 1.76s` | exit 0, no error or warning lines |
| `npx vitest run` | `Test Files  10 failed \| 960 passed \| 1 skipped (971)` · `Tests  1 failed \| 13608 passed \| 4 skipped (13613)`. All 10 were the worktree's missing `functions/node_modules`; once linked, those 37 files passed | `Test Files  972 passed \| 1 skipped (973)` · `Tests  13801 passed \| 4 skipped (13805)` |

## Commits

| Phase | Commit | Files |
|---|---|---|
| 1 — refs and the engine | da1ca5d5e | `design-refs/phone-birds-eye-world-v1/` (HTML, 13 shots, SHA256SUMS; all 14 verified), `design-refs/.refhashes.json`, `src/lib/birdsWorld.ts`, `src/lib/birdsWorld.test.ts` |
| 2 — the world | bef56a449 | `src/components/phone/birds/{BirdsWorld.tsx, drawWorld.ts, birdsWorld.css, birdsWorldSmoke.test.tsx}`, `src/lib/birdsWorld.ts` + test |
| 3 — movement, controls, the hawk | 5e42ef6f5 | `src/components/phone/birds/{worldMotion.ts, BirdsWorld.tsx, birdsWorldSmoke.test.tsx}` |
| 4 — mounted, locks, screenshots | f5b4a04db | `QueriesV4.tsx`, **`BirdsViewV5.tsx` deleted**, `phoneV5.css` (its block), `phoneV5Smoke.test.tsx`, `stageColours.test.ts`, `phoneStyleTokens.test.ts`, `tests/e2e/{phoneBirdsWorld,phoneAppV5,phoneStyle}.measure.ts`, the engine and CSS fixes measured on the harness, `reports/phone-birds-eye-world-v1/` |

## What was built

- **Engine** (`lib/birdsWorld`, pure). Rows come from `eyeRows` → `beLine` (`past` + `cur`), read in whole days. The ref's `layout`, `yOff`/`yWorld`, `rowPx`/`gapPx`, `SX`/`SY`, `fitS`/`fitSY`, `zT`, `clamp`, `fitView`, `topFor`, `rowSegs`, `num`, `SHORT`, `stageTx`, `rulerMarks`/`spaced` are ported. The groups:
  - **Past its date / Nearly there / Plenty of time**, by `kk`;
  - **Waiting on you**, `tileCourt` "you": a partial, full or revision asked for, or an offer;
  - **No date**.
  - `beGroups`, `phoneGroups` and the desktop are untouched.
- **Frame** (`drawWorld`, the ref's `draw()`). One string per frame into one absolutely positioned layer, in screen space with no CSS scale. User text is escaped. It covers every level, both axes, the Timeline level's in-bar words with `stageTx`'s drop order and edge-sticking, the hatch, the dashed still-to-come, the tick, the ruler, the line, and its edge-pinned pill.
- **View** (`BirdsWorld`). Portalled `.pa-layer`, z 40: over the page, under the dock (50) and the sheets (1000).
  - The navy header: "Birds-eye" plus back, List, replay and search. **Back and List are additions**, because the world covers the pushed header.
  - The four chips: `70 out · 47 past its date · 1 this week · 16 with you` on the harness.
  - It folds at z > 1.05, showing the chosen filter as one white chip.
- **Movement** (`worldMotion`, the ref's `wire()`): pinch, drag with pointer capture, the ×0.92 glide, a tap (260ms) that opens the Queries list's own query sheet (`openV3Query`), double tap ×2.2, Ctrl+wheel zoom, wheel pan, + / − (disabled at the limits), "See it all", the mini map, and the hint (key `bw1.hint.seen`). The pill glides the line back to 62% across.
- **Hawk**: `/images/hawk-shadow.png?v=1`, .10, mirrored, −8°, multiply, 300px, the 14s drift; it fades by z 1.6 and moves at 0.35× the pan. Off with `?hawk=0`.
- **Replay**: fit, then each row's stages are drawn in from its first date to today, in date order, over 1.8s. Any touch skips it; reduced motion never replays. v5's once-a-day auto-replay is retired from this view.
- **Landscape**: the header is folded and the dock hidden (v4.1's body class, kept).

## `&court=` values

- `you` → "with you".
- `quiet` → "past its date" (nearest).
- **`agent` has no matching chip: it shows everything.**

## Locks

### Added: `tests/e2e/phoneBirdsWorld.measure.ts`

Run with `npm run e2e:emu -- tests/e2e/phoneBirdsWorld.measure.ts --project pixel`. Green: **48 readings, 0 red**. Red-first: `BW_MUTATE=all`. Each mutation undoes its lock's fix on the rendered page and turned **its own** lock red; the summaries are in `ledger/mut-*.summary.json`.

| Lock | What it measures (390 × 784 at 2×; landscape 740 × 360) | Mutation → its own reds |
|---|---|---|
| BW-1 fitted overview | All 70 rows drawn and on screen, the last ending 0–24px above the dock, the pill visible, the header 140px | `.bw-vp` 220px taller → 2 (and 7 elsewhere: nothing fits) |
| BW-2 levels | At 30 / 56 / 84 / 100px rows: name · figure · sub line · in-bar words = 1000 / 1100 / 1110 / 1111; no chip or pill | figure and sub line hidden → 3 |
| BW-3 Timeline | A three-stage row: each bar's left edge within 2px of its date's x; its colour = `statusBand`; words follow `stageTx`; a date-only stage shows just the date | stage bars 6px off → 1 |
| BW-4 spacing | Fully zoomed: rows ≤ 100px, gaps ≤ 44px, the first heading within 16px under the ruler, the header 96px | rows 140px → 1 |
| BW-5 layers | `elementsFromPoint`: hawk over a heading; line over hawk; pill on top; + / − over the line; hawk opacity .10 | hawk z 3 → 1 |
| BW-6 line off screen | Panned past: "Reply due →" (or "← Reply due") at the edge, white with a navy ring; a tap glides the line back to 62%; no row opens | the ring removed → 1 |
| BW-7 anchoring | Ctrl+wheel and a two-finger CDP pinch keep the row under the pointer within 4px | the layer shifted 14px between readings → 2 |
| BW-8 reduced motion | Control first (drift, glide, replay all on); then reduce: no drift, a drag stops dead, replay never runs | drift forced back on → 1 |
| BW-9 copy | No "overdue" / "late" at any level | a heading set to "Overdue" → 1 |
| BW-10 landscape | 740 × 360: header 96px, no dock, every row fitted; 844 × 390 recorded as the desktop | dock forced on → 1 |

### Rewritten

- `phoneV5Smoke` Phase E now asserts that the list's switch lands on the world with the filter.
- `stageColours.test`: the world's bars read `statusBand`, replacing BirdsViewV5's line.
- `phoneStyleTokens.test` and `phoneStyle.measure`: the `--pa-inset-legacy` readers go from thirteen to twelve (`.pa5bv-xpi` deleted).
- `phoneAppV5.measure`:
  - PA5-9's view half reads the world's rows; at the fit every row is drawn.
  - The `recompute` and `overdue` mutations target the world.
  - The PA5-13 census exempts the world's ref-sized type and targets (12px ruler and pill, 32px chips, 40px header icons).
  - The group's floor goes 14 → 6.

### Retired with BirdsViewV5

PA41-8 (groups fold at five), PA5-8 (28px rows, 18 in sight, the fixed name column on a drag), PA5-6 in the view (notch and deeper segment; the world hatches instead), and the 184px landscape name column. Also the `v41rows` mutation, and the second PA5-6 population, which was read off the unfolded v5 rows. The old smoke for spans, folds and landscape names is gone too.

These retirements were **not re-run in the full `phoneAppV5` e2e suite this session.** Only the touched specs and the new suite were run. Its view group should be read on the next deploy batch.

## Screenshots: `reports/phone-birds-eye-world-v1/shots/index.html`

The build is shown beside the ref for 01–13, on the emulator harness at 2×. The differences that are not data:

- **Header**: the build adds back (‹) and List (☰).
- **Status bar**: the ref's 44px status-bar padding is empty navy in Playwright.
- **Overview**: 70 rows against the ref's 22. Rows are about 5px, and the gaps sit at the 30px floor. Many rows meet the left edge, because their stages start before −140 days and are held at the edge.
- **Shot 02** still shows the hint: the harness's no-op pan did not count as a touch. Shot 01 is the hint shot.
- **The edge colour** (#e2dbd0 in the ref) is the stage table's #dedbd5, and the glyph connector #c9c2b6 is also #dedbd5. The mini map is 16px round (ref 12px), and its frame and the ticks are square (ref 3px and 1px). The edge-pinned pill's ring is a 1.5px border, not an inset shadow. All of this is the phone sheet's ratchet (`phoneStyle.census`), which refuses those values in a new stylesheet.
- **Shot 11** opens the app's real query page (`openV3Query`), as the brief asks, not the ref's stand-in story sheet.
- **Fonts**: Special Elite is used where the ref fell back to Courier.

## For Nick's ruling

- **The axis default**: each query's reply date (built), or `?be=calendar` (today as the line, months on the ruler, a tick per reply date).
- **The hawk shadow**: on (built), or `?hawk=0`.
- **The No date group**: its rows line today up on the finish line on the reply axis. They have no reply date, so "Reply due" means nothing for them. They show their stages up to today, with no tick, hatch or dash, and the figure "No date". On the harness that is 20 queries. A ruling is needed on whether they belong in the world at all.
- **Replay as built**: fit, then the stages drawn in over 1.8s from the earliest first date to today; a touch skips it.
- Also flagged:
  - Back and List added to the ref's header.
  - The world's controls are under the 48px tap floor (ref sizes; PA5-13 exempts them).
  - `&court=agent` shows everything.
  - "Waiting on you" includes offers and revisions asked for (`tileCourt`), not only partial/full requests.
  - The four engine departures above.

## Housekeeping

- Worktree `/Users/nickphysick/ScriptAlly-bew1` and the deploy checkout are removed at the end of the session; see the wrap-up.
- `.env.local` and `node_modules` were symlinks, never copied.
