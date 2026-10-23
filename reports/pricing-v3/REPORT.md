# Pricing page v3 — report (21 Oct 2026)

Public `/pricing` rebuilt to `design-refs/pricing-page-v1.html` (sha256 `9801fd52…a7be`, verified). It has a navy founding banner with the live counter above the claim form, "Then, once we launch:", Free and Pro, the "How long will I need?" journey, and the six questions. The signed-in `/plans` page is unchanged: its 1440 screenshot is byte-identical before and after.

**On `main`:** `08c9e22d` → `e2f14aa2` → `7eb9ff1e`, plus a follow-up commit (`.mk-tlink` removal and this report).
**On dev:** https://scriptally-dev.web.app/pricing, from `dev/css1-pv3`. That branch is the previously served `dev/about1-qc142-css1` with these commits merged in (tip `caa9a1e6`). It serves `index-BZj1FSmS.js`, and the live counter reads "2/100 places claimed".

## False premises, first

1. **The ref was not in `design-refs/`.** It was in `~/Downloads/pricing-page-v1.html`, and the hash matched. I copied it in and enrolled it on the ref watchlist.
2. **This checkout's `main` was 725 commits behind `origin/main`.** The work was done in a worktree (`../ScriptAlly-pricing3`) cut from `origin/main` (`a59c6757`). The primary checkout was not touched.
3. **The ref's counter line cannot be reproduced without forking the shared counter.** The ref says "63 places left · no card needed". The page uses the existing `FoundingCounter` `tally` variant, which reads "37/100 places claimed" in its own words. I did not edit it: `FoundingSignup.tsx` is not this page's to change.
4. **The waitlist has no `pricing` source.** The server's source set is closed, and an unknown value is recorded as `unknown`. The banner's form therefore reports as `sealed-band`. A `pricing-banner` source needs a change to `functions/src/waitlistModel.ts` and a prod functions deploy, which are Nick's.
5. **The ref's stated savings are not one rounding of its own prices.** The ref says 20 / 40 / 53%. The arithmetic gives 20.7 / 39.5 / 53.1%. The page prints the ref's words; a lock holds each saving within one point of the arithmetic.
6. **The ref stacks the three-option questions at 1100px.** That rule is left over from its older two-column calculator. The pack says options stack at 640px, so the pack is followed.
7. **The old page had no "Built around how querying works" section.** It had the comparison table and two questions. Both are gone.

Nothing else held up the work. `/pricing` on `main` was the three-tier page described in its header comment.

## Gates: baseline vs final

The baseline was taken on `a59c6757` in the worktree, before any edit.

| | Baseline | Final |
|---|---|---|
| tsc | `tsc exit 0` | `tsc exit 0` (after a one-line type fix in the e2e file) |
| build | `✓ built in 12.49s` · `build exit 0` | `✓ built in 9.76s` · `build exit 0`, no `error` or `[WARNING]` lines |
| vitest | `Test Files  3 failed \| 633 passed (636)` · `Tests  1 failed \| 9365 passed \| 3 skipped (9369)` | `Test Files  3 failed \| 636 passed (639)` · `Tests  1 failed \| 9861 passed \| 3 skipped (9865)` |

The three failing files are the same in both runs: `functions/eval/run.test.ts`, `functions/src/email.test.ts` and `functions/src/smartImportCore.test.ts`. Each fails with `Cannot find package …` because the worktree has no `functions/node_modules`. This is an environment gap, not a code fault.

## Commits

- **`08c9e22d` phase 1:** the founding banner, Free and Pro, and the questions.
  - `pricingCopy.ts` (new) and `PricingPage.tsx` (rewritten).
  - `marketing.css`: one `mk-pv3` block replaces the old pricing block.
  - `landingCopy.ts`: dropped the `PRICING_*` constants that nothing now reads.
  - Rewrote the smoke and token locks for the new page.
  - Added the ref and its hash, `scripts/pricing-v3-shots.mjs`, and the `/plans` before/after shots.
- **`e2f14aa2` phase 2:** the journey.
  - `campaignEstimate.ts` (pure), with `campaignEstimate.test.ts`, `campaignEstimate.ref.json` and `pricingCopy.test.ts`.
  - `CampaignJourney.tsx` and the journey CSS.
  - `scripts/pricing-v3-refoutputs.mjs` and `scripts/pricing-v3-journey-shots.mjs`.
  - The journey screenshots.
- **`7eb9ff1e` phase 3:** locks.
  - `pricingPage.test.tsx` and `tests/e2e/pricingV3.measure.ts`.
  - Re-points in `landingColoursV2.measure.ts`.
  - The mutation-proof logs and the narrow and ref-vs-app screenshots.
- **Follow-up:** removed `.mk-tlink`, which the old page was the last to render, and added this report.

## Screenshots (`reports/pricing-v3/shots/`)

- `ref-vs-app/`: the app and the ref at 1440×900, 1280×800 and 390×844, top and full page.
- `journey/`: the five journey screens, app and ref, at 1440×900, with answers "Getting ready · a novel · 80,000 to 110,000 · 40 · a few at a time" and the clock pinned to 21 Oct 2026. `side-by-side-1440.png` puts all ten together.
- `narrow/`: the top of the page, question 1 and the result at 1440×900, 1280×800 and 390×844, with a mocked counter.
- `plans-before-1440.png` and `plans-after-1440.png`: byte-identical (`cmp`).
- `dev-1440x900-top.png`: the deployed page with the real counter.

**Visible differences from the ref:**
- The ref's nav is a stand-in; the app shows the real one.
- The counter wording differs (false premise 3).
- The shared form's privacy line ("We'll only use your address…") sits under the form. It stays, because a page that asks for an email address needs it.
- Source Serif 4 is loaded with its optical-size axis in the app, so some lines run a pixel or two wider than the ref's static face.

The journey screens show no other difference that I could find.

## Locks

Every lock was proved red by breaking the thing it guards. The logs are `mutation-proofs-unit.txt` (12 mutations) and `mutation-proofs-e2e.txt` (8 mutations). Each mutation went red, and each for the reason its lock names.

**Added, unit (`src/marketing/pricingPage.test.tsx`, plus the estimate and pass-table tests):**

| Lock | Mutation that turns it red |
|---|---|
| The copy is the ref's, word for word | U1: rewording the sub |
| No "Wall of no", "Corkboard", "AI", or once-only Smart Import | U2: "The AI Scout"; U3: "across once" |
| The counter precedes the form in the DOM | U4: counter moved below the form |
| With no figure: no counter, and no number in the band but the H1's 100 | U5: a hard-coded "63 places left" (also turns the smoke lock red) |
| Only one h1, and it is the banner's | U6: a tier name made an h1 |
| Step gates: a novel needs its length; nothing pre-selected | U7: a novel passes without a length; U8: a pre-selected answer |
| Estimate equals the ref's output, all 480 cases | U9: one week off the read time; U10: August counted twice |
| Each saving within one point of the arithmetic | U11: a saving moved without its price |
| Every £ figure on the page comes from the pass table | U12: an invented "£2.50" |

**Added, rendered (`tests/e2e/pricingV3.measure.ts`):**

| Lock | What it asserts | Mutation that turns it red |
|---|---|---|
| PV1 faces | Special Elite 400 for display, Source Serif 4 for text and buttons, JetBrains Mono for labels; all three faces loaded | E1: H1 loses `!important` (renders Playfair); E2: inherit reset removed (renders Source Sans 3) |
| PV2 order | Counter sits above the form on screen | E3: CSS-only reorder. The DOM lock stays green here, which is why both locks exist. |
| PV3 counter | With no figure, no counter appears | E7 |
| PV4 journey | Gates hold; result equals `campaignEstimate`; exactly one tile is highlighted | E4: the gate; E5: two tiles highlighted |
| PV5 fold | Required items are visible without scrolling at 1440×900 and 1280×800 | E6 |

All five pass on the local build and on the deployed dev site.

**Retired, in `marketingPageSmoke.test.tsx`:**
- Free and Pro as `aria-disabled` labels.
- The live founding tier.
- The perched birds.
- The exact price set `["£0","£4.99"]`. This became a provenance sweep: every £ figure must come from the pass table.
- The tier-places slot.
- "The founding perks, in full, on the pricing page". The perks are no longer rendered on any public page; their wording is still locked in `landingCopy.test.ts`.

**Rewritten:**

| File | Change |
|---|---|
| `marketingPageSmoke.test.tsx` | The landmark is now the new H1. Kept: no db access, a single submit, the "for life" absence, and the counter check, now scoped to the band so the journey's "Question 1 of 4" is not read as a places figure. |
| `marketingTokens.test.ts` | Lower-surface readers no longer include `.mk-pricehead`. Navy-panel scope admits `.mk-pv3 .mk-pv3band`. The negative-margin owners swap `.mk-tier--founding` for `.mk-pv3 .mk-pv3soon` (the tiers hanging off the band). |
| `landingColoursV2.measure.ts` F2 | No longer reads the pricing tally as a light mount, because it now sits on navy. |
| `landingColoursV2.measure.ts` S1 | Reads `/pricing`'s sheet colour in the side gutter, because at 390px the band starts 10px in. E8 proves it red with the band running edge to edge. |

## Left in place deliberately

- **Constants in `landingCopy.ts`:** `PRICING_TIERS`, `PricingTier`, `PRO_PRICE_MONTHLY` (`£4.99`), `PRO_PRICE_YEARLY`, `FOUNDING_RATE_AFTER` and `FOUNDING_PERKS`.
  - `/plans` and its tests read them.
  - `PRICING_TIERS[*].illoAlt` and `FOUNDING_PERKS` now render on no surface. I left them because they are `/plans`' data.
- **CSS:** the `.mk-fm*` tally rules stay because the component is shared; the page restyles them only inside its own band.
- **Tier birds:** `public/images/tier-free.png`, `tier-founding.png` and `tier-pro.png` stay in place. Nothing in `src/` references them any more.

## What the page states that the app does not do yet

The page describes planned launch plans under "Then, once we launch:". Today's app differs:

- **Passes do not exist.** There is no 1/3/6/12-month pass, no "add a month" (£5.99), no pausing, no reminder a week before a pass ends, and no months kept as credit on signing. There is no payment path at all. The last question says so.
- **The prices are not the app's.** £7.99 / £19 / £29 / £45 appear nowhere else. `/plans` still says Pro is £4.99 a month.
- **Free's agent limit is 5 in the app** (`db.tsx`: `agents.length >= 5`). The page says "Up to 20 agents".
- **Submission packages are open to everyone today** (`PACKAGES_OPEN_TO_ALL = true`). The page lists them under Pro.
- **The Scout is off** (`SCOUT_LIVE = false`). The page lists it under Pro, and the result card says "Every Pro feature: … The Scout".
- **Manuscript versions and Smart email drop** are listed as Pro. I made no gating change for either; whether they are gated today is unchanged by this pass.
- **"Adding a second manuscript is coming soon, on every pass."** Today Free is limited to one manuscript (`FREE_MANUSCRIPT_LIMIT = 1`), and no pass exists.
- **The founding offer now reads three ways on the site:**
  - here: "free … campaign" and "stay free for their whole campaign";
  - the landing and `/founders`: six months free, then half price for as long as you need it;
  - the founding invite email: "for life".
  - **This needs Nick's ruling.**

## Housekeeping

- **Worktrees:** `../ScriptAlly-pricing3` is mine and is removed at wrap-up. `git worktree list` shows six others; offering Nick a cleanup.
- **Prod:** not touched.
- **Branches:** pushed `pricing-v3` and `dev/css1-pv3` (no PRs).
