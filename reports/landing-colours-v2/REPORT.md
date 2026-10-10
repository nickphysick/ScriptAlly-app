# Landing colours v2 — report

Branch `landing-colours-v2`, in its own worktree, cut from `origin/header-v3` at `215374ec`
(`origin/main` does not have `src/components/shell/PanelHeader.tsx`). Four commits, one per phase.
Not merged. Deployed to dev from the branch; prod untouched.

## 1. False premises

1. **The footer was not the shell's.** Each of the six page components mounted its own
   `MarketingFooter` as its last child, and on the landing it sat *inside* `.mk-lower`. "Do the
   sheet once, in MarketingShell's wrapper" could not round a surface against a footer inside it.
   The footer moved into `MarketingShell` and renders once. Four unit tests that read a footer out
   of a bare page render were re-pointed.
2. **No element on the public pages carries a `data-probe`.** S2's first population is empty; the
   lock uses the landing's section classes (107 boxes at 1440, 103 at 390).
3. **`FoundingSignup` does not render on `/pricing`.** Only `FoundingCounter` does (the tally
   variant, on the blush founding tier). `/founders` has both, twice: light in its hero, navy in
   the founding band.
4. **The outcome states are `idle · sending · sent · dupe · full · error · down`.** There is no
   `already`; that is `dupe`. An eighth visible state exists that the list omits: the inline
   "invalid address" line. F1 measures all eight.
5. **The anchor does not land within 1px of the nav's bottom edge, and did not before.** `See how
   it works` lands 16px below the condensed bar at 1440 and 1280 and 8.5px below at 390. N3 holds
   it to the pre-pack figure (±1) instead.
6. **Two F2 subjects were under 4.5 before the pack.** The sign-up's small print was 4.1 and the
   tally label 3.8 on light, and the light field's placeholder was 2.97 against a floor of 3. So
   "keep each muted tone's present contrast" and "F2 ≥ 4.5" cannot both hold for those three; the
   lock won, and they were raised (to 4.86, 4.80 and 3.25).
7. **The hero pill's text is `#ffffff`, not cream.** Left as built, as the table says "unchanged".
8. **The CSS cites `heroShadow.measure.ts`, which does not exist.** The hero's lock is the unit
   one in `marketingTokens.test.ts`; H2 is now the rendered one.
9. **`.mk-claimform .mk-btn--ink` matches nothing.** The class was renamed to `--navy` in
   September and these two selectors were missed, so the form button's 17px size rule has not
   applied since. Left alone (layout is frozen) and listed for Nick below.

## 2. Differences between the reference and the build (the build won each)

- The ref's nav wordmark is 28px; the build's is 26px, sized so its capitals match the artwork's.
- The ref's vision cards have a 22px gap and 200px figures; the build keeps its 56px grid gap and
  220px figures, and the cards are drawn outward into the gap (24px left between them).
- The ref's vision band has 96/92px padding and a 52px top margin; the build keeps 108/104 and 104.
- The ref's founding panel has no counter; the build's has one and it is restyled for navy.
- The ref's feature rows, hero shadow placement and footer grid differ in size and spacing. Untouched.

## 3. Token table

| Token | Before | After | Reads | |
|---|---|---|---|---|
| `--mk-band-a` | #ece5d8 | deleted | 1 → 0 | deleted |
| `--mk-bd` | #ded3c2 | #ded3c2 | 7 → 7 | unchanged |
| `--mk-blush` | #f8e8e1 | #f8e8e1 | 6 → 8 | unchanged |
| `--mk-blush-body` | #6d5348 | rgba(28, 19, 15, .68) | 2 → 2 | re-valued |
| `--mk-blush-label` | #9c6a56 | rgba(28, 19, 15, .62) | 1 → 1 | re-valued |
| `--mk-blush-note` | #8a6c5f | rgba(28, 19, 15, .62) | 1 → 3 | re-valued |
| `--mk-blush-ph` | #b08e80 | rgba(28, 19, 15, .48) | 1 → 1 | re-valued |
| `--mk-body` | — | rgba(28, 19, 15, .74) | 0 → 4 | new |
| `--mk-burg` | #7c3a2a | deleted | 25 → 0 | deleted |
| `--mk-card` | #fffefb | #fffefb | 2 → 2 | unchanged |
| `--mk-centre` | #f6e4da | #f6e4da | 3 → 3 | unchanged |
| `--mk-claim-accent` | var(--mk-rust) | var(--mk-rust) | 16 → 9 | unchanged |
| `--mk-claim-ground` | #f5f1eb | deleted | 1 → 0 | deleted |
| `--mk-claim-ring` | rgba(138, 74, 60, .2) | rgba(162, 69, 42, .2) | 1 → 1 | re-valued |
| `--mk-claim-sh` | rgba(28, 19, 15, .11) | deleted | 1 → 0 | deleted |
| `--mk-claim-track` | #f7e8e2 | #f7e8e2 | 1 → 1 | unchanged |
| `--mk-cream` | — | #f4eee5 | 0 → 49 | new |
| `--mk-cream-btn` | — | #f3eee6 | 0 → 4 | new |
| `--mk-cream-rgb` | — | 244, 238, 229 | 0 → 23 | new |
| `--mk-cta` | #f5e2da | #f5e2da | 8 → 8 | unchanged |
| `--mk-cta-bd` | #e8c8bc | #e8c8bc | 4 → 4 | unchanged |
| `--mk-cta-hov` | #f8e9e2 | #f8e9e2 | 1 → 1 | unchanged |
| `--mk-cta-ink` | #f7f0e9 | #f7f0e9 | 2 → 2 | unchanged |
| `--mk-foot-ground` | #efeae3 | deleted | 1 → 0 | deleted |
| `--mk-hair` | #e7ddd2 | rgba(28, 19, 15, .13) | 23 → 16 | re-valued |
| `--mk-head` | #5d4037 | var(--mk-nearblack) | 9 → 9 | re-valued |
| `--mk-hero-ground` | #f7f4ee | #fbf9f5 | 4 → 4 | re-valued |
| `--mk-illo-rim` | rgba(124, 58, 42, 0.34) | rgba(162, 69, 42, 0.34) | 1 → 1 | re-valued |
| `--mk-illo-tag` | rgba(124, 58, 42, 0.5) | rgba(162, 69, 42, 0.5) | 1 → 1 | re-valued |
| `--mk-ink` | #3a1c14 | var(--mk-nearblack) | 18 → 17 | re-valued |
| `--mk-ink-hov` | #2c1f19 | #2c1f19 | 1 → 1 | unchanged |
| `--mk-ink-shell` | — | #1b2433 | 0 → 6 | new |
| `--mk-kicker` | rgba(122, 101, 92, .7) | rgba(28, 19, 15, .45) | 4 → 4 | re-valued |
| `--mk-label` | #9c8878 | rgba(28, 19, 15, .45) | 6 → 6 | re-valued |
| `--mk-lower` | #f2ede7 | #f2eee8 | 2 → 4 | re-valued |
| `--mk-msg-ok-bd` | rgba(138, 158, 136, .5) | rgba(138, 158, 136, .5) | 1 → 1 | unchanged |
| `--mk-msg-ok-bg` | rgba(233, 237, 230, .8) | rgba(233, 237, 230, .8) | 1 → 1 | unchanged |
| `--mk-muted` | #8a7a6c | rgba(28, 19, 15, .52) | 30 → 25 | re-valued |
| `--mk-navy` | #2a3a52 | #2a3a52 | 5 → 5 | unchanged |
| `--mk-navy-hov` | #1f2c3f | #1f2c3f | 2 → 2 | unchanged |
| `--mk-nearblack` | #1c130f | #1c130f | 35 → 34 | unchanged |
| `--mk-panel` | — | #2d3a50 | 0 → 1 | new |
| `--mk-parch` | #fdfaf5 | #fdfaf5 | 8 → 7 | unchanged |
| `--mk-rust` | #8a4a3c | #a2452a | 2 → 22 | re-valued |
| `--mk-sage` | #e9ede6 | #e9ede6 | 6 → 6 | unchanged |
| `--mk-sage-t` | #5a6e58 | #5a6e58 | 3 → 3 | unchanged |
| `--mk-slate` | #6a89a7 | #6a89a7 | 2 → 2 | unchanged |
| `--mk-slate-pale` | #e7eef3 | #e7eef3 | 1 → 1 | unchanged |
| `--mk-stamp` | — | #e0a188 | 0 → 4 | new |
| `--mk-stone` | — | #e9e6e0 | 0 → 2 | new |
| `--mk-terra` | — | #d9967a | 0 → 8 | new |
| `--mk-tile-grey` | #eceae7 | #eceae7 | 1 → 1 | unchanged |
| `--mk-vision-body` | rgba(28, 19, 15, .72) | rgba(28, 19, 15, .72) | 1 → 1 | unchanged |
| `--mk-vision-edge` | rgba(28, 19, 15, .08) | deleted | 2 → 0 | deleted |
| `--mk-vision-ground` | #ffffff | deleted | 1 → 0 | deleted |
| `--mk-vision-rule` | rgba(28, 19, 15, .14) | rgba(28, 19, 15, .4) | 1 → 1 | re-valued |
| `--mk-white` | — | #ffffff | 0 → 1 | new |

Literals: `#5a4a40` (running text, four rules) became `--mk-body`; every `rgba(124, 58, 42, a)`
became `rgba(162, 69, 42, a)`.

Muted tones, old value and contrast → new alpha of `#1c130f`: muted `#8a7a6c` 3.55 → .52 · label
`#9c8878` 2.91 → .45 · kicker 2.96 → .45 · blush-body `#6d5348` 5.91 → .68 · running text
`#5a4a40` 7.25 → .74 · blush-label `#9c6a56` 3.82 → **.62** · blush-note `#8a6c5f` 4.11 → **.62** ·
placeholder `#b08e80` 2.99 → **.48**. The three in bold were raised, not matched (premise 6).

## 4. Re-pointed locks

| Lock (new name) | What it asserts now |
|---|---|
| `--mk-hero-ground equals --ws-sheet` (was `--ws-ground`) | The hero ground is a copy of the app's sheet white, read from `index.css`. |
| `--ws-sheet is declared exactly once in the app` | The app token the copy describes is un-themed. |
| `the lower surface is darker than the hero's` | Unedited; holds at 11 points (was 5). |
| `--mk-lower has one definition, and its readers are…` | The fade lives on the hero (62% → foot); `.mk-lower` is flat; the readers are a named list. |
| `the lower surface's one repaint is the vision band` | Was banner + vision + footer. The founding band paints nothing; the footer left the wrapper. |
| `the footer is the page's ink ground, and no hairline…` | Reads `--mk-ink-shell`, the token the page ground reads; no `border-top`; not rendered in `Landing`. |
| `the vision band is stone, with no edge rules, and its points are white cards` | `--mk-stone`, no borders, three-card rule with padding paid back by an equal negative margin. |
| `the founding band paints nothing; its panel is the navy card` | Panel ground, border, radius, text; `--mk-panel` equals `--ink-band`. |
| `--mk-navy equals --dash-navy` | Unedited; still holds. |
| `--mk-claim-accent is an alias for --mk-rust` | Rust is `#a2452a`; burgundy is absent from the sheet. |
| `the nav wears the picture…` → type | `.mk-navword` is Playfair 600, cream, 1.3; `.mk-wordmarkart` is gone. |
| `wears the wordmark as type, and the button still names the site once` | The nav renders the word as type, no `queryhawk_title`, one mark with empty alt. |
| negative margins: seven → eight | `.mk-vpoint` joins the list, with its reason. |
| four footer tests | Each renders its page inside the shell, and asserts exactly one footer. |

New: K1 (five tests: ink, cream, text ink, oat, terracotta, stamp, cream button, panel, card white,
each against the app's file) and "every cream treatment of the sign-up and the counter is scoped
to the panel".

## 5. Locks: red, then green

Red on the pre-pack build (`red-on-baseline.txt`): N1, N2, H1, S1, V1, F1, F2, T1.
N3, H2 and S2 are no-drift locks and are green on the pre-pack build by construction; their red is
the mutation. Every lock went red on its named mutation (`mutation-proofs.txt`):

| Lock | Mutation reading | Green reading |
|---|---|---|
| N1 | `/ @1440 condensed: nav ground` | 42 readings (7 routes × 3 widths × 2 states), all `rgb(27, 36, 51)`, no filter |
| N2 | `the wordmark is not a picture` | links 8.74–10.33 against the bar, "Log in" 9.52; button `243,238,230` / `27,36,51` |
| N3 | `/ @1440 rest 92 vs 88` | 28 readings equal baseline: 88/72 · 76/68 · 128.8/120.8; anchor 16.00 · 16.00 · 8.52 |
| H1 | `top 27,36,51` | top and 30% `251,249,245`; foot `242,238,232`; title `28,19,15` at all three widths |
| H2 | opacity `0.5` | `0.18` / `0.18` / `0.12`; box equal to baseline |
| S1 | `/ @1440` radii | 21 route × width readings: four 18px radii, ink in every arc, light 20px in, no overflow |
| S2 | `.mk-statband` +20px | 107 and 103 boxes, 0 moved (one stated exception: `.mk-visionin`, 2px) |
| V1 | band white | band `233,230,224`; three cards, white, 14px, no overlap |
| F1 | success message in light ink | 24 state × width readings; lowest text 4.91 (small print), placeholder 3.41 |
| F2 | navy treatment by class | 27 readings on light; lowest 4.80, placeholder 3.25 |
| T1 | hairline restored | ink ground equal to the page's; no top border; heads `217,150,122`; all text ≥ 4.5 |
| K1 | `--mk-lower: #f2ede7` → `'242, 237, 231'` vs `'242, 238, 232'` | green |
| C1 | "The hunt starts." → 3 tests red | green; `git diff --stat origin/header-v3` shows no copy module |

Gates: tsc clean, 541 files / 8,366 tests, both builds clean. Baseline was 541 / 8,352 (the one
baseline "failure" was the worktree missing `functions/node_modules`, not the code).

## 6. Shots (`shots/`)

- `page-<route>-1440.png` and `-390.png` for all seven routes, full page. Compare
  `page-landing-1440.png` with `design-refs/landing-colours-v2/ref-page-1440.png`, and
  `page-landing-390.png` with `ref-page-390@2x.png`.
- `nav-condensed-1440.png`, `nav-panel-390.png` (mobile panel open), `nav-signed-in-1440.png`.
- `founding-<state>-1440.png` and `-390.png` for idle, invalid, sending, sent, dupe, full, error, down.
  (The 390 shots catch the sticky bar across the top of a tall panel; that is the camera, not the page.)

## 7. Changes on the other public pages

- **All:** ink nav and footer, the sheet, paper-white opening section fading to oat, ink text,
  rust for every former burgundy.
- **About:** the commitment strip is the stone band, its two hairlines gone (padding took their pixels).
- **Contact:** the "Email direct" card gained a 1px hairline shadow; white on paper white had no edge.
- **Pricing, Founders, Terms, Privacy:** token re-values only.

## 8. For Nick

1. **Pink survives on light.** The founding tier's blush card, the comparison table's founding
   column, the rose icon tiles, the light sign-up field's pink border and the light counter's pink
   track are the old palette. They still read, so the pack left them.
2. **Sage survives** on About's commitment ticks and the legal pages' bullets, and on the light
   "you're on the list" message.
3. **About's three placeholder illustration plates** (dashed rim, sage / parchment / blush grounds)
   look more provisional on the new sheet than they did.
4. **The Contact button is near-black**, not navy. Every other light-ground primary is navy.
5. **The dead `.mk-btn--ink` selectors** (premise 9): fixing them would make the form's button 17px
   as the reference draws it, and would move the form by a few pixels.
6. **`BRAND_WORDMARK` and `queryhawk_title.png` have no reader now.** Left in place; no image was edited.
7. **Vision cards at 390** sit 14px apart and 10px from the screen edge, because they are drawn
   outward into existing space. Real padding would read better and would move the layout.
8. **The hero pill's text is white**, where the table describes cream (premise 7).
9. **Dev was already serving `header-v3`** (its bundle, `index-DMKcuEg8.js`, is byte-for-byte the
   baseline build of this branch's base), so this deploy removed nothing from dev.
