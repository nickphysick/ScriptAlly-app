# Landing hero trim (desktop + phone) — 3 Nov

Branch `release/live-1-hero`, off `release/live-1` at `1d62d264` (which already holds waitlist clarity).
Local only, not pushed. Dev deployed; prod untouched.

## False premises

- **"Become a founding writer" was already a constant.** `HERO_CTA` in `landingCopy.ts` held exactly those
  words (the join bar reads it), so both heroes now read it. No new constant.
- **The places bar is not 420px wide by nature.** It was 420 only because of its `max-width`. Its bar track is
  flexible, so the pair's natural (`max-content`) width is the label's, about 150px. So the block states the
  width once (`--mk-dh-fw: 420px`, a grid column, `min(…, 100%)`) and both fill it; neither the button nor
  the bar has a width of its own. That is one px value, on the block, not on the button.
- **The 36px gap is not the sum of two margins.** The sub-line's 28px bottom margin collapses with the block's
  top margin, so the gap is the larger one. My first attempt (an 8px top margin) measured 28.0; the block
  now carries 36px.
- **The founding band has no id of its own**, so the desktop link's href is the band's field
  (`#mk-band-email`). The phone's is the pass card (`#mk-close-signup`). Both still run `scrollToJoin`.
- **`release/live-1` had a red lock at 1440.** `landingOnly` C3 requires "Become a founding writer" on the
  landing; after waitlist clarity the desktop page carried no such words (nav and hero both said "Join the
  waitlist"). I missed it in that run. The trim puts the words back, so it is green again.
- **WLC-3's reduced-motion case on phones was flaky before this work.** On a cold load
  `document.fonts.ready` can resolve with no webfont loaded yet; the h1 wraps in the fallback face for a
  moment and the page above the pass card changes height after the jump. The page re-aligns as designed, but
  the test read it as a scroll: 47px before the trim, 70px after (over its 60px tolerance). The test now waits
  for a real face before clicking (its own commit); three parallel runs land exactly.

## Commits

| SHA | |
|---|---|
| `8547a074` | 1 · desktop sub-line: "Track your entire campaign with **QueryHawk**." |
| `a210ff51` | 2 · desktop block: link "Become a founding writer" over the places bar, one shared width, 36px gap |
| `d325e66a` | 3 · phone block: the same link, to the pass card; heading and ticks gone |
| `72a0fc3c` | 4 · `HERO_FOUNDING_HEADING` / `HERO_FOUNDING_TICKS` deleted; HT-1–5 land |
| `823147e2` | WLC-3 waits for a real webfont before clicking (test only) |
| this | the report |

## Red → green

- **HT-1–HT-5** (`src/marketing/heroTrim.test.tsx`): 9 of 10 red on the tree before the work, each for its
  intended reason (old sub-line; heading present; no link; no grid width; gap 32; phone heading; no phone
  link; label not `HERO_CTA`; constants still exported). The tenth (`FOUNDING_CTA` stays "Join the
  waitlist") is a guard that must stay green. All 10 green after.
- **HT-6** (`tests/e2e/heroTrim.public.ts`), on the rendered page: red on the before build at both widths;
  green after.
- **Re-pointed:** WLC-1 and WLC-2 (the blocks' new shape; WLC-2b retires with the ticks), WLC-3's source check
  (`onClick={joinFromHero}`), the hero smoke (new label; exactly one link, and it stays on the page),
  `landingCopy.test.ts` and LW-13 (the new sub-line).

## Gates (no worse than baseline)

| | Baseline | After |
|---|---|---|
| `tsc --noEmit` | clean | clean |
| `build:prod` | clean, no diagnostics | clean, no diagnostics |
| Vitest | 662 files, 10,098 passed | 663 files, 10,106 passed (+10 HT, −2 retired WLC) |
| Public e2e (`--project=public`) | 4 failed (HT-6 ×2, LW-13, C3) | all green apart from the WLC-3 flake, then fixed |

## Measured (fixed count, 48 of 50)

| | Before | After |
|---|---|---|
| Desktop 1440×900, `.mk-dh-card` | 632.4 | **472.4** |
| Desktop, band top | 748.4 | 588.4 |
| Desktop, sub-line | 2 lines | 1 line |
| Desktop, sub-line → button | 171.8 | 36.0 |
| Desktop, button / places bar width | 198.2 / 420 | 420 / 420, one left edge, label centred to the pixel |
| Phone 390×844, `.mk-wl-hero` | 693.7 | **560.1** |
| Phone, hero foot → Birds-eye heading | 84.0 | 84.0 (no new gap) |
| Phone, chevron centre vs hero foot | on it | on it |

Both heroes' links scroll to their founding section and focus its field (WLC-3, phone and desktop, smooth and
reduced motion).

Screenshots: `shots/before-desk.png`, `shots/after-desk.png` (1440×900), `shots/before-phone.png`,
`shots/after-phone.png` (390×844). Readings: `after-readings.json`.

## Unchanged

Nav button ("Join the waitlist"), headline, strap, hawk, phone lockup, chevron, founding band and pass card
(their buttons still read "Join the waitlist"), emails, /welcome.

## Prod (Nick's)

From `~/ScriptAlly-live` (on `release/live-1`):

```
git merge --ff-only release/live-1-hero
npm run build:prod && node scripts/live-preflight.mjs
firebase deploy --only hosting --project prod
```

Hosting only: nothing under `functions/` changed.

## Landing on main (not done)

`main` has none of the waitlist-clarity or hero-trim work: 14 commits on this branch are not on it. One of
them, `456efbac` (the confirm-link fix), should be left out: `main` already carries its own version
(`61c1e6ad`, with the runbook in `81df76a8`), so a plain merge of `release/live-1` would bring the same change in
twice. The route is a worktree off `main`, then cherry-pick in order:

- the eight wlc commits, `409dd29a` … `1d62d264`;
- the six hero-trim commits, `8547a074` … the report.

Expected conflicts: `MarketingShell.tsx` — keep `main`'s `HERO_CTA` import (its phone menu reads it)
beside wlc's `WAITLIST_CTA`; `landingCopy.ts`, where `WAITLIST_CTA` must stay above `FOUNDING_CTA`. Then the
gates and the public e2e project.
