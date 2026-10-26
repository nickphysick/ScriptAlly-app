# Landing page on phones, v1 — the founding strip, features you swipe, vision rows, a closing card

26 Oct 2026. Ref: `design-refs/landing-mobile-v1.html`, SHA256 `d5673781f248e845b120ca41910b28bf6ec85dc1003f2266c48becfecb74bd36`, verified and enrolled in the hash manifest.

- **On `main`:**
  - `355a46ea` — Phase 1, the strip.
  - `4991ddf0` — Phase 2, below the hero.
  - `ab827ee8` — Phase 3, locks.
  - A fourth commit carries this report, the shots and the second LM5 exemption.
- **Dev:** serves `index-CfxG5_bJ.js` from `dev/db71-plad-db71f-cl25-lm1`. That is the branch dev was serving before, `…-cl25`, with main merged in.
- **Prod:** untouched. No functions were deployed.

## False premises

1. **The strip moves the phone hero down by 40px, and HeroPhone was deliberately not changed.**
   - **What the ref shows:** its hero picture is 390 × 784, which is v3.2's stage under the 60px bar. The ref therefore keeps the hero as it is, pushed down by the strip, with its foot 40px below the fold at rest.
   - **What follows in the app:**
     - At rest the drawer shows 40px less.
     - Its top corners square off 40px before it meets the bar, because the drawer's travel is measured from the bar, not the strip.
     - The grab handle stops 40px short of the bar.
   - **Locks:** HM2 was rewritten to add the strip's height to the travel. Every other hero lock passes unchanged.
   - **If wanted:** a two-line change to `HeroPhone.layout` (measure from the strip's foot) would remove the corner and grab-handle effects. It is not done here, because the hero was on the do-not-touch list.
2. **The vision band is not white on desktop; it is stone** (`#e9e6e0`). The ref, which is normative below the hero, draws it white on a phone, so the phone rows are white and the desktop band is unchanged.
3. **The ref's closing-card counter is not a `FoundingCounter`.**
   - The ref's `.ct` is a 4px bar over "48 places left". Both `FoundingCounter` variants draw a different shape, and their internals were off-limits.
   - The card therefore uses `HeroPlaces`, the shared counter the desktop hero already draws in exactly this shape. It reads the same `foundingStore`.
4. **About also carried the retired offer** ("Six months free, half price after that…"). The offer-copy lock covers every public page, so About's closing sentence was reworded in `aboutCopy.ts` to the new terms. `AboutPage.tsx` was not touched. **Please check this sentence.**
5. **The ref's pill is burgundy (`#7c3a2a`).** Burgundy was retired from the public site (landing colours v2) and a lock forbids it, so the pill's text is rust (`--mk-rust`).

## Step 0 findings

- **The header's owner:** `MarketingShell.tsx`. On phones it rendered the logo, "QueryHawk", `FoundingNavPill` (the pill with ten segments and "N places left") and the menu.
- **The count's source:**
  - It is `foundingStore` (`useFounding`), with `FOUNDING_CAP` applied once in `withCap`.
  - The phone pill, the desktop hero counter (`HeroPlaces`), Pricing (`FoundingCounter variant="tally"`) and FoundingBand (`FoundingCounter variant="claim"`) all read it.
  - The new strip and the closing card read it too.
- **Pages that got the strip:** every public page shares `MarketingShell`, so all seven do: /, /about, /pricing, /contact, /founders, /terms and /privacy. The strip is shown only to logged-out readers, as the pill was.
- **The "full" behaviour:**
  - No counter on the site decides "full". The server decides it on a submission (`full: true`), and the sign-up then hides its form and shows `FOUNDING_FULL`.
  - At 0 places left, the strip reads "0 left" over a full track and still links to the sign-up, which says "full" when someone tries.
  - No new copy was written.
- **Pricing wording flagged (not changed):**
  - Main's public /pricing renders `pricingCopy.ts`. Its only "six months" is an FAQ answer about how long campaigns run ("Most first campaigns run around six months…"). That is about the campaign, not the offer, and LM5 exempts it by name.
  - `FOUNDING_PERKS` ("Six months' free Pro access", "Half price for as long as you need it") and `PRICING_TIERS`' founding tier ("for six months") still carry the old offer. Only the signed-in /plans page reads them. They need a decision with /plans.
  - On dev, the unmerged Pricing v4 FAQ says querying "often [takes] six months or more…". It is also about campaign length, and LM5 exempts that sentence by name too.
- **The sign-up screen:** `Auth.tsx` renders `FOUNDING_GETS`, so it now shows C1's four bullets. The file itself is untouched.
- **Locks found:**
  - **Unit:** the verbatim copy locks in `landingCopy.test`, `foundersCopy.test` and `marketingPageSmoke`, all rewritten with the copy.
  - **e2e:** HM4 (the pill counter), HM2 (the drawer's travel), LH17 (the phone pill's N), and LC2 N2/V1/F1 (the phone bar, vision cards and navy panel at 390), all rewritten in Phase 3.

## What was built (phones, ≤760px)

- **The strip:**
  - `FoundingStrip` is 40px, `#26324a`, white type, a pink track with a 6px minimum, and "48 left".
  - It counts down from the cap once: 1.4s, 0.6s after mount. Under reduced motion it shows the final value at once.
  - Before the count arrives it shows the words only.
  - On the landing page it takes the reader to the grown drawer's sign-up, otherwise to the closing card's. On every other page it goes to /founders.
  - `FoundingNavPill` and `.mk-navpill` are deleted.
- **The bar:** the mark, "QueryHawk" and the menu.
- **The swipe:**
  - `FeatureSwipe` is six 300px cards in the ref's order with its shorter copy, using the rows' own images and versions.
  - The dots and the "N / 6" count are derived from the scroll position. ← and → move one card.
- **Vision:** three rows, a 76px picture beside the heading and one line. There is no "Read our story" on a phone, because the ref draws none; /about is still in the nav and the footer.
- **The closing card:**
  - `FoundingClose` holds the shared `FoundingSignup` (`source="sealed-band"`, the band's existing value) and `HeroPlaces`, and links to /founders.
  - It adds the shared sign-up's privacy line, which the ref leaves out.

## Copy

- **C1:** `FOUNDING_GETS` is the four new bullets, used on the desktop band, the closing card and the sign-up screen.
- **C2:** "Make querying straightforward." on every layout.
- **C3:** the /founders deal cards read "The deal / A free campaign" and "For your friends / An Early Bird discount". The third card is unchanged.
- **C4:** the new strings are data in `landingCopy.ts`, and the closing card's "50" comes from `FOUNDING_CAP`.

## Gates

| Gate | Baseline | Phase 1 | Phase 2 |
|---|---|---|---|
| tsc | exit 0 | exit 0 | exit 0 |
| build (grepped) | clean | clean | clean |
| vitest | `Test Files  3 failed \| 638 passed (641)` / `Tests  1 failed \| 9868 passed \| 3 skipped (9872)` | identical | identical |

The three failing files are the same in every column: `functions/eval/run.test.ts`, `functions/src/email.test.ts`, and `functions/src/smartImportCore.test.ts` (the 32k ceiling). Nothing under functions/ was touched.

e2e: `landingMobileV1`, `landingHeroMobile`, `landingHeroV3` and `landingColoursV2` give `51 passed, 3 skipped` (LC2's capture and shots cases, which only run with their own flag). LM1–LM6 also pass against dev.

## Commits

- `355a46ea` **Phones — founding strip above a clean top bar**: `design-refs/landing-mobile-v1.html`, `design-refs/.refhashes.json`, `src/marketing/FoundingStrip.tsx` (new), `src/marketing/FoundingNavPill.tsx` (deleted), `src/marketing/MarketingShell.tsx`, `src/marketing/landingCopy.ts`, `src/marketing/marketing.css`.
- `4991ddf0` **Phones — features you swipe, compact vision rows and a short founding card; founding offer copy updated**: `FeatureSwipe.tsx` and `FoundingClose.tsx` (new), `FeatureRows.tsx`, `Vision.tsx`, `Landing.tsx`, `landingCopy.ts`, `foundersCopy.ts`, `aboutCopy.ts`, `marketing.css`, `foundersCopy.test.ts`, `landingCopy.test.ts` and `marketingPageSmoke.test.tsx` (all in `src/marketing/`).
- `ab827ee8` **Phones landing v1 — locks**: `tests/e2e/landingMobileV1.measure.ts` (new), `landingHeroMobile.measure.ts`, `landingHeroV3.measure.ts` and `landingColoursV2.measure.ts` (all in `tests/e2e/`), and `reports/landing-mobile-v1/mutation-proofs.txt`.
- A fourth commit: this report, `shots/`, and LM5's second named exemption (the Pricing v4 sentence found on dev).

## Screenshots (`shots/`, app left and ref right)

- `compare-390-0s.png`, `compare-390-settled.png`, `compare-390-scrolled.png`, `compare-375-settled.png`, `compare-375-scrolled.png`: the top of the page at first paint (counting from 50), after the count, and scrolled (strip gone, bar stuck).
- `compare-swipe1.png` and `compare-swipe3.png`: the strip on card 1, and on card 3 with "3 / 6" and the third dot lit.
- `compare-vision.png` and `compare-close.png`: the vision rows and the closing card.
- `desk-1440-band.png`: the desktop FoundingBand with the new bullets.
- From dev: `dev-390-top.png`, `dev-390-swipe.png`, `dev-390-vision.png`, `dev-390-close.png` and `dev-1440-band.png`.

The card sits slightly higher than in the ref, which is the 24 Oct "cards higher" change.

## Locks and their red-before proofs (`mutation-proofs.txt`)

**Added (LM1–LM6):**

| Lock | Break → red at |
|---|---|
| LM1 strip | `LM1` strip made fixed → "the bar sits right under it" (the strip left the flow; this check comes first) · `LM1b` fill at 90% → "the fill is (cap − left) / cap" · `LM1c` 48px → "40px tall" · `LM1d` pill put back → "no pill or segment bar" · `LM1e` placeholder "50 left" before the count → "no number before the live figure" |
| LM2 swipe | `LM2` rail not scrolling → third dot · `LM2b` active dot restyled → third dot · `LM2c` count frozen → "the count" · `LM2d` all three sideways guards removed (rail, sheet, html/body clip) → "the page body never scrolls sideways" |
| LM3 vision | `LM3` heading rewritten to "simple" → the rows' headings · `LM3b` 180px pictures → "each picture 76px wide" |
| LM4 closing card | `LM4` hawks inside the card → "overlap the card's top edge" · `LM4b` band hidden at 1440 → "the landing has the founding band" · `LM4c` one bullet removed → "the card's list is C1" |
| LM5 offer copy | "Half price…" written into the page → "no retired offer wording" |
| LM6 reduced motion | `LM6` smooth scrolling forced → "declares no smooth scrolling" · `LM6b` reduce check blinded → "the only count ever on screen is the final one" |

**Rewritten:**

| Lock | Change | Proof |
|---|---|---|
| HM4 | now reads the strip | fill at 80% → "the fill is the share taken" |
| HM2 | the travel includes the strip | existing break → red |
| LC2 N2 | the phone bar has no primary; the strip is navy with white type | `N2p` → "the founding strip is the lighter navy" |
| LC2 V1 | the phone band is white with three rows | `V1p` → "the phone's vision band is white" |
| LC2 F1 | reads the desktop widths only | — |
| LH17 | reads the strip's N instead of the pill's | — |

**Retired:** none.

## Dev

`index-CfxG5_bJ.js`, checked on dev:
- **At 390:** the strip reads "Become a founding writer · 48 left", the bar holds "QueryHawk" and the menu, the swipe strip has six cards, there are three vision rows, and the closing card is there.
- **At 1440:** FoundingBand lists the four new bullets.
