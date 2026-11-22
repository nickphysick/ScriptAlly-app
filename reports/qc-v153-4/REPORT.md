# Query Centre v153.4 — crisp background, typewriter title, aligned header, sidebar filter, ring only

Reference: `design-refs/query-centre-v153-4.html` (sha256 `c13feb53…7268`, verified before Step 1). Values read from
the rendered ref at 1920 with `getComputedStyle`, and its hover states captured by pointing at each arc.

## False premises and Step 0 findings

1. **v153.3 is not on `main`.** Branched from `query-centre-v153-3` at `561942add` (its chips rail, paperclip tab and
   ruled headings all present), as the prompt allowed.
2. **The dev line is not v153.3 plus nothing.** Dev serves `dev/…-cl27b-yn1-laq1` (`5e0160694`, `index-CrpShZgq.js`),
   where "Your notes v1" moved the Query Centre's header and ring into shared `shell/OpenHeader` and `shell/OpenRing`,
   which the Contact list v27 and Your notes also mount (with their legends). The merge for dev keeps `OpenHeader` (it
   renders the same `qc1531-*` classes, and every v153.4 header rule is scoped to `.qc151.qc153`) but takes the Query
   Centre's ring **off** `OpenRing`: the Query Centre now has its own ring-alone component there, while the other pages
   keep `OpenRing` unchanged. `openHeaderShared`'s capture was retaken on that line: the six ring states and
   `headerFull` changed on purpose; `headerLoading` and `headerNoMs` came out byte-identical.
3. **The v153.3 branch lacks workspace width v2**, which only the dev line carries, so a local build of the branch caps
   the page column at 1256px. The figures below are from the **deployed** build unless marked "local".
4. **The harness account has several manuscripts and none scoped**, so the "for Murphy's Day Out" line does not render
   there (v153.1's rule, unchanged).
5. **The ref's fixed viewBox (`-92 -6 394 222`) only fits its own sample counts.** A long left label ("Passed or closed
   18") or a label at the ring's foot would clip, so the viewBox width is measured from every annotation's box and the
   labels are held inside the frame's height.
6. **Baseline tsc ran out of memory** at Node's default heap under a load average of 23; re-run with a 6GB heap.

### Step 0 readings (dev, 1920, before)

| | Before (dev) | Ref | After (deployed) |
|---|---|---|---|
| ground | `#f2eee8`, tile under a top-to-bottom fade | `#f5f5f3`, tile under an even .45 wash | `#f5f5f3`, even .45 wash, both layers repeat |
| header columns · gap | 190 / 774 / 560 · 36 | 268 / 696 / 560 · 28 | 268 / 712 / 560 · 28 |
| title left · list left | 424 · 494 | 511 · 511 | **494 · 494** |
| header height | 218 | 218 | **218** |
| title | Playfair Display 600 54px | Special Elite 400 54/1.05, -0.54px | Special Elite 400 54/1.05, -0.54px |
| rail | white card, radius 16, shadow; white header 14 16 12; hairline-ruled sections, typewriter 15px labels; Most used as pills | sidebar | sidebar (P3) |
| ring | legend + "N sent" heading, counts on 4 segments, tooltip | ring alone, annotation on hover | ring alone, annotation on hover |

At 1440 (deployed): title left 408 = list left 408; header 218 before and after; columns 268 / 404 / 560.

## Commits (branch `query-centre-v153-4`, from `query-centre-v153-3` at `561942add`)

| Phase | Commit |
|---|---|
| 1 · background and title | `5c367da5d` |
| 2 · aligned header grid | `67b2b9543` |
| 3 · sidebar filter rail | `974165c05` |
| 4 · ring only, annotation on hover | `adb00b4e4` |
| 5 · older checks retired or re-pointed | `64ff2ab6c` |
| report | (this commit) |

Dev line: `dev/…-cl27b-yn1-laq1-qc1534` at `a80b07d3d` (the served `…-laq1` + this branch).

## Gates against baseline

| Gate | Baseline (`561942add`) | After (`64ff2ab6c`) |
|---|---|---|
| tsc | 2 errors | the same 2 errors |
| production build | clean | clean (no errors or warnings in the full log) |
| Vitest | 5 failed, 11,503 passed, 3 skipped (4 files fail to load) | 5 failed (the same five), 11,507 passed, 3 skipped (the same 4 files) |

All the failures are worktree environment, not code: the two tsc errors and the four unloadable files are `functions/`
modules with no `functions/node_modules` in a worktree; the five failed tests are `emuGuard` (1), `firestoreTarget`
(2), `functions/eval/generate` (1) and `smartImportCore` (1). On the merged dev tree the shell, queries, contact and
notes suites are 877 of 877.

## Browser checks (`tests/e2e/qc1534.measure.ts`)

Written first and run red against the pre-change dev site (68 failed readings; P4 timed out because the old segments
could not take focus). After: P1–P4 pass at 1440 and 1920 on a local dev build and again on the deployed site.

- **P1** ground `#f5f5f3`, the even wash, the tile at 340 × 360 repeating, scrolling with the page; title face and
  tracking; screens of the top and the foot (`page-top-*`, `page-bottom-*`).
- **P2** columns, gap, title left = list left (±1), the hawk's centre = the rail's centre (±1), header 218.
- **P3** no rail card; the ruled header; four sections 8px apart with no hairline; labels Source Serif 600 12.5
  `#8a8076`; white panels (radius 12, 1px `#e8e1d6` ring, 6px padding); Most used rows 8/10 radius 8, counts Special
  Elite `#8a8076`. **A Most used row toggles the same state as before:** on, navy with cream text, the bar shows the
  row's count, "1 on", and a second press clears (also pinned at unit, written red first).
- **P4** no legend, heading, segment counts or tooltip; ring 214 tall, right edge on the list's right edge; at rest no
  annotation; hovering each of the five segments shows exactly its own annotation, inside the svg's box, with the
  others faded; **focusing a segment shows exactly one annotation** (unit cases written red first, browser case red on
  dev); each segment named "Waiting to hear, 38 of 88", a focusable button; Enter turns its stage on, a click turns it
  off; the title's ink is clear of the ring (1440: 829 against 1124; 1920: 915 against 1518).

Older v153.1–v153.3 cases whose subject v153.4 removed are skipped in place (`tests/e2e/RETIRED-query-centre-v153-4.md`);
their remaining cases still run: 17 pass, 7 skipped.

## Screens

In this folder: `page-top-*` and `page-bottom-*` (the pattern to the foot), `header-rest-*`, `header-hover-<segment>-*`
for all five, `rail-*` (whole rail at rest) and `rail-on-*`, at 1440 and 1920. Side by side with the ref (ref above or
left): `sbs-header-rest-*`, `sbs-header-hover-<segment>-*`, `sbs-rail-*`.

## Where the build departs from the ref

- **At 1440 the title stays on one line and overruns its 404px track by ~17px** onto empty ground left of the ring. The
  ref wraps it to two lines and stacks the buttons, which makes its header taller; the prompt forbids the header
  growing. At 1920 it fits its 712px track.
- **The ring's svg is 399px wide, not 380**: the viewBox is measured from the annotations so the longest label fits on
  either side ("Passed or closed 18" needs more room than the ref's "4").
- **A label near the top or foot of the ring is held inside the frame** (Partial, at the foot, sits a little above
  where the ref's geometry would put it), so nothing is drawn outside the svg.
- **A focused segment shows no outline**: the annotation and the fade of the other segments are its focus mark.
- **The empty state's "Nothing sent yet"** survives only in the ring's accessible name, since the legend that showed it
  is gone (the prompt removes the legend text and adds no strings).
- **Kept from v153.3, not in the ref's drawing:** the rail's export link at its foot; Most used row text at 14.5px (the
  rail's own row type) where the ref's is 14px.

## Deferred, named

- **Two ring components on the dev line.** The Contact list and Your notes still draw `shell/OpenRing` with legends;
  the Query Centre has its own ring-alone. Whether the other pages lose their legends too, or the ring-alone becomes an
  `OpenRing` option, is for when Your notes v1 and Contact list v27 land.
- **Another session's `…-laq1-aa1` branch** (add an agent) was cut from `…-laq1` before this deploy and does not contain
  v153.4. Deployed as it is, it would take v153.4 off dev; it needs to stack on `…-laq1-qc1534`.
- Prod: nothing (Nick's).

Dev: https://scriptally-dev.web.app/queries (serves `index-DwTVgjZO.js`).
