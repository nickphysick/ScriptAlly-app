# Landing hero v3 — "No more winging it." with the living query card

Ref: `design-refs/landing-hero-v3.html`, SHA256 `eabf41bb17ca1bb8cf16b114feadef661ff690e4c1d81ad090c1528115b4bea0` (matched; enrolled in `.refhashes.json` in phase 1).
Branch: `landing-hero-v3`, worktree `../ScriptAlly-hero3`, cut from `origin/main` `e8d7b0c8`. Not pushed, not deployed.

## False premises and things found on the way

1. **The ref was not at `design-refs/landing-hero-v3.html`.** It was in `~/Downloads/landing-hero-v3.html` with the stated hash. I copied it in. (`design-refs/` held a different file, `scriptally-landing-hero-v3.html`, hash `d139bebb…`. That is an older landing ref, and I did not use it.)
2. **The primary checkout's `main` was 718 commits behind `origin/main`.** Its tree was dirty with another session's report files. I didn't touch it. I worked in a new worktree off `origin/main`, on a branch, so I could commit without moving the shared `main` ref. The phases below are on that branch, not on `main`.
3. **There is no `heroShadow` measure.** It is only cited in comments. The shadow's rendered lock is now LH7.
4. **`Auth.tsx` renders `HERO_H1`.** Its sign-up offer panel shows the hero's headline, by design: `accountScreens.test.tsx` checks that it reads the constant. So **that panel now reads "No more winging it." as well.** Auth.tsx is outside this pack's scope and I didn't change it. Nick's call whether the panel keeps following the hero.
5. **Source Serif 4 italic is not loaded** (index.html loads `opsz,wght` only). The card's *by email* is therefore a synthetic italic, in the ref's own markup. Index.html is out of scope.
6. **`landing-refdiff.mjs` was already red before this pack** on two rows that have nothing to do with the hero: `hero.navcta` MISSING (the nav button is no longer `.mk-btn--navy`) and `vision.band.background` (stone, not white). Landing colours v2 set both on purpose; its own N2 and V1 lock them. I judged this by reading the code and did not re-run it on the baseline.

## Gates

| | tsc | build | vitest |
|---|---|---|---|
| Baseline (`e8d7b0c8`) | `tsc exit 0` | `build exit 0`, no errors/warnings | `Test Files  3 failed \| 633 passed (636)` · `Tests  1 failed \| 9357 passed \| 3 skipped (9361)` |
| Phase 1 | 0 | 0, none | `Test Files  3 failed \| 633 passed (636)` · `Tests  1 failed \| 9362 passed \| 3 skipped (9366)` |
| Phase 2 | 0 | 0, none | same as phase 1 |
| Phase 3 | 0 | 0, none | same as phase 1 |

The three failing files are the same at every step, all under `functions/`: `eval/run.test.ts`, `src/email.test.ts`, and the `smartImportCore` streamed-call case. This worktree has no `functions/node_modules`.

## Commits

- **`4ddece0c`** — phase 1: copy, status band, card pile and cast shadow (static).
  Files: `src/marketing/{Hero.tsx, HeroCard.tsx (new), heroCard.css (new), StatusBand.tsx, landingCopy.ts, marketing.css, landingCopy.test.ts, marketingTokens.test.ts, marketingPageSmoke.test.tsx}`, `design-refs/landing-hero-v3.html`, `design-refs/.refhashes.json`.
- **`10e55fe7`** — phase 2: the opening, the living query card and the odometer.
  Files: `src/marketing/HeroCard.tsx`, `reports/landing-hero-v3/phase2/*`.
- **`43c89b70`** — phase 3: locks, narrow widths, reduced motion.
  Files: `tests/e2e/landingHeroV3.measure.ts` (new), `tests/e2e/landingColoursV2.measure.ts`, `tests/e2e/onbV5.measure.ts`, `scripts/landing-refdiff.mjs`, `reports/landing-hero-v3/{mutation-proofs.txt, shots/*}`.

## What was built

- **The hero is the ref's 1280 frame, scaled to the window, sized by the ref's `size()`.**
  - The hero is the window height less the nav less 130, clamped to 400–672 frame units.
  - The copy scales with the hero, never below 80%, and is centred in it.
  - The pile scales the same way, with the front card's right edge at x = 1075 and its centre on the copy's centre.
  - **One deviation:** the app's nav is not inside the scaled frame, so the hero subtracts the nav's real height (`--mk-nav-h`) rather than 88 frame units. This keeps the band's line peeking in at every width. The cost: at 1440 the composition sits about 15px higher than the ref, whose scaled nav is 103.5px.
- **The card is the ref's markup, `V4` and `ENTER`, ported structurally** (Web Animations, same fills, timings, knots, `prepClock`/`clockAt`).
  - Every class is `mk-`-prefixed, because the app ships one global stylesheet.
  - Fonts are read from new `.mk-scope` tokens (`--mk-f-display/-serif/-mono/-sans`). That keeps `marketing.css` the only file that names Special Elite or Source Serif 4.
  - The story starts 1.7s after load, once the fonts are ready.
  - Unmounting cancels every animation, timer, frame and listener.
  - The three retired counter styles were not ported.
- **The markup is the end state.** Before hydration, for crawlers and under reduced motion, the card shows Day 99, "With you", "Full requested", all five lines, the final panel, and the feed scrolled to its foot.
- **The status band** is one Special Elite heading with no eyebrow, on the ref's `.peek` ground. It keeps `id="pulse"`.

## Phase 2 measurement (production build, 1440×780, same browser as the ref)

Counter, sampled once a second:

```
ref: 99 32 32 33 36 37 38 39 41 43 46 50 54 58 62 67 71 75 79 82 84 86 87 87 88 89 89 90 91 92 93 95 97 98 99 …
app:  - 32 32 34 36 37 38 39 41 43 47 50 54 58 63 67 72 76 79 82 84 86 87 88 88 89 90 90 91 92 94 95 97 98 99 …
```

- **The counter only rises.** The one "drop", 99 → 32, is the static markup handing over to the story while the front card is still invisible (it lands at 1.35s). The ref does the same.
- **The nudge form opens at 24.99s** in the app, against 25.05s in the ref.
- **The text never moves.** It was fully opaque, with no running animation, in every sample on both sides.
- **Frames** are in `phase2/`, for app and ref: 0.1s, 2s, 6s, the form open, 40s.

The end state at 1280, beside the ref: `shots/endstate-1280-side-by-side.png`.

## Locks

**Rendered (new):** `tests/e2e/landingHeroV3.measure.ts`, LH1–LH8. All are green on the built preview. Each failed under its named break (`LH3_MUTATE`):

| Break | Lock that failed |
|---|---|
| LH1, sub set in Georgia | the face check |
| LH1b, sub 330px wide | the two-lines check |
| LH2, scroll class removed | `overflow-y` reads `hidden` |
| LH3, animation on the h1 | at 0ms: opacity .25, 1 animation |
| LH4, frames delayed 3s | longest hold 2538ms |
| LH5, overlay div added | the overlay is caught |
| LH6, band padded down | heading bottom at 1025 against a 594 viewport |
| LH6b, pile shifted | centres 56.3px apart |
| LH7, opacity .5 | opacity reads 0.5 |
| LH7b, shadow moved left | cropped at −306px |
| LH8, aria-hidden removed | null |

Full output: `mutation-proofs.txt`.

**Unit (rewritten in phase 1):**
- `landingCopy.test.ts`: the headline and its two lines; the band's statement and the absence of `BAND_EYEBROW`; the phrase appearing once on the page; the sub's two lines with the brand once.
- `marketingTokens.test.ts`: the old "two columns / shadow placed by rule" describe is retired by name, and a v3 describe replaces it (frame, copy, headline, sub, actions, cast, the retired tokens' absence, the sub-900px block). Also updated: the readers of `--mk-lower`, the repaint set (now `.mk-statband` and `.mk-vision`), the token sweep (now includes `heroCard.css`), and the font-owner set (adds `.mk-scope`).
- `marketingPageSmoke.test.tsx`: the rendered h1 and that it is the page's only h1; the sub's line break and highlight; the pile is aria-hidden; the end-state markup; the absence of the band's eyebrow.

Each of these failed under a mutation: brand not highlighted, cast not multiplied, pile not aria-hidden, line spans losing `inherit`, eyebrow restored.

**Retired:**
- LC2 **H2**: the shadow column's box and its .18 opacity.
- LC2 **S2**: every landing box against the pre-pack capture.
- `landing-refdiff.mjs`'s hero and band probes, its shadow-clearance check and its hero sweep.

**Rewritten:**
- LC2 **H1**: the v3 ground. Its break turns it red. All of LC2 now passes: 9 passed, 3 skipped on request.
- onbV5 **A1**: the panel title, which follows `HERO_H1`. Passes.

## For Nick's ruling — the narrow-width default

Below 900px the hero stacks:
- the copy flows at its own sizes (h1 `clamp(40px, 10vw, 64px)`, sub 18px);
- the pile sits below it, centred on its visible extent and scaled to the width;
- the two outermost back cards are dropped (Greg Panetta at −9° and Amira Khan at +11°);
- the shadow is re-placed across the pile's box, 28px from each edge;
- the animation still plays.

At 390 the h1 sets on two lines. See `shots/hero-390x844.png`.

## Not done / open

- Nothing is pushed or deployed. The branch needs merging into `main` (fast-forward from `e8d7b0c8`, if `main` hasn't moved).
- The Auth panel's title change (premise 4) and the missing serif italic (premise 5).
