# Landing page on phones, v2: the feature story, the navy vision, the join bar, and the drawer fix

26 Oct 2026. Ref: `design-refs/landing-mobile-v2.html`, SHA256 `4301e2945418df31c3a83d47d03317aaae7efb5cefc71e5158aac84f536c8add`. The hash was verified and the ref is enrolled in the manifest.

- **On `main`:**
  - `13a3d9cf` — Phase 1, the feature story and the navy vision.
  - `67737bc6` — Phase 2, the join bar and the drawer fix.
  - `1fcc6eec` — Phase 3, the locks.
  - A fourth commit carries this report and the shots.
- **Dev:** serves `index-BbeaZ_TR.js` from `dev/db71-plad-db71f-cl25-lm2`. That is v1's dev branch with main merged in.
- **Prod:** untouched. No functions were deployed.

## False premises

1. **The join bar's "hero has scrolled away" cannot be the hero's own bottom.**
   - In the app the hero's stage is `position: sticky`, so its bottom never rises above the bar. The ref's hero is a static picture.
   - The bar therefore waits for the drawer's head to pass above the sticky bar. The drawer's head holds the headline, "See how it works" and the drawer's own sign-up.
   - This is also what guarantees J2's "never covers the drawer's sign-up".
2. **D1 was described as "two lines". It is three, plus one field.**
   - One line reads the strip's height in `layout`.
   - Two lines add it where the drawer's travel is set: in `layout` and in `grow`.
   - The field is `off`, added to the state's initial value.
   - Nothing else in HeroPhone changed.
3. **The "Updates log themselves" illustration has "SHE'S ASKED FOR" drawn into the artwork.** It is a picture, not page text, and image files were off-limits. The pronoun sweep (LM5 and the v3.2 wording locks) cannot see it. It needs the illustrator.

## Step 0

- **The ref:** present; the hash matches.
- **v1:** `355a46ea`, `4991ddf0` and `ab827ee8` are on main.
- **The v1 locks this changes:**
  - **LM2, the swipe strip:** retired. The new LV1 (the story) and LV2 (no swipe) replace it.
  - **LM3:** its compact-rows half is retired, and the new LV3 (the navy carousel) replaces it. Its "never simple" sweep stands.
  - **LM6:** its swipe half is retired, and the new LV6 replaces it. Its strip-count half stands.
  - **LC2 V1's phone branch:** now expects the navy carousel.
- **D1, as proposed in v1:** "measure from the strip's foot". That is the change built here.

## What was built (phones, ≤760px)

- **Order below the hero:**
  1. The band line, as before.
  2. The feature story.
  3. The vision on navy.
  4. The closing card, as built in v1.
  5. The footer.
- **The feature story (`FeatureStory`):**
  - The picture panel is sticky under the 60px bar. Its height is `min((100svh − 60px) / 2, 420px)`, with the picture contained on blush (radius 18) over a six-step bar.
  - The six captions are in the ref's order and copy.
  - The caption past 84% of the viewport is current: the picture cross-fades over 0.45s and the bar fills to it.
  - The panel is sticky inside its own section only, so it lets go after the story. There is no hijacking and no snapping.
  - Under reduced motion the picture swaps instantly.
  - The panel paints `--mk-lower` (it is the lower ground), and `marketingTokens`' readers lock now names it.
- **The vision (`Vision` → `VisionNavy`):**
  - `#1b2433`, with the pink mono label.
  - Three cards: a cream picture tile, a white Special Elite heading, and the body in white at 78%.
  - The next card peeks in, the cards snap to the centre, and the active dot is pink.
  - The arrow keys move one card, and "Read our story →" goes to /about.
- **The join bar (`JoinBar`, landing page only):**
  - `#1b2433`, 12px plus the safe-area inset above the bottom and 10px from each side.
  - It reads "Become a founding writer", then a 64px pink track and "N places left", then a pink Join with black text.
  - It links to the closing card's form.
  - It slides over 0.35s; under reduced motion it shows and hides without the slide.
  - The figure is the store's, shown only once it arrives.
  - It is portalled into `.mk-scope`, so the tier's tokens resolve.
- **D1:** described under False premises. The before-and-after numbers are in the Locks section.

## Gates

| Gate | Baseline | Phase 1 | Phase 2 |
|---|---|---|---|
| tsc | exit 0 | exit 0 | exit 0 |
| build (grepped) | clean | clean | clean |
| vitest | `Test Files  3 failed \| 638 passed (641)` / `Tests  1 failed \| 9868 passed \| 3 skipped (9872)` | identical | identical |

The three failing files are the same every time: `functions/eval/run.test.ts`, `functions/src/email.test.ts`, and `functions/src/smartImportCore.test.ts` (the 32k ceiling). Nothing under functions/ was touched.

e2e, all five landing files: `55 passed, 3 skipped, 1 failed`.
- **The skips** are LC2's capture and shots cases, which only run with their own flag.
- **The failure** is LH11, the desktop hawk's fly-past ("it flies once"). The desktop is untouched, and LH11 passed twice when run alone, so it was a timing miss under two workers.
- **On dev,** LV1–LV6 also pass.

## Commits

- `13a3d9cf` **Phones landing v2 — features as a scrolling story, vision as a navy carousel**: `design-refs/landing-mobile-v2.html`, `design-refs/.refhashes.json`, `src/marketing/FeatureStory.tsx` (new), `FeatureSwipe.tsx` (deleted), `Vision.tsx`, `Landing.tsx`, `FeatureRows.tsx`, `landingCopy.ts`, `marketing.css`, `marketingTokens.test.ts`.
- `67737bc6` **Phones landing v2 — join bar that follows you down; drawer fix under the strip**: `src/marketing/JoinBar.tsx` (new), `Landing.tsx`, `landingCopy.ts`, `marketing.css`, `HeroPhone.tsx`.
- `1fcc6eec` **Phones landing v2 — locks**: `tests/e2e/landingMobileV2.measure.ts` (new), `tests/e2e/landingMobileV1.measure.ts`, `tests/e2e/landingColoursV2.measure.ts`, `reports/landing-mobile-v2/mutation-proofs.txt`.

## Screenshots (`shots/`; app left, ref right, at the same scroll position)

- `compare-f1.png`, `compare-f3.png`, `compare-f6.png`: features 1, 3 and 6 at 390 × 844. The picture top, the picture height (392px), the current caption and the caption's position are identical to the ref.
- `compare-handover.png`: the story letting go and the vision rising beneath it.
- `compare-vision2.png`: the vision on card 2.
- `compare-f2-375.png` and `compare-f2-360.png`: feature 2 on the short screens.
- `jbar-hero.png`, `jbar-features.png` and `jbar-card.png`: the bar hidden, shown, and hidden again.
- `drawer-before-after.png`: the drawer 40px short of the bar, before and after D1.
- `dev-top.png`, `dev-story-f3.png`, `dev-vision.png` and `dev-card.png`: the same views on dev.

**F5, the short screens** (measured identical to the ref):

| Screen | Panel height | Current caption |
|---|---|---|
| 375 × 667 | 304px (303.5 measured), at top 60 | top 401, body ends 535 |
| 360 × 640 | 290px, at top 60 | top 384, body ends 518 |

On both, the current caption is fully readable beneath the panel.

## Locks and their red-before proofs (`mutation-proofs.txt`)

**Added (LV1–LV6):**

| Lock | Break → red at |
|---|---|
| LV1 story | `LV1` not sticky → position · `LV1b` 300px → "min((innerHeight − 60) / 2, 420)" · `LV1c` first picture forced → "picture 3 is the visible one" · `LV1d` steps unfilled → "three steps filled" · `LV1e` section bounds removed → "after the story the panel has let go of the bar" |
| LV2 no swipe | `LV2` the captions made a horizontal scroller → "no horizontal scroller in the features" · `LV2b` all three sideways guards removed and a wide caption → "the page body never scrolls sideways" |
| LV3 vision | `LV3` white band → background · `LV3b` active dot restyled → "dot 2 is the active one" · `LV3c` dark headings → "the headings are white" · `LV3d` the rail not scrolling → "exactly one horizontal carousel" |
| LV4 join bar | `LV4` forced visible → "hidden while the hero is on screen" · `LV4b` the card hidden from the bar → "hidden while the closing card is on screen" · `LV4c` navy Join → "the Join button is pink" · `LV4d` placeholder number → "no number before the live figure" · `LV4e` link rerouted → "it takes the reader to the founding sign-up" · `LV4f` bar on every page → "not on /about" |
| LV5 drawer | the strip's height hidden from HeroPhone, as before D1 → "the corners are still rounded short of the bar" |
| LV6 reduced motion | `LV6` the picture's fade forced → "no cross-fade on the picture" · `LV6b` the bar's slide forced → "no slide on the join bar" |

**D1's before-and-after numbers:**

| | Before D1 | After D1 |
|---|---|---|
| Corner radius 40px short of the bar | 0px (handle opacity 0) | 2.4px |
| Corner radius at the bar | 0px | 0px |
| Where the grab handle stops the drawer | 100 (the bar is at 60) | 60 |

**Rewritten:** LC2 V1's phone branch now expects the navy band with three carousel cards. Its break `V1p` turns it red at "the phone's vision band is navy".

**Retired:** v1's LM2, LM3's rows half, and LM6's swipe half, with their breaks.

## Dev

`index-BbeaZ_TR.js`, checked at 390 on dev:
- The story scroll works.
- The navy vision carousel is there.
- The join bar is hidden over the hero, shown over the features, and hidden with the closing card on screen.
- The drawer's corners and grab handle reach the bar.

## Correction to a commit message

`a2437a17` ("the run report and screenshots") says it also carries the three re-aimed breaks (LV1e, LV4b, LV4f). It does not: those edits were already in `1fcc6eec` (the locks), and `a2437a17` holds only this report and `shots/`.
