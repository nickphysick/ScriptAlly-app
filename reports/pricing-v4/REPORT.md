# Pricing page v4 — report (24 Oct 2026)

Public `/pricing`, built to `design-refs/pricing-page-v2.html` (sha256 `54441ed0…e503`, verified).
Four phases, all committed on branch **`pricing-v4`** (cut from `origin/main` `2050cc1c`), **not pushed and
not merged**. On dev: **https://scriptally-dev.web.app/pricing** (bundle `index-BkePzY_g.js`).

## False premises and surprises, first

1. **The ref was not in `design-refs/`.** It was in `~/Downloads/pricing-page-v2.html`, hash matching. It is
   copied in and enrolled in `.refhashes.json`.
2. **The primary checkout's `main` was 747 commits behind `origin/main`.** `HEAD..main` was 0 as the prompt
   asks, but `main` itself was stale. The work was done in a worktree (`../ScriptAlly-pricing4`) on a branch
   from `origin/main`; the shared checkout was not moved.
3. **"Restyle the existing counter" needed a change to `FoundingSignup.tsx`.** No existing variant reads
   "{n} places left". `tally` ("37/100 places claimed") had exactly one caller, this page, so it was
   **swapped** for a `left` variant (the file's own rule: swap, never add beside). Display only: the
   live-or-absent gate, the store and the form are untouched. The words come from a new builder,
   `foundingPlacesLeftLabel`, in `landingCopy.ts`.
4. **The shared form prints its privacy note** ("We'll only use your address to send your invite.
   Privacy.") under the button. The ref doesn't draw it. It stays: the note is inside the component on
   purpose (consent on every capture point). It makes the box about 30px taller than the ref's.
5. **The app's Source Serif 4 sets slightly narrower than the ref's embedded copy.** Computed styles are
   identical (family, size, weight, line-height); the line breaks differ, e.g. the result's "why" sentence is
   six lines in the app and seven in the ref. Same face, different font file.
6. **One unreproduced e2e failure.** One run of `pricingV4.measure.ts` reported 1 failed of 7, and I did not
   capture which test. Three later runs, and the run against the deployed site, were 7/7.

## Step 0: what was on main

Case **(b)**: Pricing v3 had landed whole (ref `pricing-page-v1`). Component by component:

| Part | On main (v3) | v4 |
|---|---|---|
| Opening | Navy founding band, `FoundingCounter variant="tally"`, the shared form | The founding box across the ink/sheet join (rebuilt) |
| Tiers | Free + Pro hanging from the band | Same two cards on the sheet; Pro's sub and note changed, its link removed |
| Plans | None (prices only inside the journey's result) | New: Pro plans container with four tiles |
| Journey | `CampaignJourney` "How long will I need?", its own section, a five-tile result row | Rebuilt to v2 inside the container, behind a link; no tile row; the page tile turns navy |
| Estimate | `campaignEstimate.ts` + 480-case ref JSON | Kept, extended ("I don't know", "Not sure yet"); ref JSON regenerated from v2 (810 cases) |
| Questions | Six | The ref's eight |

## Gates: baseline and final

Read as counts (the 3 `functions/` failures are pre-existing and outside this pack):

| Gate | Baseline (before any edit) | Final (phase 4) |
|---|---|---|
| tsc | `tsc exit 0`, no output | `tsc 0`, no output |
| build | `✓ built in 11.41s`, only the chunk-size note | same, no errors or warnings |
| vitest | `Test Files  3 failed \| 636 passed (639)` · `Tests  1 failed \| 9862 passed \| 3 skipped (9866)` | `Test Files  3 failed \| 637 passed (640)` · `Tests  1 failed \| 10200 passed \| 3 skipped (10204)` |

Failing both times: `functions/eval/run.test.ts`, `functions/src/email.test.ts` (load failures) and
`functions/src/smartImportCore.test.ts` (the 32k streaming case). The +338 tests are the larger ref sweep and
the new locks. Full logs: `reports/pricing-v4/{baseline,phase1,phase2,phase3,phase4}/`.

## Commits (branch `pricing-v4`)

Each also adds its gate logs under `reports/pricing-v4/`.

- **`cc5cd94f` phase 1: the founding box.** `design-refs/pricing-page-v2.html`, `design-refs/.refhashes.json`,
  `src/marketing/{PricingPage.tsx, marketing.css, pricingCopy.ts, FoundingSignup.tsx, landingCopy.ts,
  brandArt.ts, CampaignJourney.tsx, pricingPage.test.tsx, marketingPageSmoke.test.tsx,
  marketingTokens.test.ts}`, `tests/e2e/pricingV4.plans.measure.ts`.
- **`dce11c17` phase 2: tiers, Pro plans, questions.** `src/marketing/{PricingPage.tsx, marketing.css,
  pricingCopy.ts, pricingCopy.test.ts, campaignEstimate.ts, CampaignJourney.tsx, pricingPage.test.tsx,
  marketingPageSmoke.test.tsx}`.
- **`97e16b5e` phase 3: Which plan suits me best?** `src/marketing/{CampaignJourney.tsx, PricingPage.tsx,
  campaignEstimate.ts, campaignEstimate.test.ts, campaignEstimate.ref.json, marketing.css, pricingCopy.ts,
  pricingPage.test.tsx}`, `scripts/pricing-v4-{refoutputs,journey-shots}.mjs`; deleted
  `tests/e2e/pricingV3.measure.ts`, `scripts/pricing-v3-{refoutputs,shots,journey-shots}.mjs`.
- **`b480f915` phase 4: locks, faces, narrow widths.** `CLAUDE.md`, `src/marketing/{pricingPage.test.tsx,
  pricingCounter.test.tsx}`, `tests/e2e/{pricingV4.measure.ts, landingColoursV2.measure.ts,
  RETIRED-pricing-v4.md}`.
- This report: a fifth commit.

Dev integration: `dev/hm31-pv4` (local, not pushed) = `origin/dev/ver1-nbab-pkglink-hm1-ver21-hm2-hm3-ver22-hm4-hm31`
(`86661699`, which I built and confirmed produces the `index-Cg54IVTu.js` dev was serving) + `pricing-v4`. The
one conflict, `.refhashes.json`, was two added entries; both kept.

## The estimate's named cases (24 Oct 2026, from the ref running)

- **(a)** Getting ready · novel 80,000–110,000 · I don't know · Not sure yet → **"About twelve months"**,
  fit **12**. Why: "Going by a typical campaign, you'd send about 40 queries in four rounds, about six weeks
  apart. … We've allowed for Christmas and August, when agents slow down."
- **(b)** Ready to start · non-fiction · 40 · bigger batches → **"About five months"**, fit **6**.

## Screenshots

All in `reports/pricing-v4/`, app and ref at the same window size:

- `shots/top-closed-{1440,1280,390}-{app,ref}.png` and `shots/top-open-…`: the box closed and open.
- `shots/plans-q1-{1440,1280,390}-{app,ref}.png`: Pro plans with the questions open on question 1.
- `shots/result-{1440,1280,390}-{app,ref}.png`: case (a)'s result, with the 12-month tile navy.
- `phase3/journey-1440/{1-stage,2-kind,3-agents,4-pace,5-result}-{app,ref}.png`: case (a)'s five screens.
- `plans/before-{1440,390}.png` and `plans/after-{1440,390}.png`: the signed-in /plans page.

Differences from the ref that show in them: the privacy note under the form (premise 4), line breaks from the
font file (premise 5), the real nav instead of the ref's stand-in, and slightly lighter-looking type because
the ref sets `-webkit-font-smoothing: antialiased` and this tier doesn't. **/plans is byte-identical before and
after** at 1440 and 390 (checked after every phase).

## Locks

**Added, each proved red by removing its fix** (records in `redbefore/`; all source files restored and checked
byte-for-byte):

| Lock | The break | Went red |
|---|---|---|
| Copy, word for word (unit) | a perk title changed | yes (`unit-copy`) |
| No pass/passes, Wall of no, Corkboard, AI, "no card needed" (unit) | Pro's sub back to "A pass…" | yes (`unit-passes`) |
| No Smart Import "once" (unit) | "Bring your list across once…" | yes (`unit-smartimport-once`) |
| Counter: no figure, nothing (unit) | a hardcoded "63 places left" | yes (`unit-counter-placeholder`) |
| Counter: "{n} places left" (unit + PV4-2) | the builder returns "37/100 places claimed" | yes (`unit-counter-wording`, `e2e-counter-wording`) |
| One h1 (unit) | a perk heading as h1 | yes (`unit-h1`) |
| Toggle is a disclosure (unit) | `aria-controls` removed | yes (`unit-disclosure`) |
| Next gated; a novel needs its length (unit + PV4-3) | step 2 ignores the length | yes (`unit-novel-length`, `e2e-novel-length`) |
| "I don't know" sets 40 (unit) | it doesn't set the count | yes (`unit-idk-40`) |
| The stepper clears "I don't know" (unit) | it doesn't clear | yes (`unit-stepper-clears`) |
| "Not sure yet" = steady (810 ref cases) | unsure → brisk | yes, 242 cases (`unit-unsure-steady`) |
| Exactly the fitting tile navy (PV4-3) | three tiles lit | yes (`e2e-tile-highlight`) |
| PV4-1 box across the join | box margin 0 | yes (`e2e-across`) |
| PV4-1 drawing mirrored | `transform: none` | yes (`e2e-mirror`) |
| PV4-1 toggle centred ±1px (measured 0.01px) | `justify-content: flex-start` | yes (`e2e-centre`) |
| PV4-1 open gap 0 (measured 0.000) | 10px under the panel | yes (`e2e-gap`) |
| PV4-4 faces | H1 in Georgia; counter line in the serif | yes (`e2e-face`, `e2e-mono`) |
| PV4-5 fold at 1440×900 and 1280×800 | 400px above the H1 | yes, both sizes (`e2e-fold`) |
| Drawing's version = md5 = the band's (unit) | n/a, a reconciliation | not proved red (stated plainly) |

The `fold` break had to be raised from 260px to 400px. 260px still fit at both sizes, so that first attempt
proved nothing. The faces lock first used `fonts.check` alone, which can answer false before a face has been
requested. It now uses `fonts.load` and requires that a face was found.

**Retired** (`tests/e2e/RETIRED-pricing-v4.md`): `pricingV3.measure.ts` and the three pricing-v3 scripts; they
measured the v1 page.

**Re-pointed:**
- Unit locks for the band moved to the box. `marketingPageSmoke`'s counter-variant reconciliation now reads
  `["claim", "left"]` and asserts `tally` is absent.
- `marketingTokens`: the cream-on-navy scoping is back to `.mk-claimcard` only, and the negative-margin owner
  is `.mk-pv4 .mk-fb` instead of the old tiers.
- `landingColoursV2` S1: the /pricing note rewritten. The lock passes unchanged, because the sheet's corners
  are still ink against oat.
- `landingColoursV2` F2: /pricing is back in, since its counter and form are on a light ground again. A new
  break, `F2pricing`, reddens only that block.
- Full LC2 run green: `lc2-after.txt`.

## Left in place

- **For /plans:** `PRICING_TIERS`, `PRO_PRICE_MONTHLY`, `PRO_PRICE_YEARLY`, `FOUNDING_RATE_AFTER` and
  `FOUNDING_PERKS` in `landingCopy.ts`. Untouched; /plans reads them.
- **`.mk-fmcount` / `.mk-fmbar` / `.mk-fmfill` / `.mk-fmmeta` base rules:** kept, the `left` variant renders
  them. The orphaned `.mk-fmtally` / `.mk-fmof` rules were deleted.
- **`FoundingBand.tsx` still types the drawing's version itself.** `FOUNDING_ART` in `brandArt.ts` now holds
  it too, and a lock keeps the two equal. Moving the band onto the constant is a one-line follow-up in a file
  this pack couldn't touch.
- **The form still reports `source: "sealed-band"`.** A pricing source needs the server's closed source list
  and a functions deploy.

## For Nick

**The founding offer still reads two ways.** `/founders` (`FOUNDERS_DEAL`) offers "Six months free" and "Half
price after that". This page says founding writers get "the full power of QueryHawk Pro for an entire querying
campaign, free of charge", and its FAQ says "Just drop us a note to let us know you're done." Not changed here.

**What this page states that the app doesn't do yet:**
- **Pro plans and their prices** (1/3/6/12 months at £7.99/£19/£29/£45, add a month £5.99): nothing can be
  bought.
- **"It never renews automatically"** and **"We'll remind you a week before"** / **"in touch with options
  before it ends"**: there is no billing, renewal or reminder.
- **Free "Up to 20 agents":** the app caps Free at **5** (`db.tsx` `addAgent`), and /plans says
  **Unlimited**. The app disagrees with itself before this page adds a third figure.
- **Manuscript versions and submission packages as Pro-only:** packages are open to everyone
  (`PACKAGES_OPEN_TO_ALL = true`). I did not establish how versions are gated on the routed Manuscripts page;
  the only Pro chip I found is in `AllManuscripts.tsx`, which no route renders.
- **The Scout:** off (`SCOUT_LIVE = false`).
- **"Discounts for your network on launch" / an Early Bird discount:** none exists.
- **"Log in with your unique founder's code":** whether that matches how the invite and welcome code works is
  for you to confirm; this pack only renders the words.
- **"Free … for as long as you like":** fine today, but stated as a launch promise.

**Not pushed:** `pricing-v4` and `dev/hm31-pv4` are local branches. Dev's next deploy by another session will
replace this build unless one of those branches reaches them.
