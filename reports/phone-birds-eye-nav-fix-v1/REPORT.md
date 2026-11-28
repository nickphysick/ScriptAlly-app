# Phone Birds-eye nav fix v1: Birds-eye no longer sits over the other pages

Branch `phone-birds-eye-nav-fix-v1`, cut from `origin/phone-birds-eye-first-look-v1` (4db23cdaa), because that is what dev serves. Main had not moved. Pushed, not merged. Below 768px only.

## What was broken, and why

- **The symptom:** once Birds-eye had been opened, every later tap on Today, To do, Materials or Profile landed on Birds-eye's rows instead. The dock still changed the route, but the page underneath couldn't be used. PA5-2 (reach) had 28 of 36 checks red.
- **The cause** was two facts together:
  1. **The Queries page never unmounts.** It lives in a `StagePage`, which toggles visibility only and keeps the page mounted. Its phone view, `QueriesV4`, remembers the Birds-eye side for the session, so `BirdsWorld` stayed mounted after the writer left Queries.
  2. **`BirdsWorld` draws outside its page.** It portals its full-screen layer (`position: fixed; inset: 0; z-index: 40`) into `document.body`, so hiding the Queries slot never hid it. The layer covered every other page and took its taps.
- **The fix, at the cause:** the Queries page passes its own route state through (`<QueriesV4 active={routeActive} />`), and `QueriesV4` mounts `BirdsWorld` only while the Queries page is on screen. Leaving Queries unmounts the world, and with it its portal and everything it draws.
  - **Coming back is a new open:** the first look fades in, or plays if it is the day's first.
  - **Nothing else needed changing.** I audited the overlays inside Birds-eye (the long-press menu's veil, the sheets' veil, the search, key and no-date sheets, the pull pill, the level list). Each is rendered only while it is open. The world's gestures listen on its own viewport only (`wireMotion` on `.bw-vp`), and the first look's touch-to-finish listens on Birds-eye's own root.

## Gates

The source at the base is identical to first look's c3620db76 (the base adds only a report change). The baseline was also re-run here before the first edit.

| Gate | Baseline | Final |
|---|---|---|
| tsc (8 GB heap) | exit 0 | exit 0 |
| `npm run build` | exit 0 | exit 0 (built in 1.53s) |
| `npm run build:dev` | exit 0 | exit 0 |
| Vitest | Test Files 975 passed, 1 skipped (976) · Tests 13830 passed, 4 skipped (13834) | Test Files 975 passed, 1 skipped (976) · Tests 13831 passed, 4 skipped (13835): +1, the unit lock |

## The lock: BW-NAV-1 (`tests/e2e/phoneBirdsNav.measure.ts`), at 390 × 784

**From Birds-eye**, after each of these:

- straight after opening (the grow-in playing);
- after the grow-in;
- after a touch mid-animation;
- after pinch, pan or scrub;
- after opening and closing the query sheet, the long-press menu, search, the colour key and the level chip;
- after pull to refresh.

…a real tap at the middle of each of these reaches its destination: Today, To do, Materials, Profile, +, back and List. "Reaches" means the destination is shown, and a tap at its middle hits it rather than anything of Birds-eye.

**Then from Today, the Queries list and Agents** (Today's Agents tab), each reached inside the app after opening Birds-eye, a tap on each dock tab and on + reaches its destination.

That is 100 readings.

- **Red first, on the unfixed code:** 58 of 100 red. Every red is the route changing while the tap still hits Birds-eye (`i.bw-hit` or `div.bw-w`):
  - each Birds-eye state's four dock tabs, 48 in all;
  - from Today and from Agents, all five targets each.

  The Queries list was green, because List hides the world itself.
- **PA5-2, the failing case:** 28 red of 36 before the fix, 0 red of 36 after it.
- **Green, with the fix:** 100 readings, 0 red.
- **Unit lock:** `birdsWorldSmoke.test.tsx`, "Birds-eye mounts only while the Queries page is on screen". It is red with the `active` check removed and green with it.
- **Two cases had to be reworked:**
  - **From-page navigation:** a fresh page load starts with the Queries slot unmounted, which hides the bug. The from-page cases therefore navigate by tapping.
  - **Agents:** on a phone, `/agents` goes to Today, so the Agents case uses Today's Agents tab and checks below its pinned tab strip.

## Commit, dev

- Commit: COMMIT
- Dev: DEV
