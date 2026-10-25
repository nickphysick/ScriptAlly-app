# Public pricing page on phones — report (25 Oct 2026)

Public `/pricing` at and below 760px, built to `design-refs/pricing-page-mobile-v1.html`
(sha256 `0d81bf25d95a5b2f23b7998f657d590471d5b3f83f0317f7d1f7d6bae16769d7`, verified and enrolled in
`.refhashes.json`). Above 760px the v4 page renders exactly as before.

**Where the work lives.** Pricing v4 is **only on branch `pricing-v4`** (tip `f1ce9608`, not in
`origin/main`). So this pack is on a new branch, **`pricing-v4-mobile`**, cut from that tip in the
worktree `../ScriptAlly-pv4m` (0 commits behind `pricing-v4` at the start). Pushed; **not merged**.

**On dev: https://scriptally-dev.web.app/pricing** (open it on a phone, or at 760px wide or less).
Bundle `index-Cq-MSqjH.js`, deployed from `dev/pk26-pvm` (`b9ce299b`, pushed) = the branch dev was
serving (`dev/hm31-pv4-qc1492-dh41-cl24-hm32-pk26` `223f2453`, `index-CshX-PZa.js`) + this pack, so
nothing else left dev. The phone locks ran against the deployed site: 17 passed.

## False premises and surprises, first

1. **The ref was not in `design-refs/`.** It was in `~/Downloads/pricing-page-mobile-v1.html` with
   the right hash; copied in and enrolled.
2. **On dev the headline says "first 50 writers", not 100.** The dev branch carries "Founding cap is
   50" (`986a7b35`, on `main`), which builds the shared `PV4_H1` from the cap. This pack reads that
   constant, so both trees say 50 there. On this branch alone (cut from `pricing-v4`) it still says 100.
3. **That same commit left v4's PV4-2 red on the dev branch.** PV4-2 expects the box's only number to
   be 100. It is red on the integration before and after my merge; it is not this pack's to change.
4. **The perched drawing loses its top few pixels under the nav.** In the ref the hawks cross the
   stand-in nav, which scrolls with the page. The real phone nav is sticky and paints above the page,
   so at rest the top ~6–8px of the drawing sit under it. The ref's values (right 8, top −58, 112px)
   are kept; moving the art would be a design change.
5. **The `flow-root` the brief asks for is the second guard, not the only one.** The shell's sheet
   is a flex item, which already starts its own formatting context, so removing the `flow-root`s alone
   changes nothing. They are kept (they are the page's own guarantee), and the lock reproduces the
   draft's bug by taking both away (see PVM-2).
6. **The shared form's privacy note** ("We'll only use your address…") renders under the button, as
   it does on desktop v4. The ref doesn't draw it. The first screen still holds everything at 390 × 844.
7. **Line breaks differ slightly from the ref** in a few paragraphs (the note on question 2, the why
   sentence, the box's sub). Same face, sizes and spacing; the app's Source Serif 4 file sets a little
   narrower than the ref's embedded copy, as v4 found.
8. **`/plans`'s v4 captures no longer match the live page**, by 43px of the signed-in account's own
   data in the sidebar, on the untouched v4 build too. `/plans` is compared same-day instead (below).
9. **The 810 estimate cases are now recorded from the phone ref.** Its script prints the new tails;
   against the desktop ref's recording the two files differ in exactly the 321 tail sentences that
   used to sell a month at £5.99, and in nothing else.

## Gates: baseline and final

Read as counts. The three `functions/` failures are the same three v4 recorded.

| Gate | Baseline (before any edit) | Final (phase 4) |
|---|---|---|
| tsc | `tsc exit 0`, no output | `tsc exit 0`, no output |
| build | `✓ built in 11.77s`, no errors or warnings | same |
| vitest | `Test Files  3 failed \| 637 passed (640)` · `Tests  1 failed \| 10200 passed \| 3 skipped (10204)` | `Test Files  3 failed \| 638 passed (641)` · `Tests  1 failed \| 10209 passed \| 3 skipped (10213)` |
| v4 e2e (`pricingV4` + `landingColoursV2`) | `16 passed` · `4 skipped` | with the new files: `34 passed` · `5 skipped` |
| phone locks on deployed dev | — | `17 passed` · `1 skipped` (the screenshot pass) |

Failing both times: `functions/eval/run.test.ts`, `functions/src/email.test.ts` (load failures) and
`functions/src/smartImportCore.test.ts` (the 32k streaming case). The +1 file and +9 tests are
`pricingPhone.test.tsx`. Full logs: `reports/pricing-v4-mobile/{baseline,phase1,phase2,phase3,phase4}/`.

**Desktop `/pricing`:** byte-identical before and after at 1440 × 900 and 761 × 900, closed and open,
and case (a)'s result with only the tail sentence masked (`pricingMobile.desktop.measure.ts`, captures
in `desktop/`). The before captures came from an untouched build of `pricing-v4`, served alongside.
**`/plans`:** byte-identical at 1440 and 390, captured the same day from the base build and this one
(`plans/`).

## Commits (branch `pricing-v4-mobile`)

Each also adds its gate logs under `reports/pricing-v4-mobile/`.

- **`4a7ce48c` phase 1: the founding box.** `design-refs/pricing-page-mobile-v1.html`,
  `design-refs/.refhashes.json`, `src/marketing/{PricingPage.tsx, PricingPhone.tsx, pricingParts.tsx,
  pricingCopy.ts, pricingCopy.test.ts, campaignEstimate.ts, campaignEstimate.test.ts,
  campaignEstimate.ref.json, marketing.css, marketingPageSmoke.test.tsx, marketingTokens.test.ts}`,
  `scripts/pricing-mobile-refoutputs.mjs`, `tests/e2e/{pricingMobile.desktop.measure.ts,
  pricingV4.plans.measure.ts}`.
- **`832249cb` phase 2: tiers, plans, questions, sticky sign-up.** `src/marketing/{PricingPhone.tsx,
  marketing.css, marketingTokens.test.ts}`.
- **`76b1c6c5` phase 3: Which plan suits me best?** `src/marketing/{PlanSheetPhone.tsx,
  PricingPhone.tsx, marketing.css}`, the phase 3 shots.
- **`fa6cb197` phase 4: locks.** `tests/e2e/{pricingMobile.measure.ts, landingColoursV2.measure.ts,
  pricingV4.measure.ts}`, `scripts/pricing-mobile-mutate.mjs`, `src/marketing/pricingPhone.test.tsx`,
  `CLAUDE.md`, the red-before records and the shots.
- This report: a fifth commit. Dev integration: `dev/pk26-pvm` `b9ce299b` (merge; two conflicts, both
  two sides adding independent lines: `.refhashes.json` and `landingColoursV2` S1).

## What was built

- **The switch.** `PricingPage` calls `usePhone` (the landing's 760px) and renders `PricingPhone` or
  the unchanged desktop tree, never both. `Price` and the perk drawings moved to `pricingParts.tsx` so
  both trees draw them.
- **The top.** The ink runs 150px under the nav; the oat sheet starts there with 20px top corners; the
  box straddles the join with the ref's gradient, hairline and shadow; the drawing is perched, mirrored.
  The live counter, the shared claim form (field at 16px), and the "What founding writers get" toggle
  over the perks carousel with following dots and the navy How it works card.
- **Then, once we launch.** The Free / Pro switch over a scroll-snapped track; a tap scrolls, a swipe
  moves the switch, and the cards keep their own heights. (The ref's switch briefly flips back during
  a tap's smooth scroll; this one waits for the scroll to arrive.)
- **Pro plans.** The 2 × 2 grid, the saving on its own line, the outlined compass button and its note.
  The fitting tile turns navy with its tag, which is a real element rather than CSS `content`.
- **Questions.** The eight as an accordion.
- **The sticky sign-up.** Shows once the form is out of view under the sticky nav; hides while the
  sheet is open; absent without a live figure and once the form has been used; the page gains 74px at
  its foot while it shows. Its button scrolls to the top and focuses the field.
- **The sheet.** A modal bottom sheet (focus held, Escape and the scrim close it, focus returns to the
  opener, the page doesn't scroll), the journey's own logic and words, the phone's option cards, length
  row and stepper, the result in the ref's order. "See it in the plans" closes it, focuses the plans'
  button and lands Pro plans 10px under the nav.
- **Reduced motion:** no sheet slide, thumb slide, chevron or + turn, note rise or smooth scrolls.
- **The shared tails.** "If you're still querying after that, we'll be in touch with options to
  extend." and "If your last replies run late, we'll be in touch with options to extend." on both
  widths; `ADD_MONTH_PRICE` is deleted.

## Screenshots

Side by side, app beside ref, in `reports/pricing-v4-mobile/compare/`: `1-top`, `2-open`, `3-tiers`,
`4-plans` (with the sticky bar), `5-q2`, `6-result`, `7-faq`. The single shots, plus the 375 × 667
top and result (`1-top-375-app.png`, `6-result-375-app.png`), are in `shots/`. Desktop before and after
are in `desktop/`.

Visible differences from the ref: the real nav and footer instead of its stand-ins (and the founding
pill in the nav); the privacy note under the form; the few line breaks above; the drawing's top under
the sticky nav; and, on dev only, "50" in the headline.

## Locks

**Added** (`tests/e2e/pricingMobile.measure.ts`, at 390 × 844 and 375 × 667 unless noted, and
`src/marketing/pricingPhone.test.tsx`). Every one proved red before it was believed; records in
`redbefore/`.

| Lock | The break | Went red |
|---|---|---|
| PVM-1 switch (760 phone, 761 desktop, one h1) | run against the untouched v4 build | yes, `phone tree @760` (`base-switch`) |
| PVM-2 box across the join | box margin 0 | yes (`css-across`) |
| PVM-2 drawing mirrored | `transform: none` | yes (`css-mirror`) |
| PVM-2 drawing perched above the box | `top: 20px` | yes (`css-perch`) |
| PVM-2 sheet not moved (flow-root) | the draft's bug: no formatting context between box and sheet | yes, sheet at 94 not 210 (`css-collapse`) |
| ″ | the `flow-root`s alone removed | **stays green, by design** — the shell's flex item is the other guard (`css-flowroot`) |
| PVM-3 first screen at 390 × 844 | 300px above the H1 | yes (`css-fold`) |
| PVM-4 carousel dots | `perkIndex` returns 0 | yes (`src-dots`; unit `unit-dots`) |
| PVM-5 tap scrolls the track | the scroll removed | yes (`src-tiertap`) |
| PVM-5 swipe moves the switch | the handler removed | yes (`src-tierswipe`) |
| PVM-5 Free shorter than Pro | `align-items: stretch` | yes (`css-stretch`) |
| PVM-6 focus held / page still / focus returns / one tile | four breaks in one build | yes, each its own message (`src-sheet`) |
| PVM-7 hidden by the form | bar forced on | yes (`css-stickshow`) |
| PVM-7 never over the footer | the 74px padding removed | yes (`css-stickpad`) |
| PVM-7 hidden by the sheet / field focused / 7b absent without a figure | three breaks in one build | yes, each (`src-sticky`) |
| PVM-8 accordion shows its answer | answer `display: none` | yes (`css-answer`) |
| PVM-9 no "pass" / no £5.99 / tails = ref / questions verbatim | £5.99 tail back, a "pass", a question reworded | yes, each (`src-copy`) |
| PVM-10 faces | H1 Georgia; sub Georgia; toggle serif | yes, each (`css-face`, `css-serif`, `css-mono`) |

Under the `copy` break, "the tail is the estimate module's" stays green because the break is *in* the
module; "the tail is the ref's" is the one that catches it, which is why both are asserted.

CSS breaks: `PVM_MUTATE=<name>`. Behaviour breaks: `node scripts/pricing-mobile-mutate.mjs apply
<name>`, `npm run build:dev`, run, `… restore` (path-named backups; refuses to stack). Sources were
checked clean after every restore.

**Re-pointed:**
- `landingColoursV2` S1: `/pricing` at ≤760 has 20px top corners (bottom still 18).
- `landingColoursV2` F2: at ≤760 it reads the phone box (`.mk-pvin`). Its `F2pricing` break now names
  both counters, and was proved red on the phone half separately (`lc2-F2pricing-phone`).
- `pricingV4.measure.ts` shots: 390 removed; the phone is photographed by the new file.
- `pricingV4.plans.measure.ts`: can write to another folder (`PV4_PLANS_DIR`), for same-day captures.
- `marketingTokens`: the sheet-wide negative-margin list names the box, the track and the fit tag.

**Retired:** none.

## For Nick

1. **The drawing's top under the sticky nav** (premise 4). Options: leave it, nudge the art down by
   ~8px, or let the ink run on a few pixels more.
2. **The headline on dev reads "first 50 writers"** because main's founding cap is 50, while the ref
   and this brief say 100. Both trees read the one constant, so they agree with each other.
3. **PV4-2 is red on the dev branch** (it expects 100). It needs updating with the cap change.
4. **The sticky bar also hides once the form has been used** (sent, already on the list, full, or the
   service down). The ref doesn't cover that state; offering "Claim your place" after a claim seemed
   wrong.
5. **"See it in the plans" focuses the plans' own button**, not whatever opened the sheet: if the FAQ
   link opened it, returning focus there would scroll the page back down past the plans.
6. **Both tier cards carry `role="tabpanel"`** under the Free / Pro tablist, and both stay on screen
   (the next one peeks in). That is the ref's design; screen readers will hear two panels.
7. **Housekeeping:** I appended `.pvm-tmp/` to the repository's shared `info/exclude` (a scratch folder
   in my worktree). Harmless; remove it if you like.

## Dev URL

**https://scriptally-dev.web.app/pricing** — at 760px wide or less (any phone). Bundle
`index-Cq-MSqjH.js`, from `dev/pk26-pvm` `b9ce299b`.
