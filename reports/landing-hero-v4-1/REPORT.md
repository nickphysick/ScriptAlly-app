# Landing hero on desktop, v4.1: the hero in a card over the navy, a places counter, and 50 founding places — run report

25 Oct 2026. Ref: `design-refs/landing-hero-v4-1.html` (SHA256 `a39bbbb7…ab5ee`). I verified the hash, copied the file in from `~/Downloads` and enrolled it in the manifest. Desktop only (≥900px). The 761–899px stacked layout and the phone are unchanged, apart from the phone pill's cap.

## False premises and findings

1. **"Overhangs evenly, ~50px each way at 1440 × 860" — the ref's own rule doesn't do it.**
   - The ref places the pile by "front card's centre at the card's middle less 10px × scale". It only *looks* even because its `size()` runs once before its webfonts load and never re-runs.
   - Fire a resize in the ref after load and its own pile breaks out **10.7px above and 40.7px below** at 1440 × 860, and 1.9 / 26.5 at 1280 × 720.
   - The app re-measures when the fonts arrive (v3's rule), so the literal port gave 14.2 / 44.8.
   - The intent is stated three times: L3, the lock's "differ by ≤16px", and the approved picture. The formula is only the ref's means to it. So the app centres the **visible pile's extent** on the card instead, computed from each card's static CSS transform (never a live rect, because the cards are animating).
   - **Measured: 29.5 / 29.5 at 1440 × 860, 14.2 / 14.2 at 1280 × 720.** "~50px" isn't met by either: the ref as loaded is ~25.
   - Proof: putting the ref's formula back turns LH14 red ("above 14.2, below 44.8").
2. **At 1204 × 594 the pile does not break out of the card, in the ref or the app.** The card's floor (copy block + 90) is taller than the pile there: the ref measures −4.2 / −2.5, and the app −5.6 / −5.6, evenly inside. LH14 asserts evenness at every size, and breaking out only where the pile is the taller of the two.
3. **The counters already read one source.** The nav/phone pill (`FoundingNavPill`), the Pricing panel and the sealed band all read `foundingStore`, whose count comes from the waitlist endpoint. The new hero counter reads it too.
4. **The enforced cap is a Firestore field, not the constant.**
   - `functions/src/waitlistModel.ts`'s `DEFAULT_CAP` is only the fallback. The endpoint uses the `counters/waitlist` document's own `cap` field, and every write stores the cap back onto it.
   - Dev's endpoint answers `{"visible":true,"cap":100,"count":2}` today.
   - So the store now draws every counter against one client constant, `FOUNDING_CAP = 50` (`src/marketing/foundingCap.ts`). A unit lock holds the server's `DEFAULT_CAP` equal to it. The server's `cap` is ignored for display; `full` stays the server's to decide.
5. **The ref's seam fix has nothing to fix in the app.** Removing only the 3px seam shadow leaves the seam lock green: the app has no hairline between the nav and the hero, because the sheet's corners show the same ink. The shadow is kept, as belt and braces. The lock guards the navy itself and goes red when the navy goes.

## ⚠️ For Nick: the server still enforces 100

- **Firestore data:** set `cap: 50` on `counters/waitlist` on **dev** (`scriptally-dev`) and **prod**. Until that field changes, a 51st to 100th sign-up is still accepted. Every counter and string already says 50.
- **Functions deploy:** `functions/src/waitlistModel.ts` now has `DEFAULT_CAP = 50` (with its test). Not deployed, per C2. It only matters for a counter document with no `cap` field.
- **The founding invite email** (`functions/src/emailCopy.ts:39`) still says "There are a hundred founding places". It is under `functions/` and not the cap constant, so I didn't touch it (C2). It needs a one-word edit and a functions deploy.
- **The legacy holding page** (`holding/index.html`) now says 50 in both strings and in its script's `CAP`. It only reaches prod if you deploy `firebase.holding.json`.

## Every place the cap lived

| Location | What it is | Done |
|---|---|---|
| `functions/src/waitlistModel.ts:20` `DEFAULT_CAP = 100` | the server's fallback cap | → 50 (C2), not deployed |
| `functions/src/waitlistModel.test.ts:264–265` | the lock on it | → 50 (would otherwise go red) |
| Firestore `counters/waitlist.cap` | **the enforced cap** | flagged above (data, Nick's) |
| `src/marketing/pricingCopy.ts:26` `PV3_H1` "…our first 100 writers." | states the cap | derived: "…first ${FOUNDING_CAP} writers." |
| `src/marketing/pricingCopy.ts:118` FAQ "the hundred founding places" | states the cap | derived: "the fifty founding places" |
| `src/marketing/landingCopy.ts` `FOUNDING_FULL` "All hundred founding places are claimed…" | states the cap (the `full` message) | derived: "All fifty…" |
| `src/marketing/landingCopy.ts` founding tier tag "Available now · 100 places" and summary "For the hundred writers…" | state the cap | derived |
| `src/marketing/foundersCopy.ts:51` `{ b: "one hundred writers" }` | states the cap | derived: "fifty writers" |
| `src/marketing/aboutCopy.ts:173` "its first hundred writers" | states the cap | derived: "first fifty writers" |
| `holding/index.html` "0 / 100", "first 100 founding writers", `var CAP=100` | the legacy page | → 50 |
| `functions/src/emailCopy.ts:39` "a hundred founding places" | states the cap | **flagged, not touched** (C2) |
| Comments citing the refs' old "37 of 100" examples (`landingCopy.ts:255/263`, `FoundingSignup.tsx`, `PricingPage.tsx:74`, functions comments) | descriptions of history | unchanged |
| `src/lib/livingHeaders.ts:44` "a hundred or more", `legalCopy.ts:350` "£100", widths, test fixtures | unrelated | unchanged |

**P4, places left = 0.** The founding flow's existing `full` behaviour is unchanged. The server answers `full: true`, and the form shows `FOUNDING_FULL`, now "All fifty founding places are claimed. Join the waiting list and we'll be in touch as the next stage opens." The hero counter keeps drawing live: "0 places left" and a full bar. No new copy.

## Gates (no worse than baseline)

| | Baseline | Phase 1 | Phase 2 | Final |
|---|---|---|---|---|
| tsc | exit 0, 0 lines | same | same | same |
| build | exit 0, no errors or warnings | same | same | same |
| Vitest | `Test Files 3 failed \| 636 passed (639)` · `Tests 1 failed \| 9862 passed \| 3 skipped (9866)` | identical | identical | `Test Files 3 failed \| 637 passed (640)` · `Tests 1 failed \| 9865 passed \| 3 skipped (9869)` (+ foundingCap.test.ts) |

- The three failures are under `functions/` (`eval/run`, `email`, `smartImportCore`) and fail only because this worktree has no `functions/node_modules`.
- `tsc -p functions` shows the same missing-module errors and none in `waitlistModel.ts`.
- e2e, local: landingHeroV3 17/17; landingHeroMobile 13/13; landingColoursV2 9 passed, 3 skipped.
- On dev: landingHeroMobile 13/13, and landingHeroV3 16/17 → 17/17 after `455afc77`.

## Commits (all pushed to `main`)

- **`243a1092` Desktop hero v4.1 — hero in a card over the navy, with a places counter**
  - `src/marketing/Hero.tsx`, `HeroPlaces.tsx` (new), `landingCopy.ts`, `marketing.css`, `marketingTokens.test.ts`
  - `design-refs/landing-hero-v4-1.html`, `.refhashes.json`
- **`986a7b35` Founding cap is 50 — one source for every counter and the copy**
  - `src/marketing/foundingCap.ts` (new), `landingCopy.ts`, `pricingCopy.ts`, `foundersCopy.ts`, `aboutCopy.ts`, `foundingStore.ts`
  - `functions/src/waitlistModel.ts`, `functions/src/waitlistModel.test.ts`, `holding/index.html`
  - `src/marketing/pricingPage.test.tsx`, `marketingPageSmoke.test.tsx`, `foundersCopy.test.ts`
- **`10258877` Desktop hero v4.1 — locks**
  - `tests/e2e/landingHeroV3.measure.ts`, `tests/e2e/landingColoursV2.measure.ts`
  - `src/marketing/foundingCap.test.ts` (new), `src/marketing/foundingCap.ts`
  - `reports/landing-hero-v4-1/mutation-proofs.txt`
- **`455afc77` Desktop hero v4.1 — LH17 reads either Pricing counter** (see Dev below)
  - `tests/e2e/landingHeroV3.measure.ts`, `reports/landing-hero-v4-1/mutation-proofs.txt`

## Screenshots (`shots/`, app left, ref right, at 9s)

| Size | Overhang above / below (app) | Ref (as loaded) | Copy centre vs card |
|---|---|---|---|
| 1440 × 860 | 29.5 / 29.5 | 24.4 / 27.0 | −0.1px |
| 1280 × 720 | 14.2 / 14.2 | 13.1 / 15.2 | −0.3px |
| 1204 × 594 | −5.6 / −5.6 (inside) | −4.2 / −2.5 (inside) | 0.1px |

- `carded-{1440x860,1280x720,1204x594}.png`. The endpoint was stubbed at 3 claimed, so the app's counter reads 47, the ref's placeholder figure.
- `pricing-cap-50.png` and `phone-pill-390.png`: Pricing's heading "for our first 50 writers" and "2/50 places claimed", and the phone pill "48 places left". These were taken with the endpoint answering exactly as dev does (`cap: 100, count: 2`), which proves the store applies the client's 50.
- `dev-1440x860.png` and `dev-pricing.png`: the deployed build against the real endpoint.

## Locks

| Lock | State | Holds | Red-before |
|---|---|---|---|
| LH14 carded | new | The card exists; the copy's centre is within 8px of the card's; overhangs differ by ≤16px at all three sizes; it breaks out at both edges where the pile is taller | card pinned short → "the copy is centred in the card"; **the ref's formula restored → "breaks out evenly (above 14.2, below 44.8)"** |
| LH15 seam | new | Every row from mid-nav to the card's top, at x=20, is #1b2433 (77 rows) | navy removed → "every row is #1b2433"; shadow only removed → **stays green** (finding 5) |
| LH16 counter | new | Under the actions and left-aligned with them; "47 places left" against cap 50 from a server answering cap 100; label "47 of 50 founding places left"; fill 3/50 of the track (measured 0.05999) | fill forced 90% → fill fails; store's cap removed → "the cap every counter draws against" |
| LH17 cap | new, then widened (`455afc77`) | No rendered page (/, /pricing, /founders, /about, /contact) says "first 100", "100 places", "hundred founding", "first hundred" or "one hundred writers"; Pricing and the phone pill state the hero's N | store's cap removed → "no rendered marketing page states the old cap" (re-proved after the widening); Pricing H1 reverted → same |
| LH18 reduced motion | new | The counter's first visible state is final: `["47 places left\|6%"]` | reduced-motion guard removed → "one state, the final one" |
| foundingCap.test.ts | new (unit) | `FOUNDING_CAP` 50; the server's `DEFAULT_CAP` equals it (read as source); every cap string states it | `DEFAULT_CAP` back to 100 → 1 failed; `FOUNDING_CAP` 100 → 2 failed |
| LH6 | geometry moved | Was "front card centred on the copy". Now "the copy is centred on the white card" (the pile's centring is LH14's); 0.06–0.12px | (v3's proofs) |
| LC2 H1, S1 | retargeted | At ≥900px the landing's hero top is the nav's ink (27,36,51) and its foot the band's top colour (239,236,230); the sheet's top is ink there, so only its bottom arcs are read as light-inside-ink | — |
| v4 locks (loop, popover, chips, hawk, entrance, copy), phone guard HM1–HM17 | unchanged | all pass | — |

## Dev

- Dev was still serving my v4 deploy (`index-iPCNFY2_.js`). I merged `origin/main` into it as `dev/hm31-pv4-qc1492-dh41`.
- It conflicted with the unmerged **Pricing page v4** on that branch (another session's), in `landingCopy.ts`, `pricingCopy.ts`, `pricingPage.test.tsx` and the hash manifest. I kept their side and applied the cap rule:
  - their `PV4_H1` derives "50" from `FOUNDING_CAP`;
  - their tests expect 50;
  - `foundingCap.test.ts` reads `PV4_H1` on that branch.
  - The merged branch type-checks and passes all 1,126 marketing tests.
- **Served bundle: `index-CoJiQpyX.js`.** At 1440 wide against the real endpoint:
  - the navy band, the white card, and the pile breaking out 29.5 / 29.5;
  - the counter counting down 50 → 49 → 48, then "48 of 50 founding places left";
  - Pricing's heading "for our first 50 writers", and its v4 counter "48 places left".
- **LH17 failed once on dev** for a selector, not a disagreement: Pricing v4 draws "N places left" where v3 draws "3/50". `455afc77` makes the lock read either, so it won't trip when Pricing v4 merges.
- Prod is untouched.
