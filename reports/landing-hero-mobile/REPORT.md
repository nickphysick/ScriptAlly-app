# Landing hero on phones (ref mobile v1), plus two desktop hero tweaks — run report

23 Oct 2026. Ref: `design-refs/landing-hero-mobile-v1.html` (SHA256 `43c898a3…73dc`, verified; it was in `~/Downloads`, copied in and enrolled in the hash manifest). Desktop ref unchanged: `design-refs/landing-hero-v3.html` (`eabf41bb…5bea0`, verified).

## False premises, and what survived from v3

- **No false premises about the hero.** `main` carries the v3 "No more winging it." hero with the living card. `HeroCard.tsx` is the ported variation 4 (`climb()`, the knots and the monotone clock, the entrance), and below 900px it falls back to the stacked default. All of it survived.
- **The brief says the pill replaces "Join free".** No such label exists. The anon nav CTA was "Become a Founding Writer" (cream). The pill replaces that, at ≤760px only.
- **The brief's lock "at 375 × 667 … the front card's bottom is no more than 12px below the drawer's resting top" can't hold alongside "never below 0.56".** The front card is about 690 frame units tall. At 0.56 that's 386px, and the drawer's resting top on a 667 screen is only 357px below the header. Measured: **57px past the drawer** at 375×667, even after the pile rises to a 24px top. HM1 asserts the 12px rule where it can hold (390, 430), and where the floor binds it asserts that the scale **is** the floor. Consequence: on a 667px screen the card's last panel ("Eleanor wants the full!") sits mostly under the drawer. Only a lower floor (about 0.45) would show it. **Your call.**
- **The ref shows a count of 50 places.** The real cap is the server's: **100**. Dev's store reports **2 claimed** (`{"visible":true,"cap":100,"count":2}`). Prod returns no count (`{"visible":false,"cap":100}`), so on prod the pill shows its first line only.

## Waitlist source

`"landing-panel"`. The server's `readSource` (`functions/src/waitlistModel.ts`) only accepts a fixed list and maps anything else to `"unknown"`, so adding `"hero-drawer"` would need a functions deploy. Nothing under `functions/` was touched.

## Gates (no worse than baseline)

| | baseline (aead5c39) | final (5e9392f8) |
|---|---|---|
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npx vite build` | exit 0, no `error` / `[WARNING]` lines | exit 0, no `error` / `[WARNING]` lines |
| `npx vitest run` | `Test Files  3 failed \| 636 passed (639)` · `Tests  1 failed \| 9861 passed \| 3 skipped (9865)` | `Test Files  3 failed \| 636 passed (639)` · `Tests  1 failed \| 9861 passed \| 3 skipped (9865)` |

The three failing files are all under `functions/` (`eval/run.test.ts`, `src/email.test.ts`, `src/smartImportCore.test.ts`). They fail because the measurement worktree has no `functions/node_modules`. They're identical before and after this work.

## Commits (all on `main`, pushed)

| hash | message | files |
|---|---|---|
| `8c63f522` | Landing hero — shorter climb after partial sent, and Watch again | `src/marketing/HeroCard.tsx`, `Hero.tsx`, `heroCard.css`, `landingCopy.ts`, `design-refs/landing-hero-mobile-v1.html`, `design-refs/.refhashes.json` |
| `035ade6d` | Marketing nav on phones — founding pill with places left | `src/marketing/usePhone.ts` (new), `FoundingNavPill.tsx` (new), `MarketingShell.tsx`, `marketing.css`, `landingCopy.ts` |
| `c200b670` | Landing hero on phones — card under the header, pull-up drawer, founding sign-up | `src/marketing/HeroPhone.tsx` (new), `HeroCard.tsx`, `Landing.tsx`, `heroCard.css`, `marketing.css`, `landingCopy.ts`, `public/images/hawk-fly.webp` (new), `public/images/binocular-hawk.webp` (new) |
| `5e9392f8` | Landing hero on phones — locks | `tests/e2e/landingHeroMobile.measure.ts` (new), `tests/e2e/landingColoursV2.measure.ts`, `tests/e2e/landingHeroV3.measure.ts`, `src/marketing/landingCopy.test.ts`, `reports/landing-hero-mobile/mutation-proofs.txt` |

## Phase 1 — desktop (1440 × 780)

- **D1.** The climb is now `Math.max(900, Math.min(2800, n*110))`. Day 40 → Day 86 on the odometer takes **5.0s**, against **13.1s** on the previous dev build (same probe). The dots-to-landing climb itself is **2.8s** by construction (46 days, capped; it was 11.0s). The odometer's smoothed curve also eases through the typing of the line before it, which is why the counter's own run is longer than the climb.
- **D2.** "Watch again" sits just above the front card's top-right corner (`shots/p1-again-1440.png`). Three seconds after pressing it the card is back at Day 37, "Partial requested", with no animations on the back cards or the cast shadow, so the cards were not re-dealt (`shots/p1-replay-3s-1440.png`). The pill sits outside the aria-hidden pile, is out of the tab order while hidden, and is not shown under reduced motion.

## Phase 2 — the phone header

Checked on all seven pre-login routes (`/`, `/pricing`, `/about`, `/contact`, `/founders`, `/terms`, `/privacy`) at 390×844 and 375×667:
- the nav is 60px and on one row;
- nothing scrolls sideways;
- the burger opens and closes its panel;
- the pill navigates to `/founders`.

With a stubbed count of 14 of 50, the number counts up 0 → 25 → 35 → 36 with 3 segments filled. Under reduced motion it shows 36 at once. Shots: `shots/p2-nav-390-live.png` (live), `shots/p2-nav-375x667.png` (no count: first line only).

## Phase 3 — screenshots against the ref (390 × 844)

Side by side, app left and ref right, captured on the same detected state in both:

| moment | file |
|---|---|
| 0.9s, cards mid-deal | `shots/compare-0.9s.png` |
| 2.0s, the hawk over the card | `shots/compare-2.0s.png` |
| the nudge form open | `shots/compare-nudge.png` |
| end of story, before the grow | `shots/compare-end-before-grow.png` |
| end of story, after the grow | `shots/compare-end-after-grow.png` |
| scrolled until the sheet meets the header | `shots/compare-scrolled.png` |

**Measured identical to the ref:**
- pile transform `translate(-438.08px, 30.48px) scale(0.68)`;
- the front card's rect (50, 340, 92, 502) and all four back-card rects;
- sheet top 466 grown;
- sheet top 60 with radius 0 once scrolled.

Visible differences, after the fixes below:
1. **Timing at 0.9s and 2.0s.** The app's clock starts after its bundle loads, so at the same wall-clock moment its deal and fly-past run a beat behind the ref's. This is a capture offset, not a design difference.
2. **The grown drawer's row sits about 15px lower than the ref's.** FoundingSignup always renders its privacy note ("We'll only use your address…"), which the ref doesn't draw. I kept it, because consent applies on every surface that takes an address. It's set at 10.5px, and the 128px rise is unchanged. The binocular hawk's branch tip now reaches the bottom edge.
3. **Below the drawer** the real StatusBand follows, not the ref's stand-in `.more` block. That's expected.
4. **The logo** is the brand mark, not the ref's placeholder disc.

Fixed during the phase (each found by this comparison):
- **The shell's 18px sheet corners** showed under the bar on the landing. They're now square there, with the ref's faint hairline under the nav.
- **The docked nudge form's typed note was in the sans.** It sat outside the pile's font reset, so `brand.tsx` won. The reset now covers the dock.
- **The docked form was 22px shorter than the ref.** The ref is content-box (no preflight). The dock now uses `content-box` for its chips, note and button. The desktop form is untouched and keeps v3's sizes.

## Deliberate departures from the ref

- **The front card takes no pointer on a phone.** The feed fits whole at 336px, and a scrollable card under the thumb would swallow the swipe that raises the drawer.
- **The grab handle is an `aria-hidden` pointer convenience.** The same travel is the page's own scroll.
- **Where the 0.56 floor binds, the pile rises toward a 24px top** (see the false premises above).
- **The pill reads `--mk-cream-btn` (#f3eee6)**, the house cream, against the ref's #f4f1ea.
- **On dev today (2 of 100), the formula fills 0 of 10 segments** (round(0.2) = 0), so the bar reads empty beside "98 places left". That's correct per the brief; flagging how it looks.

## Locks

New — `tests/e2e/landingHeroMobile.measure.ts`. Each was proved red by its named break (`HM_MUTATE`), or by a source mutation where only source can break it. Log: `mutation-proofs.txt`.

| lock | claim | red-before |
|---|---|---|
| HM1 | at 390/375/430: every card inside the width; the front card ≤12px past the drawer, or the scale is the 0.56 floor | `HM1` → "@390: nothing cut off on the left" |
| HM2 | the travel (534) brings the sheet to the header's foot, radius 0, over a sticky hero still in the DOM | `HM2` (stage not sticky) → failed |
| HM3 | the sign-up opens at the story's end unscrolled and is the FoundingSignup mount (`mk-drawer-email`, labelled "Email address"); scrolled first, it never opens | `HM3` (sign-up hidden) → failed; `HM3b` (scroll check blinded) → "scrolled first: the drawer does not grow" |
| HM4 | 14 of 50 reads "36 places left", 3 of 10 segments; no count, first line only | `HM4` → `toContain` failed |
| HM5 | "No more winging it." exactly once on the rendered page, at 390 and 1440 | source: desktop Hero also rendered on phones → "@390" |
| HM6 | reduced motion on a phone: Day 99, five lines, final panel, drawer grown, no fly-past, no Watch again, nothing running | `HM6` → "no fly-past"; source: instant grow removed → "the drawer arrives grown" |
| HM7 | no cast shadow on a phone; the fly-past is `/images/hawk-fly.webp?v=ebcb32c2`, one linear 1000ms pass at 1.5s | `HM7` (cast put back) → "phones draw no cast shadow" |

Rewritten (each phone branch has its own break, proved red):

| lock | was | now | red-before |
|---|---|---|---|
| landingColoursV2 N2 | the primary is the cream button; wordmark Playfair | at ≤760: the founding pill, wordmark Source Serif 4 | `N2p` → failed |
| landingColoursV2 N3 | nav heights = the pre-pack capture (390: 128.8); anchor = capture | at ≤760: 60px in both states; the anchor lands at the nav's foot (0, was 8.5) | `N3p` (scoped to ≤760) → "@390 rest 72" |
| landingColoursV2 H1 | `.mk-herowrap` paper white to its foot | at ≤760: the navy stage, the cream drawer, the question in ink | `H1p` → "stage 255,255,255" |
| landingColoursV2 S1 | four 18px corners | landing at ≤760: top corners 0, bottom arcs read | `S1p` → "/ @390" |
| landingCopy.test "phrase once" | counted the desktop strings | also counts the phone strings | `HERO_PHONE_JOIN` given the phrase → "owners of the phrase: … \| Join. No more winging it." |

Retired: **landingHeroV3 LH7 at 390.** Phones draw no cast shadow, so HM7 carries that claim. 820×900 now covers the stacked regime in LH7.

All of `landingHeroMobile`, `landingColoursV2` and `landingHeroV3` pass against this build (23 passed, 3 skipped: the colours suite's capture and screenshot cases, which only run on request). `landingHeroMobile` also passes against the deployed dev site (7 passed).

## Dev deploy

- Before the deploy, dev was serving `index-BP7RZ5a2.js`. Building `origin/dev/ver1-nbab-pkglink` (57387902) reproduced that hash, which confirmed it was the unmerged Versions v1 integration.
- To avoid wiping it, I deployed `dev/ver1-nbab-pkglink-hm1` (0b1b062c): that branch with `origin/main` (5e9392f8) merged in. The only conflict was `.refhashes.json`, resolved as the union of both lists. The branch is pushed.
- The served-hash check ran in the same command as the deploy, set to abort if dev had moved.
- **Dev now serves `index-C9MUhkiz.js`.** It contains the new hero (`mk-hp-sheet--grown` is present in the bundle). At 390 it matches Phase 3: `shots/dev-390-grown.png`, showing the live "98 places left".
- Prod was not touched.

## Open for Nick

1. **375×667:** lower the 0.56 floor (about 0.45 shows the final panel), or accept that the drawer covers the card's foot on short phones.
2. **The privacy note in the grown drawer:** keep it (it costs about 15px, and the hawk's branch reaches the bottom edge), or rule on a shorter wording or placement.
3. **Segments at 2 of 100 read empty.** Keep round(claimed/cap × 10), or show at least one filled segment once anyone has claimed a place.
4. `"hero-drawer"` as its own waitlist source needs a functions change and deploy; for now the drawer reports as `"landing-panel"`.
