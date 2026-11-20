# Query card v163 — the border breathes in the stage colour, a light runs round on save, and back on undo

Branch `query-card-v163` (from v161.2 @ 4528a82f4). Dev serves **`index-cIuMwb1S.js`**, built from
`dev/cr1-qc163` @ 5725a7637: consistency-rollout-v1 (e36d53547, which dev was serving) with v163 merged in.
`main` and prod untouched. Nothing here spends API money.

## For Nick to rule

1. **Colours for full, offer and closed** (built as the table; see the mid-breath frames):
   `frames/1x-breath-full.png` (#557aa3 / #c5d4e6), `frames/1x-breath-offer.png` (#c98f8a / #f6dedb),
   `frames/1x-breath-closed.png` (#9a9389 / #e6e3de). Closed is the faintest of the five against the white paper.
2. **QC163-4's freeze reading (a decision I made).** Chrome's screencast sends a frame only when the screen changes, and
   a held tint is a still screen: 0 frames arrive inside the app's freeze at either CPU rate. The lock therefore reads
   the screen 500ms into the freeze as the latest compositor frame sent at or before then (it must be painted after the
   hold's 280ms), at the ring point *at the press's 0.985 scale*, and the pixel must lie on the white → queried-rim line.
   It read 0.721 from rgb(209,192,162). The first version read 3.5px inside the unscaled top edge, hit the scrim behind
   the shrunk frame (78,78,83 → "1.333") and passed falsely; that pass was not counted.
3. **The 920px light** (ruling 2): no corner is visibly uncovered in `1x-light-third-save.png`, `1x-light-third-undo.png`
   or their 4× pair. Left at 920px.
4. **Dev deploy order.** Dev had moved from query-card-v161-2 to consistency-rollout-v1 by deploy time; per your
   "get it on dev, just dont overwrite any of the concurrent sessions", v163 was merged onto that tip as a new branch.
   Agent card v2 was told to merge onto `dev/cr1-qc163` before its own deploy.

## Step 0 findings

- Worktree level with its base; `df` above 20 GB at start (it later fell to 19.2 GB and the emulator guard refused one
  run; my two 3.1 GB deploy copies in the scratchpad were removed and the run repeated at 25 GB).
- **QC163-0 (ruling 4) ran first and passed**: with the rim's tint (opacity), light (rotate) and ring (scale) animating,
  29 compositor frames arrived during a 600ms main-thread block, 10 distinct pixels at the ring's top and 15 at its side
  (`ledger/after-QC163-0.json`, `frames/0-compositor-during-block.png`).
- Order slips, reported at the time: the `base163` worktree was added before counting worktrees, and the baseline was
  run after the code rather than before it (on a detached worktree at 4528a82f4).

## Per phase

| Phase | Commit | Files | Change |
|---|---|---|---|
| 0 | 12624aa91 | `design-refs/query-card-v163/query-card-v163.html` | the ref as supplied (SHA256 6042f6ee…c85f) |
| 1 | 943c66216 | `src/lib/stageColours.ts`, `.test.ts` | `rim` / `rimHi` on every stage, the table's literals; band/tint/edge/mark locks unchanged |
| 2 | 93143a264 | `qcMotion160.ts`, `QcCard152.tsx`, `qcv152card.css`, `qcv160.test.ts` | the rim layer (`span.qc163-rim` > light `i` + tint `b`), ring-only mask (`-webkit-mask` xor + `mask` exclude); the breath 3200ms, the tint in the stage's `rim` |
| 3 | 18622be28 | `qcMotion160.ts`, `QcCard152.tsx`, `qcv160.test.ts` | the press holds the tint (0.72 / 280ms ease-out), `pressBack` gives it back (150ms, no light); the landing's fade, light (save clockwise / undo mirrored and back), pop 1.03 @42% and sink 0.975 @30% |
| 4 | (this commit) | `tests/e2e/qc163.measure.ts` (new), `qc160/161/1611/1612.measure.ts`, ledgers, frames, runs | the locks; the older locks moved to v163's numbers; 60s SIGKILL timeouts on every seed call |

## How the tint and the paper stay in step

The breath is three Web Animations with the same timing object (3200ms, infinite, `cubic-bezier(0.37,0,0.63,1)`):
the paper (`::before`, scale 1→1.01→1), the ring layer (same scale), and the tint (opacity 0→0.72→0). After creating
them, `sync()` sets every `startTime` to one `document.timeline.currentTime`, so they share one clock from the first
frame; the rests (`qc1612-rest`, `qc163-rim-rest`, `qc163-tint-rest`) are synced the same way. QC163-2 reads the three
start times and durations off the running animations.

## Locks — red, then green

Every red below is from its own mutation build, applied by `scratchpad/mutate163.py` / `mutate1612.py`, run once, then
restored (`git diff --quiet -- src` after each). Run outcomes: `runs/run-mut{A,B,C,D}.txt`.

| Lock | Mutation | Red (as read) | Green |
|---|---|---|---|
| 1 stage colour | navy `#2a3a52` | tint rgb(42,58,82) on queried and partial | ✓ |
| 2 3200ms | `ms: 1900` | `[1900,1900,1900]` | ✓ |
| 3 `breatheType` | removed | tint ~0.46 while typing | ✓ |
| 4 press holds | hold cancelled | max 0 within 300ms; pixel 255,255,255 | ✓ 0.721 on the ring, held across a 1171ms freeze at 4× |
| 5 light in the to-stage | from-stage | queried colours on a save to partial | ✓ |
| 6 undo anticlockwise | `back = false` | −40→320deg, scale 1 | ✓ 40→−320deg, `-1 1` |
| 7 undo sinks | undo pops | keyframes peak 1.03; painted 1.02946 | ✓ save peak 1.02947 (≤1.03); undo never above 1 |
| 8 opacity/rotate/scale only | `boxShadow` on the fade | `["opacity","boxShadow"]` | ✓ |
| 9 nothing clickable moves | paper's breath on the frame | 201 distinct button boxes; locator click 30s timeout | ✓ |
| 10 reduced motion | guard removed | six qc163/qc1612 animations, tint 0.72 | ✓ |
| 11 `pressBack` | `tintBack` not called | no `qc163-tint-back` made | ✓ |
| W WebKit mask | — | — | ✓ ring shows, middle does not (`frames/webkit-mask.png`) |

Side reds, as expected: build A's from-stage also turned 6 red; under build B, 11 went red on its population (the
cancelled hold left nothing to give back), so 11's own mutation was re-proved alone in build C.

**Ruling 5 — the two loosened older locks still go red against their original mutations:**
- qc160 skips `::before` animations: with the paper's breath put on the frame itself (build C), QC160-3 reads
  `qc1612-breath` on the frame and 12 of 13 qc160 tests go red (`runs/run-mutC.txt`).
- QC1612-1's 6s window: with the breath never started (M1), 0 peaks, 0 dips, no start (`runs/run-mutD.txt`).

Measure fixes made while greening (none loosens a claim):
- `animsOf` keyed animations by start time, so a parked animation (seen paused, then playing) counted twice; now one id
  per Animation object.
- QC1612-3/-4 and the click test read `.spanel.getAnimations()` without `{subtree: true}`, which never returns a
  `::before` animation; red on the baseline for that reason alone.
- QC161-7 counted the undo's scales above 1; v163's undo sinks, so it now counts 10+ below 1 and none above.
- QC1612-3's after-window 700→1500ms: closing the card re-renders the page and painted 1 frame in 500ms (floor 3 kept).

## Baseline before and after

| Suite | v161.2 @ 4528a82f4 | v163 |
|---|---|---|
| qc160 | 13/13 | 13/13 |
| qc161 | 8/9 — QC161-11 red | 8/9 — QC161-11 red (same) |
| qc1611 | QC1611-2 red (frames either side of the long task not at 0.985) | all green |
| qc1612 | QC1612-3 ×8 and -4 red ("breathing before it", the measure's own bug); -5 seed timeout; -6, -7, click not run | all green |
| qc163 | — | 12/12 + frames |

QC161-11 is the same red on both: every answer's stored `dateSent`/`lastStatusChange` is one day later than the capture
it compares against (the capture's dates, not the card). Not this pack's.

The emulator seed (`seedQc152.mjs`) hung twice under the slot today; the 60s SIGKILL timeout (from Agent card v2's
eea8517ee, applied to all five measures) turned each into an ETIMEDOUT failure instead of a slot hold, and the tests
it cut off were re-run on their own.

## Frames and the dev bundle

`frames/`: at 1× and 4×, mid-breath on all five stages (`*-breath-{queried,partial,full,offer,closed}.png`), the press
mid-freeze, the light a third of the way round on save and on undo (`*-light-third-{save,undo}.png`), and at rest
(drawer open, saved, undone). `frames/index.json` records the tint at each shot.

Dev: the served hash was checked by a guard immediately before the deploy (`index-Dwl1UMgH.js`, consistency-rollout-v1),
the deploy went from a `git archive` of the pushed merge commit, and afterwards dev served `index-cIuMwb1S.js` =
the build's, with `qc163-light` and `qc163-tint` in the served AppRoot chunk.
