# Pricing — the Pro ladder, monthly roll-on as small print, and Free / Pro tabs on phones (26 Oct 2026)

Built to `design-refs/pricing-plans-ladder-v1.html` (sha256 `18dc9e18…7f19`; desktop and wording) and
`design-refs/pricing-phone-plans-v1.html` (sha256 `1cb47871…6594`; layout A only). Both verified and enrolled
in `.refhashes.json`.

**Where the work lives.** `pricing-v4-mobile` is **not merged** into `main`, and its tip was still my report
commit (`f409b2c3`); there was no separate follow-ups commit. So this is a new branch, **`pricing-ladder`**, cut
from that tip in `../ScriptAlly-ladder` (0 behind at the start). Pushed; **not merged**.

**On dev: https://scriptally-dev.web.app/pricing** (bundle `index-uHn2OYsh.js`), deployed from `dev/db71-plad`
(`86e7376d`, pushed) = the branch dev was serving (`dev/pk26-pvm-qc1501-db71` `d1d80016`, `index-DQkxlpTl.js`,
confirmed by building it) + this pack. The ladder locks ran against the deployed site: 19 passed.

## False premises and surprises, first

1. **The refs were not in `design-refs/`.** Both were in `~/Downloads` with the right hashes; copied in.
2. **The ladder ref's Pro card has no price line and no sub.** Under "Pro" it goes straight to "Choose how
   long to start with." So "from £3.75 a month" and "A plan sized to your campaign. No subscription." are gone
   from the card (the second would now be untrue). The "from £3.75 a month" survives on the phone's Pro tab.
3. **The ref marks each row `aria-pressed` and `aria-checked`.** On a `role="radio"` only `aria-checked` is
   valid, so rows carry that, with roving focus and arrow keys, as a radio group should.
4. **No ref carries the estimate with the new tails.** The ladder ref's wording panel states the "run late"
   tail; the over-13-months tail is only in the brief. The recorded 810 cases therefore had exactly those two
   sentences substituted (206 + 115) by `scripts/pricing-ladder-tails.mjs`, which refuses any other counts.
   Everything else in the recording is still the phone ref's own output.
5. **`[hidden]` cannot be shown by CSS on this site.** The base stylesheet hides it with `!important`, so a
   CSS break for "both tab panels show" did nothing. That check is proved with a source break instead.
6. **Dev moved while I worked.** It was serving my own `dev/pk26-pvm` yesterday; today it serves Dashboard
   v71's branch on top of two Query Centre passes. I merged onto that, so nothing came off dev.
7. **v4's PV4-2 is still red on the dev line.** It expects the headline to say 100; main's founding cap makes
   it 50. Same red as last time, not this pack's.
8. **A commit of mine misfired.** `4ed345db` carries phase 4's message but only one file's deletion: `git add`
   stopped on that already-removed path, and the commit still ran because I'd joined them with `;`. The rest of
   phase 4 is the follow-up `a8825193`. Left as two commits rather than rewritten.

## Gates: baseline and final

| Gate | Baseline (before any edit) | Final (phase 4) |
|---|---|---|
| tsc | `tsc exit 0`, no output | `tsc exit 0`, no output |
| build | `✓ built in 14.63s`, no errors or warnings | same |
| vitest | `Test Files  3 failed \| 638 passed (641)` · `Tests  1 failed \| 10209 passed \| 3 skipped (10213)` | `Test Files  3 failed \| 638 passed (641)` · `Tests  1 failed \| 10213 passed \| 3 skipped (10217)` |
| pricing e2e (pricingMobile + desktop + pricingV4 + landingColoursV2) | `34 passed` · `5 skipped` | with pricingLadder, less the retired desktop file: `47 passed` · `6 skipped` |
| ladder locks on deployed dev | — | `19 passed` · `1 skipped` (the screenshot pass) |

The three failing files both times are the same `functions/` ones (two load failures and the 32k streaming
case). Skips are the opt-in screenshot passes. `/plans` is byte-identical at 1440 and 390, captured the same day
from an untouched build of the base and from this one (`plans/`). Logs: `reports/pricing-ladder/{baseline,phase1…4}/`.

## Commits (branch `pricing-ladder`)

- **`113c7388` phase 1: monthly roll-on wording.** `design-refs/{pricing-plans-ladder-v1.html,
  pricing-phone-plans-v1.html, .refhashes.json}`, `src/marketing/{pricingCopy.ts, pricingCopy.test.ts,
  campaignEstimate.ts, campaignEstimate.test.ts, campaignEstimate.ref.json, pricingPage.test.tsx}`,
  `scripts/pricing-ladder-tails.mjs`.
- **`64a80751` phase 2: desktop.** `src/marketing/{PricingPlans.tsx (new), PricingPage.tsx, CampaignJourney.tsx,
  pricingCopy.ts, pricingCopy.test.ts, pricingPage.test.tsx, marketing.css}`.
- **`e751d22b` phase 3: phones.** `src/marketing/{PricingPhone.tsx, pricingCopy.ts, pricingCopy.test.ts,
  pricingPhone.test.tsx, marketing.css, marketingTokens.test.ts}`.
- **`4ed345db` phase 4: locks** — only the deletion of `tests/e2e/pricingMobile.desktop.measure.ts` (premise 8).
- **`a8825193` phase 4: locks (the files).** `tests/e2e/{pricingLadder.measure.ts (new), pricingMobile.measure.ts,
  pricingV4.measure.ts, RETIRED-pricing-ladder.md (new)}`, `scripts/{pricing-ladder-mutate.mjs (new),
  pricing-mobile-mutate.mjs}`, `CLAUDE.md`.
- This report: one more commit. Each phase also adds its gate logs and shots under `reports/pricing-ladder/`.

## What was built

- **Wording (both widths).** The three FAQ answers verbatim from the ladder ref; the two tails; the small print
  "Renews monthly at £7.99 once your plan ends. Cancel any time." The £7.99 everywhere is the plan table's
  one-month price (`ROLL_ON_PRICE`), never a second literal.
- **One Pro card for both widths** (`PricingPlans.tsx`): "Pro", "Choose how long to start with.", the ladder
  (radio group, 6 months by default, rows in Special Elite with the mono line and price), the small print, the
  "Which plan suits me best?" link, then "Everything in Free, plus:". A result checks the fitting row and flags it
  "Fits your campaign"; exactly one row is ever flagged. Selecting a row changes nothing else.
- **Desktop.** Free and Pro side by side in the ref's .85 / 1.15 pair (1060 max). The questions open inline
  beneath the cards in a box with the old Pro plans box's 952 width, hairline and 26px radius; the link reads
  "Hide the questions" while open, the page scrolls to them and focus moves to the first question. The journey is
  unchanged.
- **Phones.** Layout A: "Free / £0" and "Pro / from £3.75 a month" tabs pinned under the nav on the oat, Pro open
  on arrival, one card at a time, arrow keys between tabs. "See it in the plans" closes the sheet, opens Pro,
  checks and flags the fitting row, scrolls the card to just under the tabs, and focuses that row.
- **Removed.** The Pro plans box and its tiles (desktop), the swipe track, its switch and the phone's Pro plans
  section, "Add to any plan", the "never renews" note, and the copy, helpers and CSS only they used.

## Screenshots

Side by side in `reports/pricing-ladder/compare/`: `desk-closed-1440` and `desk-fit6-1440` (app above the ladder
ref's desktop frame), `phone-pro-{390,375}` and `phone-free-{390,375}` (app beside layout A). All single shots,
including 1280 × 800, 761 and the 12-month phone results, are in `shots/`.

Measured against the ref's desktop frame at 1440 with "Fits 6 months": pair 1060 at x 190, Free 441 × 366, Pro
597 × 714, rows 525 × 67 — the ref's boxes exactly. Visible differences:
- "Then, once we launch:" starts where the Free card does. The ref puts it flush with its review frame, 62px
  further left, because that frame is wider than the cards.
- The questions' box is 952 wide (the brief's figure) under a 1060 pair, so its edges don't line up with the
  cards' edges.
- On phones: the real nav, and the sticky sign-up bar, which shows once the claim form is out of view, as built.
- The sticky nav overlaps the top edge of some desktop element screenshots, an artefact of how they were taken.

## Locks

**Added — `tests/e2e/pricingLadder.measure.ts`** (1440, 1280, 390, 375), every one proved red first (`redbefore/`):

| Lock | The break | Went red |
|---|---|---|
| PL-1 6 months on load | `LADDER_DEFAULT` = 3 | yes, all four widths (`src-default`) |
| PL-1 one checked at a time | 1 month stays checked | yes (`src-multi`) |
| PL-1 arrow keys | key handler returns early | yes (`src-keys`) |
| PL-1 mono lines / PL-5 retired words | "Add to any plan" back | yes, both (`src-line`) |
| PL-2 exactly one row checked and flagged | every row flagged on a result | yes, desktop and phone (`src-fit`) |
| PL-2 Pro tab opens | `setTab(1)` removed | yes (`src-seetab`) |
| PL-2 card in view under the tabs, focus on the row | the scroll and focus removed | yes (`src-seescroll`) |
| PL-3 only one card shows | both panels un-hidden | yes (`src-panels`; the CSS version can't work, premise 5) |
| PL-3 pinned under the nav | `position: static` | yes (`css-unpin`) |
| PL-3 arrow keys | `tabStep` returns null | yes (`src-tabkeys`) |
| PL-4 removals | a Pro plans box and a swipe track back | yes, both widths (`src-removal`) |
| PL-5 small print exactly once | under Free too / twice in the Pro card | yes, desktop (`src-small`) and phone (`src-small2`) |
| PL-5 FAQ and tails verbatim, retired words | an old tail and an old answer back | yes (`src-copy`) |

Unit: `pricingPage.test.tsx` and `pricingPhone.test.tsx` rewritten for the cards, the tabs (Pro selected, Free's
panel hidden, roving tab index), the ladder's default and the removals; `pricingCopy.test.ts` gains the ladder's
lines, the roll-on price, the small print and the tab lines; `campaignEstimate.test.ts` checks the new tails' counts.

**Rewritten:** PV4-3 (the fitting row is checked and flagged, instead of a navy tile), PV4-4 (faces on the row price
and the Pro card's link), PVM-6 (opened from the Pro card; ends at the close, since PL-2 owns the result), PVM-7
and PVM-10 (repointed), both screenshot passes; `marketingTokens`' negative-margin list (the tabs replace the track
and the tile tag).

**Retired** (`tests/e2e/RETIRED-pricing-ladder.md`): `pricingMobile.desktop.measure.ts` (it held the desktop
unchanged, and this pack changes it on purpose), PVM-5 (the swipe track), PVM-9 (folded into PL-5 at both widths),
the `stretch` break, and the retired subjects' breaks in `pricing-mobile-mutate.mjs`.

## For Nick

1. **The page now promises things that don't exist yet, because there is no billing.** In plain terms, it says:
   - every Pro plan **carries on month by month at £7.99 when it ends**, until the writer cancels;
   - **"We'll remind you a week before"** it rolls on;
   - **"Cancel any time"** (the small print);
   - Pro **is a subscription** ("Yes, but a flexible one");
   - on signing with an agent, **"Record your signing and we'll offer to stop your renewal there and then"**, and
     the plan runs to the end of the months paid for.
   None of these exists: there is no payment, no renewal, no reminder email, no cancel control and no offer
   on recording a signing. All are page copy under "Then, once we launch:".
2. **The questions' box is 952 wide under a 1060 pair**, as the brief specifies; its edges don't line up with the
   cards. Widening it to 1060 is a one-line change if you'd rather they align.
3. **"Then, once we launch:" is aligned with the cards**, not 62px to their left as in the ref (premise in Screenshots).
4. **PV4-2 needs updating for the cap of 50** on the dev line (premise 7).

## Dev URL

**https://scriptally-dev.web.app/pricing** — desktop, and at 760px wide or less for the phone layout. Bundle
`index-uHn2OYsh.js`, from `dev/db71-plad` `86e7376d`.
