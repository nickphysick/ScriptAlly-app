# Contact list v27 — report

Ref: `design-refs/contact-list-v27/contact-list-v27.html`, SHA256 `39a52e92…2d432c` (verified; taken from
`~/Downloads/contact-list-v27-pack.zip`, enrolled in the design-ref watchlist).
Branch `contact-list-v27`, cut from `origin/dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53` @ `a000d7154`
(the line dev was serving: `index-DtjKHDsx.js`). Not merged.

## False premises (first)

1. **The ref was not in the repo.** `design-refs/contact-list-v27/` did not exist on the base. It was in
   `~/Downloads/contact-list-v27-pack.zip`; its SHA256 matched, so it was used and committed.
2. **"Same colours (`ring26Colours`)" contradicts the ref.** `ring26Colours` is the on-navy table (arc `#9fd0ad`,
   track cream at .16, which is all but invisible on the page colour). The ref draws the ring in the SAME table's
   light-ground tones, `RING_TONES[tone].light` (arc `#4e7d60`, track `#d6e4da` at "good"), which v25.6 already used
   on a light ground. Built to the ref; nothing new was added to the palette. The navy v26 header keeps
   `ring26Colours`.
3. **The ref's Querying tile is not the brief's sand.** The ref's CSS keys its tile colours on `data-c="agent"`
   while its markup says `data-c="agt"`, so its Querying tile falls back to `#f7f3ee`. The brief's `#efe7da` is the
   intent (and the Query Centre's own tile), and is what is built.
4. **The ref's bird is pre-flipped data; the app's asset faces left.** `discover-binoculars-bird.webp` looks left,
   so `transform: scaleX(-1)` turns it to the title, as the ref draws it.
5. **The worktree could not build on `main`'s `node_modules`.** The dev line added `@sentry/react`, which the
   primary checkout's `node_modules` lacks, and `tsc` ran out of heap at the default limit. Neither is in the
   repo. The worktree's `node_modules` is a directory of symlinks into the primary's plus `@sentry/*` installed on
   its own (the primary is untouched), and every gate runs with `--max-old-space-size=8192`.
6. **The production build holds no workspace CSS** (prod serves the landing only), so the Query Centre cascade
   proof uses `build:dev`.

## Step 0.4 — what "Where they stand" writes

The page's existing `sets` state in `AgentList.tsx` (`readonly SetKey[] | null`, keys `you · agent · none · closed`,
filtered by `inSet` over `AgentFacts.stand`). It is exactly "agents in group X", it already backs the applied row's
removable chip, and it is what the `?status=` deep link writes. No second filter model was added. A tile that is off
shows that group alone; pressing a tile that is on takes it out (a second click on the only one clears it).

## Phases

| Phase | Commit | Files |
| --- | --- | --- |
| 1 · header | `9184ff623` | `ContactHeader27.tsx`, `ContactHealth26.tsx` (lifted), `ContactHeader26.tsx`, `contactV27.css`, `qcv1531.css` (scope only), `AgentList.tsx`, `contactHeader27.test.tsx`, `inkShell.test.ts`, the ref + watchlist |
| 2 · rail | `393dcb17d` | `ContactRail27.tsx`, `lib/contactV27.ts` + test, `contactV27.css`, `qcv153.css` (scope only), `ContactSheet26.tsx` (Filters button and menu mount out), `AgentList.tsx` |
| 3 · list | `e94ca2b96` | `contactV27.css` (header top 24 → 30, the Query Centre's) |
| 4 · measure | the commit carrying this report | `tests/e2e/cl27.measure.ts`, `tests/e2e/cl26.measure.ts` (re-pointed), this report |

### How the Query Centre stays pixel-identical

The header and rail render the Query Centre's own classes. Their page-root rules in `qcv1531.css` and `qcv153.css`
named `.qc151 X`; the header and rail rules now name `:is(.qc151, .cl27) X`, which has the same specificity. Proved
on the bundle: HEAD's dev CSS (23,998 rules) and the new dev CSS are the same rule sequence, in the same order,
once `:is(.qc151,.cl27)` is mapped back to `.qc151`; the only additions are the rules that name `.cl27`,
`data-v27` or `data-ground`. Also looked at on dev after the deploy.

## Phase 4 — measured on the rendered page

All runs: `npm run e2e:emu` (the emulator's seeded harness account, 53 agents), project `measure`, one worker.

| Lock | What it holds | Green | Red-before (old page) | Red under its own break |
| --- | --- | --- | --- | --- |
| CL27-H1 | three columns, the bird `matrix(-1,0,0,1,0,0)` at 200px, Playfair 54 title, "you've queried N", both buttons with every hook | 18/18 | "no header" | `CL27_MUTATE=H1` (mirror removed): "mirrored — none" |
| CL27-R1 | rail 268, list 28 after it, sections in order, no Filters in the band, still in view after 1200px of scroll | 14/14 | "no rail" | `R1` (rail static): top −838 vs scroller 106 |
| CL27-R2 | every pressable control (4 picks, 4 tiles, all 4 genres on file, the switch): rows = its count = the band's count; a tile leaves only its group, a genre only its rows; Reset restores the whole list; a second tile click clears | 50/50 | "population: pressable controls — []" | `R2` (counts off by one): e.g. "pick:ready … 35 rows, control said 36" |
| CL27-R3 | the band holds at the scroller's top and the headings stick beneath it at 1512 and 1280 | 6/6 | green — v26 stuck too; a no-regression lock | `R3` (pin static): band at −827 vs 106 |
| CL26-H1, H2, H4, H10, H11 (re-pointed) | open header; ring in the light tones; band = count · Find · Group · Sort; the rail's quick picks; Missing details + a genre through the rail | all green (CL26 11/11 cases) | H1 "no header", H4 order still has "filters" | — |

Unit: `contactHeader27.test.tsx` (List health's markup equals v26's render; red when handed a different gap
count), `lib/contactV27.test.ts` (every count against `matchesContactFilters` + `inSet` over four states; red twice).
Ledgers: `ledger/` (`base-*` the old page, `mut-*` the breaks).

R2's first red-before attempt crashed on a missing tile instead of failing on its population reading; it now stops
and reports as soon as the rail has no controls.

### Gates (tsc / build / Vitest), baseline → after

| | Baseline (`a000d7154`) | After Phase 4 |
| --- | --- | --- |
| tsc | 2 errors, both `functions/` deps | same 2 |
| `vite build` / `build:dev` | clean / clean | clean / clean |
| Vitest | 5 failed tests in 8 files (5 `functions/` suites unable to load, `aiRefusal`, `emuGuard`, `firestoreTarget`) | 4 failed in 3 files (`functions/eval/generate`, `emuGuard`, `firestoreTarget`, all in the baseline) |

The drop is environmental: linking `functions/node_modules` for the harness login let the `functions/` suites load.

### Dev

Dev serves **`dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53-cl27-td54-cl27b`** (bundle `index-DIr9O0zd.js`):
the To-do v54 session's integration line (which had merged this branch at Phase 2) with Phases 3 and 4 merged on
top. Gates on that merge: tsc and `build:dev` clean, Vitest 4 failed in the same 3 pre-existing files.

⚠️ **A redeploy of mine briefly took To-do v54 off dev.** Phase 2 went to dev from this branch (`index-BZZ8fY_4.js`).
The To-do v54 session then merged it into its own line and deployed (`index-CnZfSAXv.js`). My Phase 3 redeploy printed
the served hash but did not stop on the mismatch, and replaced that build with this branch alone
(`index-CcU50SBC.js`) for about five minutes, until the merged line above went out. Nothing was lost (every branch is
pushed). The final deploy stopped on any served hash other than the one it was replacing.

Screens (emulator account): `shots/1512-top.png`, `shots/1512-scrolled-filter.png` (Ready to query on, scrolled
700), and the same at 1280.

## Deferred, named

- The rail's foot wraps to two lines once it reads "35 of 53 showing" (the ref only draws "41 showing"). Left wrapping.
- A genre's rail label takes the first spelling on file (as v26's Filters menu did), so the rail can say "Literary
  fiction" where a row says "Literary Fiction".
- `FilterMenu` (ContactFilters24.tsx) is mounted nowhere now; left in place as asked.
- Not merged to `main` or to a dev integration branch: dev serves this branch directly.
