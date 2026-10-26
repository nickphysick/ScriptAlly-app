# Landing page on phones, v4: no founding strip, "Log in" in the bar, and the vision as one frame

26 Oct 2026. Ref: `design-refs/landing-mobile-v4.html`, SHA256 `10c9c7900a9bf506b4af92423f1317b5867946c7ec74fc972c5aabacda2fd363`, verified and enrolled in the manifest.

- **On `main`:**
  - `8f725249` — Phase 1, the top bar.
  - `8037b19a` — Phase 2, the vision.
  - `f6f53511` — Phase 3, the locks.
  - A fourth commit carries this report.
- **Dev:** serves `index--JaQgqU2.js` from `dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4`. That is the branch dev was serving (another session's dashboard v77 on top of my v3), with main merged in.
- **Prod:** untouched. No functions were deployed.

## False premises

1. **D1 is not "still needed" without the strip; it is dead.**
   - D1 read the strip's height and added it to the drawer's travel. With no strip that height is 0.
   - D1's lines are reverted, so HeroPhone is back to the v3.2 code.
   - The drawer still rounds off to 0px exactly at the bar, and the grab handle reaches it (LT2).
2. **There is no room for the avatar on a phone when signed in.**
   - The desktop shows "Open dashboard" plus the avatar. On a phone the pill alone is 132px and ends 8px before the menu.
   - The avatar is therefore left out at phone width. Report: the pill shows "Open dashboard", to /dashboard.
3. **The ref's 6px tuck has two consequences:**
   - It is a ninth negative margin in the marketing sheet. The lock that holds that set now names it, with its reason.
   - The story's picture panel paints over the navy's top 6px as the story lets go, exactly as in the ref (measured: panel bottom 406, vision top 400 in both). v2's LV1 now allows that 6px and no more.
4. **The "Updates log themselves" illustration still has "SHE'S ASKED FOR" drawn in.** It needs the illustrator.

## Step 0

- **The ref:** present; the hash matches.
- **v3:** on main.
- **The strip:** `FoundingStrip`, rendered by `MarketingShell` for signed-out readers at phone width. It appeared on all seven public pages: /, /pricing, /about, /contact, /founders, /terms and /privacy.
- **D1:** described under False premise 1.
- **The desktop nav:**
  - Signed out: "Log in", which sets `#/login`, plus "Become a Founding Writer", which goes to /founders.
  - Signed in: "Open dashboard", which goes to /dashboard, plus the avatar.
  - On phones the pill does the same: "Log in" to `#/login`, or "Open dashboard" to /dashboard.
- **The locks this changes:** listed in the Locks section below.

## What was built (phones, ≤760px)

- **The top, on every public page:** the logo and "QueryHawk", then one pill (`.mk-lg`: white 15px sans 500 on white at 10%, 36px tall, radius 18, no outline and no underline in any state), then the menu. `FoundingStrip`, its CSS and its copy helper are deleted.
- **The vision, on the landing page:**
  - v3's closing beat is removed.
  - Straight after the sixth caption: navy, with 26px top corners, rising 6px into the story's foot.
  - "And so much more." (32px) and "…the principles we built it on:" (white at 78%, 17px, max 320px).
  - One cream frame (300px, radius 20, 24px in) holds the three pictures stacked. The current one shows, cross-fading over 0.45s (instant under reduced motion).
  - Beneath it, the line carousel: each line is a heading (28px) and one short line (white at 75%). Swiping changes the picture and the pink dot, and ← / → move one line.
  - Then "Read our story →" to /about.
  - All copy is in `landingCopy.ts`.

## Gates

| Gate | Baseline | Phase 1 | Phase 2 |
|---|---|---|---|
| tsc | exit 0 | exit 0 | exit 0 |
| build (grepped) | clean | clean | clean |
| vitest | `Test Files  3 failed \| 638 passed (641)` / `Tests  1 failed \| 9868 passed \| 3 skipped (9872)` | identical | identical |

The three failing files are unchanged (`functions/`, untouched).

e2e, all seven landing files: `58 passed, 3 skipped, 1 failed`. The failure was LV1, which now allows the ref's 6px tuck; it passes after the rewrite and was re-proved. The skips are LC2's capture and shots cases, which only run with their own flag. On dev, all twelve v4, v3 and v2 locks pass.

## Commits

- `8f725249` **Phones — drop the founding strip; Log in in the top bar**: `design-refs/landing-mobile-v4.html`, `design-refs/.refhashes.json`, `src/marketing/FoundingStrip.tsx` (deleted), `MarketingShell.tsx`, `HeroPhone.tsx`, `landingCopy.ts`, `marketing.css`.
- `8037b19a` **Phones landing v4 — the vision as one frame with lines you swipe**: `src/marketing/Vision.tsx`, `FeatureStory.tsx`, `landingCopy.ts`, `marketing.css`, `marketingTokens.test.ts`, `tests/e2e/landingMobileV3.measure.ts` (LS3's import only).
- `f6f53511` **Phones landing v4 — locks**: `tests/e2e/landingMobileV4.measure.ts` (new), and the v3, v2, v1, `landingHeroMobile`, `landingHeroV3` and `landingColoursV2` measures, plus `mutation-proofs.txt`.

## Screenshots (`shots/`; app left, ref right)

- **`compare-top.png`:** the landing's top, signed out.
- **`compare-top-signed-in.png`:** the landing's top signed in ("Open dashboard"; the ref shows the signed-out state).
- **`top-about.png` and `top-pricing.png`:** "Log in" in the bar, with no strip.
- **`drawer-40-short.png`:** the drawer 40px short of the bar, still rounded. Measured: 2.7px of radius 40px short, 0px at the bar, and the grab handle lands at 60.
- **`compare-handover.png`:** feature 6 into the navy.
- **`compare-line1.png` and `compare-line3.png`:** the frame changing picture. Measured identical to the ref: the frame state, the dots, the radius and the gap.
- **`compare-line2-375.png`:** line 2 at 375 × 667.
- **`dev-top.png`, `dev-line1.png` and `dev-line3.png`:** from dev, after two real touch swipes. The frame went from picture 1 to 2 to 3.

## Locks and their red-before proofs (`mutation-proofs.txt`)

**Added (LT1–LT4):**

| Lock | Break → red at |
|---|---|
| LT1 top | `LT1` strip put back → "no founding strip" · `LT1b` fill changed → "on white at 10%" · `LT1c` underline → "no underline" · `LT1d` bar not sticky → "still stuck at 0" · `LT1e` link rerouted → "Log in goes to the sign-in route" |
| LT2 drawer | stage taller than HeroPhone measured → "still rounded short of the bar" |
| LT3 vision | `LT3` 120px gap → "starts straight after the sixth caption" · `LT3b` square corners → "rounded top corners" · `LT3c` first picture forced → "picture 3 is the visible one" · `LT3d` dark headings → "every heading is white" · `LT3e` beat put back → "no closing beat" · `LT3f` old lead → the lead |
| LT4 reduced motion | fade forced → "no cross-fade" |

**Rewritten:**

| Lock | Change | Proof |
|---|---|---|
| LS1 | counts six snap points | `LS1d` (an extra snap point) → "exactly six" |
| LV5 | new break, because the old one no longer breaks anything (below) | taller stage → red |
| LC2 N2 (phone) | checks the Log in pill | `N2p` → "white at 10%" |
| LC2 V1 (phone) | checks the one frame | `V1p` → "showing one picture" |
| LV1 | allows the ref's 6px tuck | `LV1e` → "has let go of the bar" |
| LH17 | reads the phone's N from the join bar | — |
| HM2 | drops the strip's height | — |

LV5's old break hid the strip's height, so it no longer broke anything. My first replacement, a bar reported 40px taller, also passed: it shrinks the stage by the same amount, so the drawer's real and computed travel stay in step. The break that bites is a stage taller than HeroPhone measured.

**Retired:**
- LM1 and LM6: the strip.
- HM4: the strip's counter.
- LS3: the closing beat.
- LV3: v2's carousel of cards.

## Dev

`index--JaQgqU2.js`, checked at 390:
- No strip, and "Log in" in the bar.
- The drawer meets the bar with its corners rounding off there.
- Swiping the lines changes the frame's picture.
