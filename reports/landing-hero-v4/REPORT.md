# Landing hero on desktop, v4: the phone's short looping story, a pop entrance and a hawk fly-past — run report

25 Oct 2026. Ref: `design-refs/landing-hero-v4.html`, SHA256 `252494bf…7503e`. I verified the hash, copied the file in from `~/Downloads` and enrolled it in the hash manifest. This covers desktop (≥761px) only. The phone is untouched, and is shown below to be unchanged.

## What was on main

- **Desktop:** the v3 long story in `HeroCard.tsx`/`heroCard.css`, as expected:
  - it opens on Day 32 and climbs to 99;
  - it has the nudge form and the scrollable end;
  - the cards deal in, and the shadow creeps in and follows the pointer;
  - "Watch again" appears at the end.
- **Phones:** the v3 loop with v3.1's task chips and popover, which landed on 24 Oct (`f47ed928`/`3a62daf7`), plus the "cards reach higher" follow-up (`2050cc1c`).

## False premises and findings

1. **Typing is 18ms a letter, not 30ms (S6).** The ref's `step` calls `type(p.chars, t+120, 18)` with no desktop branch, and the brief makes `playShort` "the authority for every time and value". I used 18ms. Desktop's `KEY` of 30 still applies, to the final panel's own typing.
2. **The desktop `stamp` steps by 240ms; the phone's by 340.** The two refs are identical in every story function except this one, which returns `t+240` in the desktop ref and `t+340` in the phone ref. This is the one timing value the shared code takes from a config (`SHORT.stampStep`).
3. **`setStatic`'s `show(99, true)`.** The second argument, `quiet`, only affects the ref's retired counter styles (flap, date, heartbeat), so the odometer path is identical. Not ported.
4. **"Pointer depth stays for the cards" (E3): on desktop it had never worked.**
   - `enter()` ran in the pile's layout effect and captured `host.current`. React runs a child's layout effect before it attaches the parent's ref, so that value was always `null`, and the pointer handler returned early on every move.
   - The same fault would have stopped the fly layer from ever being built.
   - Fixed by passing the ref and reading it when needed: on each move, and one frame after mount for the layer. The layer's delay is shortened by that frame, so the pass still starts 300ms after mount.
5. **H2's "above the nav" cannot be done inside the hero.**
   - `.mk-herowrap` is `position: relative; z-index: 2`, a stacking context below the sticky nav (`z-index: 60`).
   - The page's sheet is `overflow: clip`.
   - So the fly layer is a child of `<body>` at `z-index: 200`, laid over the hero in the ref's 1280 frame: the wrapper's box, scaled by width / 1280, the same `k` as `size()`.
   - `<html>` and `<body>` clip the x axis at the viewport's edge; the brief allows that ("it may leave via the viewport edge").
   - In the 761–899px stacked layout the same frame mapping applies over the wrapper's width.
6. **A regression I caused, caught by an existing lock, and fixed: the "See how it works" jump landed 16px off (landingColoursV2 N3).**
   - Bisected to finding 4: once pointer depth really runs, the cards' `translate` changes while the page scrolls.
   - A changing transform on the scroll anchor suppresses scroll anchoring, so the nav's 16px condense went uncompensated.
   - `overflow-anchor: none` on the desk pile restores the baseline exactly: 16 at 1440 and 1280. This is commit `b1572d8e`.
   - With smooth scrolling and transitions on, both builds land the same, so a reader would not have seen it. N3's instant jump is what exposes it.
7. **Watch again is retired, with its label `HERO_AGAIN`.**
   - The story loops, and the ref has no such control; its "Replay" is a review-only control.
   - `Hero.tsx`'s `placeAgain` still looks for `.mk-again` and now returns early. I left it alone because it is called from `size()`, which is on the don't-touch list. It and its comment are now dead code: a small follow-up.

## Gates (no worse than baseline)

| | Baseline | Phase 1 | Phase 2 | Final |
|---|---|---|---|---|
| tsc | exit 0, 0 lines | exit 0, 0 lines | exit 0, 0 lines | exit 0, 0 lines |
| build | exit 0, no errors or warnings | same | same | same |
| Vitest | `Test Files 3 failed \| 636 passed (639)` · `Tests 1 failed \| 9862 passed \| 3 skipped (9866)` | identical | identical | identical |

- The three failing files are under `functions/`: `eval/run`, `email` and `smartImportCore`. They fail because this worktree has no `functions/node_modules`.
- e2e on the final local build: landingHeroV3 12/12; landingHeroMobile 13/13 (the phone guard, unchanged); landingColoursV2 9 passed, 3 skipped (its own conditional skips).
- On dev: landingHeroV3 12/12; landingHeroMobile 13/13.

## Commits (all pushed to `main`)

- **`e499912f` Desktop hero v4 — the phone's looping story on the desktop card**
  - `src/marketing/HeroCard.tsx`, `src/marketing/heroCard.css`
  - `src/marketing/landingCopy.ts`, `src/marketing/landingCopy.test.ts`
  - `design-refs/landing-hero-v4.html`, `design-refs/.refhashes.json`
- **`be57fc79` Desktop hero v4 — pop entrance and hawk fly-past**
  - `src/marketing/HeroCard.tsx`, `src/marketing/heroCard.css`
- **`b1572d8e` Desktop hero v4 — keep the desk pile out of scroll anchoring** (finding 6)
  - `src/marketing/heroCard.css`
- **`1933f4ad` Desktop hero v4 — locks**
  - `tests/e2e/landingHeroV3.measure.ts`, `reports/landing-hero-v4/mutation-proofs.txt`

This report, the screenshots and the CLAUDE.md note follow in their own commit.

**How the loop is reused, not copied.**
- `playPhone` became `playShort`, used by both layouts.
- `play()` (v3's long story), the nudge form, `select`, the form's refs and Watch again are deleted.
- The phone-only branches in `climb`, `step` and `pop` became unconditional, because the desktop ref's values are the phone's.
- Everything that differs sits in `SHORT`: the stamp step (240 against 340) and the popover sequence.
  - The phone flicks Pages 50 → Words 5,000 → Chapters 3.
  - The desk goes Pages 10 → Chapters 1, then presses + twice to 2 and 3, using the ref's round `.pm` steppers.
- The desk's popover sizes are scoped to `.mk-pillpop--desk`.
- The manuscript block, disc and line-wash rules were the phone's `.mk-hc-pile--phone …`. They now name `.mk-hc-pile …`, at the same specificity and in the same order, because the desktop ref's last declarations are the same values.

## Screenshots (1440 × 780, app left, ref right)

**The story** (`shots/story-*.png`, with 1:1 card crops in `story-*-card.png`):
- `materials` — mid-pop;
- `pop-1` and `pop-3` — the popover on Chapters at 1, and at 3;
- `created`, `complete` and `reminder` — the three chips;
- `final` — the final panel;
- `sweep` — the card mid-sweep between loops.

All match the ref. The app's card sits about 15px left and 10px higher, which is `size()`'s documented nav deviation (the app takes its real nav's height off the window); it predates this change.

**The opening** (`shots/opening-{300,700,1000,1300,3000}.png`):
- Each frame is frozen at that time after the entrance starts, in both pages.
- The bird is whole in every frame where it's on screen. At 1000ms it is over the nav (the founding pill is shaded by it), and at 1300ms it leaves over the nav's top-right corner. Nothing cuts it at the hero's foot.
- Two differences in these frames come from the freezing method, not the page: the band's pink tint (CSS transitions are frozen mid-way too), and the ref's typing at 3000ms (the app's story waits for the fonts, so it hadn't started when frozen). The story's real moments are the set above.

**The phone, before and after** (390 × 844). Frames are matched by state, so each pair is the same moment in the story. This compares the original build (`58987748`) with the final one:

| Moment | Old vs new (pixels that differ, of 329,160) | Run-to-run noise in one build |
|---|---|---|
| still (reduced motion) | **0** | 0 |
| popover on Chapters | **0** | ~12,000 (the odometer turns throughout) |
| Task created | 40 — the "See how it works" chevron's idle animation | 40 |
| Task complete | 305 — the running clock | 172–207 |
| Reminder set | **0** | 0 |
| grown drawer | **0** | 0 |

`shots/phone-before-*`/`phone-after-*` keep the still and reminder pairs.

## Locks (`tests/e2e/landingHeroV3.measure.ts`)

| Lock | State | Holds | Break that turned it red |
|---|---|---|---|
| LH2 | rewritten (R1/H4) | The v4 still: Day 99, With you, Full requested, the final panel, the footer. Also the new titles, head discs and 15-pages chip; no chips, popover or fly layer; the cast at .2 with no animation; the feed scrollable. | entrance guard removed under reduced motion → "no fly-past under reduced motion" |
| LH4 | rewritten (loop) | Day 1 → 99 never goes back within a run; a fresh card reads Day 1 within 2s of the card leaving. | restart removed → `TimeoutError` waiting for the fresh card; Day 40 knot lowered to 20 → "at 14219ms the counter went back" |
| LH5 | **retired** | (the nudge form is gone) | — |
| LH7 | adjusted | `settle` now waits 3.7s, so the cast's fade (to ~3.15s after mount) is over before it reads .2. | (v3's own proofs) |
| LH9 | new | The popover's top is within 16px below the pill (measured 5.0); it shows `10, 1, 2, 3` in order; its opacity is under .05 on the sample that first sees a letter of Partial requested. | `margin-top:40px` → "within 16px of it"; steps cut to one → "10, then 1, 2, 3"; tuck delayed → "already gone when the first letter…" |
| LH10 | new | Three chips in their own lines' chip rows; backgrounds `rgb(245, 230, 223)` / `rgb(230, 236, 227)` / `rgb(245, 230, 223)`; gone within 3.5s; no floating pill. | selector weakened to `.mk-taskchip` (the mock's regression) → Received the cream `rgb(245, 241, 234)` |
| LH11 | new | The fly layer is a child of `<body>`, z 200 against the nav's 60 and the hero's 2. Nothing between it and `<body>` clips it. It flies once and is not running at 3s. The cast is at .2 by 4s, and its `translate` doesn't change while the front card's does. | `z-index:10` → "above the nav"; layer inside the hero → "a child of <body>…"; cast drift restored → "does not move with the pointer" |
| LH12 | new | No back card animates `translate` on load; the front's first keyframe is `scale .86`. | backs dealt → "no back card animates translate"; front from .95 → "its first keyframe is scale .86" |
| LH13 | new | The front card reads "The Taloned Mr Ripley"; four back cards read "Lord of the Wings". | front title changed → failed on the title |
| landingHeroMobile HM1–HM17 | unchanged (phone guard) | 13/13, local and on dev | — |
| landingColoursV2 N3 | unchanged; it caught finding 6 | anchor landing 16 at 1440/1280 | without the fix → 0 against the baseline 16 |

All outputs are in `mutation-proofs.txt`.

## Dev

- Dev had moved to another session's `dev/hm31-pv4-qc1492` (`index-Bz1d7ECX.js`). I confirmed that by building it and matching the hash.
- I merged `origin/main` into it as `dev/hm31-pv4-qc1492-dh4`. The hash-manifest conflict resolved as a union with no differing entries, and 756 refs were unchanged.
- I confirmed the served bundle in the same command as the deploy.
- **Served bundle: `index-iPCNFY2_.js`.** At 1440 wide:
  - the cards pop in;
  - the hawk flies over everything once (on its body-level layer, over the nav at ~1000ms) and its shadow settles to .2;
  - the story loops.
- At 390 wide the phone suite passes 13/13.
- Prod is untouched.
