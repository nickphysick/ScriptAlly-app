# Landing page on phones, v3: one feature per flick, three points each, and a closing beat

26 Oct 2026. Ref: `design-refs/landing-mobile-v3.html`, SHA256 `78609bd8829f00d45d10f6f7431f63d67ddd8212dc27bc0aa6161a2f9a40b6fd`, verified and enrolled in the manifest.

- **On `main`:** `2347243f` (Phase 1) and `52fc6bbf` (locks). A third commit carries this report.
- **Dev:** serves `index-CYH6Vz1I.js` from `dev/db71-plad-db71f-cl25-lm2-cl251-lm3`. That is the branch dev was serving, which another session's Contact list v25.1 had moved on, with main merged in.
- **Prod:** untouched. No functions were deployed.

## False premises

1. **375 × 667 does not fit three points beside the join bar.**
   - S5 expected only 360 × 640 might need to drop the third point. At 375 × 667, captions 1 and 4 run into the join bar, by 23px and 2px. The other captions clear it by 21–49px.
   - The ref does exactly the same: its numbers match the app's to the pixel.
   - The brief allowed the third point to drop on 360 × 640's height only, so that is what was built (heights ≤ 660px). 375 × 667 keeps three points, and the overlap stands. **Nick's call:** widen the rule to cover 667, or accept it.
2. **Snapping pulls "See how it works" on to caption 1.**
   - The status band sits just above the first caption, so the drawer's in-page jump to the band is pulled on to caption 1's snap point. It lands with the picture stuck under the bar and caption 1 beneath it, and the band line "A bird's-eye view…" scrolled under the bar.
   - It is deterministic: three runs, same landing.
   - It follows from S1's page-level snapping, which the brief asked for. **Decision for Nick:** whether the band line should show on that jump.
3. **One flick from caption 6 does not reach the closing beat.**
   - The beat snaps with its top under the bar, which is 784px past caption 6's snap point, because the picture panel scrolls away first. A normal flick from caption 6 stops part-way, and a second flick snaps the beat.
   - The ref has the same geometry.
4. **The "N of 6" label sat 10px low at first.**
   - As an inline span, its line took the caption's inherited 24px line height, while the ref's caption has a 14px one. Everything below it ended up 10px lower than the ref.
   - It is now a 14px block, and every position measures identical to the ref.

## Step 0

- **The ref:** present; the hash matches.
- **v2:** all three commits are on main.
- **The v2 locks this changes:**
  - **LV1 (story):** now reads the v3 captions, with the 72% threshold.
  - **LV2 (no swipe):** the same claim, on the v3 captions.
  - **LV6 (reduced motion):** the same claim, on the v3 captions.
  - **LC2 N3's phone jump:** see False premise 2.
- **Snapping findings:**
  - `html:has(.mk-scope)` sets `scroll-behavior: smooth` (`auto` under reduced motion), and `overflow-x: clip` on `html` and `body`. Nothing set scroll-snap at page level.
  - Page snapping does not move the sticky bar, the strip or the fixed join bar.
  - The vision carousel's own horizontal snap sits inside its rail, so it is not a page snap point.
  - The three scripted scrolls: the grab handle and the two "join" links land nowhere near a caption, and the v2 locks covering them still pass. The anchor jump (False premise 2) is the one affected.
  - The page snap is scoped to `html:has(.mk-story)`, which only the phone landing renders, and switched off under reduced motion.

## What was built (phones, ≤760px)

- **Sizing:** one token, `--mk-ph` = `min((100svh − 60px) / 2, 420px)`. It sizes the picture panel, its picture, each caption's height (`100svh − 60px − panel`) and each caption's snap margin (`60px + panel`), so the four cannot disagree.
- **Captions:**
  - Each is a snap point (`start`, `scroll-snap-stop: always`).
  - Each holds a rust "N of 6", the heading (Special Elite 24px), the line (serif 16px) and three ring-ticked points (serif 15px).
  - All eighteen points are the ref's, as data in `landingCopy.ts`.
  - The current caption is the one past 72% of the viewport.
- **The closing beat:** "And so much more." (34px), the line (17px, 280px wide) and a rust ↓. It is 55svh tall with its top padding at 7svh, and snaps under the bar.
- **Snapping:** nothing else on the page is a snap point, and no script moves the scroll.

## Gates

| Gate | Baseline | Phase 1 |
|---|---|---|
| tsc | exit 0 | exit 0 |
| build (grepped) | clean | clean |
| vitest | `Test Files  3 failed \| 638 passed (641)` / `Tests  1 failed \| 9868 passed \| 3 skipped (9872)` | identical |

The three failing files are the same as before (`functions/`, untouched).

e2e, all six landing files: `59 passed, 3 skipped, 1 failed`. The failure was LC2 N3's phone jump (False premise 2). After its retarget it passes, and it was re-proved. The skips are LC2's capture and shots cases, which only run with their own flag. On dev, all ten v3 and v2 locks pass.

## Commits

- `2347243f` **Phones landing v3 — one feature per flick, three points each, and a closing beat**: `design-refs/landing-mobile-v3.html`, `design-refs/.refhashes.json`, `src/marketing/FeatureStory.tsx`, `src/marketing/landingCopy.ts`, `src/marketing/marketing.css`.
- `52fc6bbf` **Phones landing v3 — locks**: `tests/e2e/landingMobileV3.measure.ts` (new), `tests/e2e/landingMobileV2.measure.ts`, `tests/e2e/landingColoursV2.measure.ts`, `reports/landing-mobile-v3/mutation-proofs.txt`.

## Screenshots (`shots/`)

- **`strip-6up.png`:** all six captions snapped at 390 × 844, the app's row above the ref's. At every snap the caption's top is at 452, the panel's bottom is at 452, and the right caption is current, in both.
- **`compare-beat.png`:** the closing beat snapped at 60, with the navy vision's top showing at 524, in both.
- **`compare-cap2-375.png` and `compare-cap2-360.png`:** caption 2 on the short screens, matching the ref.
- **`dev-after-flicks.png`:** dev after the fling test.

**S5, the short screens.** Room between the last visible point and the join bar:

| Screen | Points | Caption 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| 375 × 667 | 3 | −23 | 49 | 25 | −2 | 21 | 22 |
| 360 × 640 | 2 (third dropped) | 12 | 64 | 40 | 12 | 36 | 36 |

## Locks and their red-before proofs (`mutation-proofs.txt`)

**Added (LS1–LS4):**

| Lock | Break → red at |
|---|---|
| LS1 snap | `LS1` no snap → "html's scroll-snap-type is y proximity" · `LS1b` stop normal → "every caption stops the flick" · `LS1c` 60px margin → "60 + the panel" · `LS1d` an eighth snap point → "exactly seven" · `LS1e` first picture forced → "picture 3 is the visible one" |
| LS2 captions | `LS2` a point removed → "caption 1 … 3 points" · `LS2b` wrong label → "caption 4's label" |
| LS3 beat | `LS3` beat 120svh → "the vision's top is on screen" · `LS3b` a second heading → "appears once" |
| LS4 reduced motion | `LS4` snapping forced → "no snapping" · `LS4b` fade forced → "no cross-fade" |

**Rewritten:**

| Lock | Change | Proof |
|---|---|---|
| LV2 | reads the v3 captions | re-proved: `LV2` → "no horizontal scroller", `LV2b` → "never scrolls sideways" |
| LV1, LV6 | read the v3 captions; LV1's threshold is 72% | — |
| LC2 N3 (phone) | the jump lands with the picture stuck under the bar and caption 1 under it | `N3s` snapping off → "the picture is stuck under the bar" |

A first version of the N3 retarget checked only that caption 1 sat under the picture. That holds whether the page snaps or not, because caption 1 always follows the panel in the page flow, and its proof passed. The stuck-panel check is what makes it a real lock.

**Retired:** none.

## Dev

`index-CYH6Vz1I.js`. A touch fling, synthesised through Chrome's input layer at 390 × 844 on dev:
- **Captions 1 to 6:** five flicks, each one exactly one caption on (392px at a time), with the right picture current.
- **From caption 6:** two flicks to snap the closing beat (False premise 3). The beat then sits at 60 and the navy vision's top is on screen at 524.
