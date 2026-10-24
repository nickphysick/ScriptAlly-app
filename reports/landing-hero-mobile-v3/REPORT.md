# Landing hero on phones, v3: one short looping story on the card — run report

24 Oct 2026. Ref: `design-refs/landing-hero-mobile-v3.html` (SHA256 `9c830d5c…a0f425`, verified, enrolled in the hash manifest). Phones only (≤760px). The desktop hero and the 761–899px default are untouched: the desktop still runs `play()`, and the phone runs its own `playPhone()`.

## False premises, and what was found

**Found on `main`:** v2 at `36625a83`, the dashboard story.

**Removed from the live path** (HeroCard, HeroPhone, heroCard.css, landingCopy):
- the components `PhoneDash`, `PhonePick`, `ResponseForm`, `PhoneForm`, `Ring`, `Tick`, `Sample` and `TAB_ICONS`;
- the story functions `openOnCard`, `logOnCard`, `recordForm`, `seg`/`segReset`, `zstep`/`zoomOn`, `up`, `LINE_PILLS` and `ZOOMS`;
- the phone's Watch again and its docks;
- the copy `PHONE_DASH`, `PHONE_PICK`, `PHONE_FORM`, `PHONE_RESPONSE` and `PHONE_PILLS`.

The ref's dead code is not ported: `play()`'s new-query path, the record form, the chips, the zooms, the ticker/rolls, `.beat`, and the `.lcd`/`.lcq`/`.lcf`/`#lq`/`#lr` markup.

**Where the brief and the ref disagree, or the ref couldn't be taken as is:**
1. **Stamp timing.** The brief says the stamp returns at 240ms; the ref's script uses 340. I used the ref.
2. **The grown scale is smaller than the ref's .86, by rule.**
   - The v3 placement leaves the final panel only 1.3px above the *resting* drawer, at every size.
   - So once the drawer rises 128px, the only way to keep the panel above it (your standing ruling) is to ease the card back further: **0.758 at 390, 0.637 at 375×667, 0.792 at 430**.
   - The ref holds .86, which hides the panel under the grown drawer. It is the one visible difference in the side-by-sides (the sweep shot).
   - HM8's ".86 where there is room" clause has no screen left to hold on, so it is retired. HM8 still asserts panel-above and never-more-than-.86.
3. **The footer lifts briefly during the swings, as in the ref.**
   - At rest the footer never shows: across two full loops at 390, sampled every 100ms, every reading was under the drawer.
   - It does lift above the drawer during the card's own swings:
     - the deal-in on first load: up to 65px for 0.3s;
     - each swing out and in: up to 15px, while the card is fading through 0.4–0.8 opacity.
   - The ref does the same: 47px during its own deal, at full opacity. Its swing keyframes (ref lines 1313 and 1366) are character-for-character ours.
   - These readings are axis-aligned boxes of a rotated card, so the true corner lift is less. **This is the ref's motion, not a fitting fault.** I'm noting it rather than suppressing it.
4. **Card markup shared with the desktop stays in the shared JSX.** The phone simply never drives it, per L7.

## Gates (no worse than baseline)

| | Baseline (before any edit) | Final |
|---|---|---|
| tsc | 0 errors | 0 errors |
| `vite build` | exit 0, no errors or warnings | exit 0, no errors or warnings |
| Vitest | `Test Files 3 failed \| 636 passed (639)` · `Tests 1 failed \| 9862 passed \| 3 skipped (9866)` | identical |

- The 3 failing files are all under `functions/` (eval/run, email, smartImportCore). They fail because this worktree has no `functions/node_modules`; none touch the marketing tier.
- e2e at the end (local preview of the final build):
  - landingHeroMobile 11/11;
  - landingHeroV3 8/8;
  - landingColoursV2 9 passed, 3 skipped (its own conditional skips).
- On dev, landingHeroMobile is 11/11.

## Commits

- **`9682428a` Phone hero v3 — one short looping story on the card.** Files: `src/marketing/HeroCard.tsx`, `HeroPhone.tsx`, `heroCard.css`, `landingCopy.ts`, `landingCopy.test.ts`, `design-refs/landing-hero-mobile-v3.html`, `design-refs/.refhashes.json`.
- **`c00fc216` Phone hero v3 — locks.** Files: `tests/e2e/landingHeroMobile.measure.ts`, `reports/landing-hero-mobile-v3/mutation-proofs.txt`.
- Both are pushed to `main`. This report and the shots follow as their own commit.

## Side by side (ref left, app right, 390 × 844)

`shots/compare-chips.png` · `compare-tag-partial.png` · `compare-reminder.png` · `compare-tag-nudge.png` · `compare-final.png` · `compare-sweep.png` (the grown-scale difference above).

On dev at 390: `shots/dev-390-run-end.png` (Full requested, final panel above the grown drawer) and `dev-390-loop-fresh.png` (the next card, Day 1, Query sent; the drawer stays grown).

## The locks, each proved red first

Full output: `mutation-proofs.txt`.

| Lock | What it holds | Break | Red at |
|---|---|---|---|
| HM1 footer | At 390×844, 375×667 and 430×932: footer top ≥ the drawer's resting top; final panel's bottom above it; scale .73 at 390, never below .45 | card raised 40px (CSS) | "@390x844: the footer's top is at or under the drawer's resting top" |
| HM14 tags | "Task created" and "Reminder set" within 40px of their lines, wholly on screen, gone within 3.5s; every status pill is such a tag | tag moved to the bottom-right (CSS) | "@390: Task created … within 40px of its line" |
| HM15 loop | After a full run the card leaves and a fresh one reads Day 1 within 2s ("With the agent") | the restart removed from `playPhone` | "a fresh card reads Day 1" |
| HM15 drawer once | The grown class is added once and never removed across two loops | grow on every run + toggle off when grown | "the drawer grows once, after the first run, and stays grown" |
| HM13 copy | "Lord of the Wings" on all five cards, the 15-pages chip, none of v2's story in the rendered phone hero | `HERO_PHONE_MS = "Your manuscript"` | "population: five phone cards" |
| HM6 reduced motion | Day 99, With you, Full requested, five lines, the final panel; footer under the grown drawer; no tags, no Watch again, nothing running | `grow(true)` under reduced motion removed | "the drawer arrives grown" |

- Retired: HM9–HM12 (v2's recorded story).
- Rewritten for v3: HM3 (the sign-up opens after the first run only) and HM8 (see 2 above).

## Dev

- Deployed from `dev/ver1-nbab-pkglink-hm1-ver21-hm2-hm3`, which is `origin/main` merged into the branch dev was serving.
- The `.refhashes.json` conflict was resolved as a union: no entry differed, and the check passed with 746 refs unchanged.
- Dev was confirmed to still serve the previous bundle (`index-eXm3BypA.js`) in the same command as the deploy.
- **Served bundle: `index-CKMg5_xB.js`.**
- At 390 wide the story runs Query sent → Partial requested → Partial sent → You nudged Eleanor → Full requested, the card is dealt away, and a fresh one opens on Day 1. Two loops were sampled with no footer reading at rest.
- Prod is untouched.
