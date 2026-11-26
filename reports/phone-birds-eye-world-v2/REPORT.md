# Phone Birds-eye world v2: real dates, details in the bar, the new header, empty states and replay

Branch `phone-birds-eye-world-v2`, cut from `origin/phone-birds-eye-world-v1` (5bd46fcfc). `origin/main` had not moved past v1's base (7f70f99f7), so there was nothing to merge.

Not merged. Dev: **https://scriptally-dev.web.app** → Queries → Birds-eye (or `/queries/all?view=birds`).
- It serves `index-Bo4vXLoW.js` → `index-oHX2WygP.js`; the world is in `AppRoot-BAy9m6Fl.js`.
- It was built from a clean checkout of the pushed tip 89c15dcc6.
- Before the deploy, dev served v1's `index-Bo4vXLoW.js`, which this branch contains.

## False premises (first)

1. **The "Gone quiet after N weeks" default is 4 weeks, not 6.**
   - `lib/queryClock` sets `LEGACY_QUIET_DEFAULT = 4`, and `queryClock.test` locks it.
   - The harness has no setting of its own, so 4 applies.
   - The engine reads the setting; it never assumes 6. BW-8 sets 6 and then 3 through the emulator and puts the setting back.
2. **The closest zoom on a long campaign is weekly, not daily.**
   - The ref's ceiling is `maxZ = max(6.5, 48/(RH·fitSY)·2.6)`. On the harness (a year-long span, 70 open queries) that reaches weekly marks at 390px, because days need 24px each.
   - The day tier and its month pill are measured at 740 × 360, where they are reached. The 390 reading is recorded as weekly.
3. **The Queries list has no filter for queries with no reply date.** "Add dates" opens the Queries list (List view, All).
4. **With no queries at all, the Queries page never mounted the world.** Its own "Nothing sent yet" returned first. Fixed: the Birds-eye side now mounts the world, and the list keeps its screen.
5. **Where the brief's sources are:**
   - **The setting:** `workspacePrefs.clock.quietWeeks`, read by `quietWeeksOf(user)` (lib/queryState) and exposed to the phone by `useV3` as `quietWeeks`. It is counted from the reply date.
   - **Closing:** a closed query's closing date is its closed stage's start (`stageStartMs`; lib/qcSummary says never `lastMs`). Its outcome word is `STAGE_NAME` ("Passed", "Withdrawn", …), with "Closed with no reply" said as "No reply".
   - **The hawk head:** `/images/qc/be-hawk-head.png` exists and is read only.
6. **Two of the ref's own rules misbehave on real data.** Both were measured on the harness, and both are fixed and commented where they are made:
   - the name placed "just before a short bar" can run under that row's figure;
   - ruler marks can sit under the edge-pinned "Today →" pill.
7. **The ref's fit breaks on a long campaign.** Its own shot 12 shows the footer under the dock, and with small groups the headings overlap. Two departures, both in `lib/birdsWorld`:
   - v1's 30px floor under group gaps is kept;
   - the no-date footer keeps its real 52px out of the rows' share.

## Gates: baseline vs final

| | Baseline (before any edit) | Final (89c15dcc6) |
|---|---|---|
| `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` | `tsc exit 0` | `tsc exit 0` |
| `npm run build` | `✓ built in 1.84s`, exit 0 | exit 0, no error or warning lines |
| `npm run build:dev` | `✓ built in 26.67s`, exit 0 | exit 0, no error or warning lines |
| `npx vitest run` | `Test Files  972 passed \| 1 skipped (973)` · `Tests  13801 passed \| 4 skipped (13805)` | `Test Files  973 passed \| 1 skipped (974)` · `Tests  13803 passed \| 4 skipped (13807)` |

One full run on the way (before the last fixes) had a red in `marketingLinks.test` ("retired support address"). It passed alone and in the final full run. It reads every source file, and the Mac was under load at the time.

## Commits

| Phase | Commit | Files |
|---|---|---|
| 1 — refs and the engine | 51f86337e | `design-refs/phone-birds-eye-world-v2/` (HTML, 14 shots, SHA256SUMS; all 15 verified), `.refhashes.json`, `src/lib/birdsWorld.ts` + test, v1's engine parked as `birdsWorldV1.ts` (and the four consumers pointed at it) so every commit compiles |
| 2 — the frame | 18b00e16e | `drawWorld.ts` + `drawWorld.test.ts`, `birdsWorld.css`; v1's frame parked as `drawWorldV1.ts` |
| 3 — header, empty states, replay | b22777fdd | `BirdsWorld.tsx`, `birdsWorld.css`, `worldMotion.ts`, `birdsWorldSmoke.test.tsx`; **the parked v1 files deleted** |
| 4 — locks, screenshots | 89c15dcc6 | `tests/e2e/phoneBirdsWorld.measure.ts`, the fixes the rendered page found (`drawWorld.ts`, `birdsWorld.ts`, `BirdsWorld.tsx`, `birdsWorld.css`, `QueriesV4.tsx`) and their tests, `reports/phone-birds-eye-world-v2/` |

## What v1 built, and what survives

| File | In v2 |
|---|---|
| `lib/birdsWorld.ts` | Rewritten. Real dates only; the reply-date axis, the blend and the beside-the-bar levels are retired. The span, the scale and zoom maths, `FZ`, pills and groups, `cont`/quiet/offer/closed segments, `clipR`, figures, the ruler tiers, the sample. |
| `drawWorld.ts` | Rewritten to the v2 `draw()`/`inRow()`/`tailSeg()`. |
| `worldMotion.ts` | Kept. Pointers on the card and the footer now belong to them. |
| `BirdsWorld.tsx` | Rewritten: header, pills, the card, replay, `FZ`. |
| `birdsWorld.css` | Extended. |
| `phoneBirdsWorld.measure.ts` | Rewritten. |
| How `QueriesV4` mounts it | Unchanged, except the no-queries fix above. |

## Locks (tests/e2e/phoneBirdsWorld.measure.ts)

Run with `npm run e2e:emu -- tests/e2e/phoneBirdsWorld.measure.ts --project pixel`. **Green: 49 + 8 readings, 0 red.**

Red-first: `BW_MUTATE=all`. Each of the 18 mutations turned **its own** lock red; the summaries are in `ledger/mut-*.summary.json`. The empty states and BW-8 write to the emulator. Each e2e run imports a fresh snapshot and exports nothing; BW-8 puts the setting back, and the empty states run last, in their own test.

| Lock | Measures | Mutation → own reds |
|---|---|---|
| BW-1 | Fitted view: bars only, no names, figures or gridlines; "Today"; header 140px | a name injected → 1 |
| BW-2 | Each pill keeps All's horizontal scale and line x | the viewport 40px narrower → 6 |
| BW-3 | A short pill opens zoomed in (z = FZ), every drawn row fitting, header unfolded | one step in on opening → 2 |
| BW-4 | At 48px rows, multi-stage rows' stage bars within 2px of their dates | bars 6px off → 1 |
| BW-5 | No name's box overlaps a figure or an "!" (3 screens) | names pushed 60px → 1 |
| BW-6 | Closest zoom: marks clear of each other and of the Today and month pills; day tier at 740 × 360 | day numbers spread → 2 |
| BW-7 | The current stage and its tail share an edge; earlier stages are the faded colour (computed by the browser); current stage full colour | a 4px gap → 1 |
| BW-8 | The fade starts at the setting's N weeks (6 and 3) | fade 30px off → 2 |
| BW-9 | All = With you + Needs chasing + Waiting (the labels' counts) | a count changed → 1 |
| BW-10 | 70 queries: time ≥ 90% of the width fitted; 48px rows reachable | world 30% narrower → 1 |
| BW-11 | Nothing with you / only closed (card on top, Closed below) / empty chase and wait / no queries (sample blurred 3px at 55%, no pills, no controls, no gestures) | card hidden → 5 |
| BW-12 | Replay: the line moves forwards from near the first date, its pill showing the date, no figures; a touch stops it at today; never with reduced motion | `requestAnimationFrame` stubbed → 1 |
| BW-13 | No "overdue" or "late"; no error from the world's own files in the console | "Overdue" injected → 1 |
| BW-14 | Layers: the hawk over a heading, the line over the hawk | hawk z 3 → 1 |
| BW-15 | Line off screen: "← Today" / "Today →" outlined at the edge; a tap brings it back | the ring removed → 1 |
| BW-16 | Ctrl+wheel and a pinch keep the row under the pointer within 4px | layer shifted → 2 |
| BW-17 | Reduced motion: no drift, no glide | drift forced on → 1 |
| BW-18 | 740 × 360: header folded, no dock | dock forced on → 1 |

**Rewritten from v1:**
- BW-1 (fit) → BW-1/BW-3/BW-10.
- v1's levels → BW-1 + the frame tests.
- v1's Timeline → BW-4.
- v1's spacing → the engine tests (rows 48, gaps 44).
- Line off screen, layers, anchoring, reduced motion, landscape and copy are kept as BW-13 to BW-18.

**Unit:** `birdsWorld.test.ts` (14), `drawWorld.test.ts` (9), `birdsWorldSmoke.test.tsx` (7).

## Screenshots: `reports/phone-birds-eye-world-v2/shots/index.html`

The build is shown beside the ref for 01–14, on the emulator harness at 2×. Differences other than data:

- **Header:** v1's back (‹) and List (☰) sit beside the ref's buttons, and the icon buttons are 36px, not 40, so "Birds-eye view" fits.
- **Dates read "Sep"**, not the ref's "Sept": the app has one month formatter (lib/dates), and `dates.test` locks it.
- **04 closest daily dates:** at 390px the harness's year-long campaign tops out at weekly marks (false premise 2). The ref's 20 queries reach days.
- **01/12:** the no-date footer sits clear above the dock (the ref's is half under it), and small groups' headings no longer run together (the 30px floor).
- **11 nothing with you** is the harness with every owed query set back to Queried, so the world behind the card is the harness's.
- **09** is the real no-queries path: the queries were deleted in the emulator and the Firestore cache cleared.
- **The "!" marker's white ring** is an outline, and the footer and mini map radii are 16. Both follow the phone sheet's ratchet.
- **The card's radius 20 and shadow** are the prompt's values, set on the element: the sheet's ratchet refuses them in a stylesheet.
- **Replay (14)** draws the closed queries' caps as their closing day passes. The ref's sample has two closed queries and the harness 18.

## For Nick

- **With you counts 16 on the harness but draws 4.** Twelve owed queries (a partial or full asked for) have no send-by date. They are not drawn, and the "no reply date" footer shows only under All and Waiting, as briefed. Should the footer show under With you too?
- **Phone pages throw while the viewport crosses 768px.** TodayV5, TodoV5 and QueriesV4 throw "useV3Data: no V3Provider above this phone screen", and their page boundaries catch it. This happens while the browser crosses the breakpoint with every page mounted (the measurement signs in at 1440, then drops to 390). It is not the world, and it is intermittent; it is recorded in `ledger/console*.json` when it happens. Worth its own look.
- The departures listed above under false premises 6 and 7.
- **The quiet default:** if the fade is meant to start at 6 weeks for everyone, that is a change to `LEGACY_QUIET_DEFAULT` (locked). The world follows the setting either way.
- `?hawk=0` is still there; it was allowed to go, and is kept.

## Housekeeping

- Worktree `/Users/nickphysick/ScriptAlly-bew2` and the deploy checkout are removed at the end of the session; see the wrap-up.
- `node_modules`, `functions/node_modules` and `.env.local` were symlinks, never copied.
