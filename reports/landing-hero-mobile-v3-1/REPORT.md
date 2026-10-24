# Landing hero on phones, v3.1: task chips, the materials popover and the drawer buttons — run report

24 Oct 2026. Ref: `design-refs/landing-hero-mobile-v3-1.html`, SHA256 `192b25f8…cbff25554`. I verified the hash, copied the file in from `~/Downloads` and enrolled it in the hash manifest. This is phones only (≤760px); the desktop hero is untouched.

## False premises

1. **`stepNoChips2` is not on the live path.** The brief lists it as newly live. The ref defines it (line 1214) but never calls it: `playShort` uses `step` for the Partial requested line. I did not port it.
2. **v3 is not quite as the brief describes it.** "Phone hero v3 — one short looping story on the card" and "Phone hero v3 — locks" are on `main`, as Step 0 required. Since then a third commit, `2050cc1c` ("the cards reach higher up the screen"), also landed. So the app's card sits higher than the ref's at every size, and every side-by-side shows that. The grown-card scale stays the derived one (~.75 at 390, against the ref's .86), as Nick approved.

## What changed (C1–C6)

- **C1 Task chips.** `floatTag` now stamps a `.mk-taskchip` into its own line's chip row:
  - "Task created" (rust) on Partial requested;
  - "Task complete" (sage, `--done`) on Partial sent;
  - "Reminder set" (rust, bell icon) on the nudge.

  Each chip holds, fades over 400ms from +2.6s, and is removed at +3.2s. Values are the ref's `.lc-att .taskchip` rules. The floating `.mk-up` pill, its rules and its font-reset selector are deleted.
- **C2 The popover.** `.mk-pillpop` and its pointer drop from the status pill. Its top sits at the pill's foot plus 8px in card units, which is 11px on screen.
  - It holds "She asked for" and the compact switcher (the ref's `.smp.sm2` and `.seg`).
  - The switcher flicks to Words (5,000), then Chapters (3), using the ref's `seg`/`segReset`; then the popover tucks back up.
  - "Partial requested" types in only after that. All timings are copied from `playShort`.
  - It is built on element references, never the ref's `q3-*` ids, because the card can be mounted twice.
- **C3 Title.** The front card's manuscript is "The Taloned Mr Ripley" (`HERO_PHONE_MS_FRONT`); the back cards stay "Lord of the Wings".
- **C4 Buttons.**
  - Join is `#2a3a52` with white text. Its rust hover went too, because the ref gives no hover state.
  - "See how it works" is now a link: no fill, navy text, left-aligned, 40px tall, with a 1.5px rust underline at a 6px offset. It keeps its chevron and still jumps to `#pulse`.
- **C5 Copy.** Every new string is in `landingCopy.ts`: `HERO_PHONE_MS_FRONT`, `PHONE_STORY.chips` and `PHONE_STORY.asked`. The copy unit test asserts them.
- **C6 Reduced motion.** The end state is unchanged except for the new title and button styles. No chips and no popover are shown.

## Gates (no worse than baseline)

| | Baseline | After Phase 1 | Final |
|---|---|---|---|
| tsc | exit 0, 0 lines | exit 0, 0 lines | exit 0, 0 lines |
| build | exit 0, no errors or warnings | same | same |
| Vitest | `Test Files 3 failed \| 636 passed (639)` · `Tests 1 failed \| 9862 passed \| 3 skipped (9866)` | identical | identical |

All three failing files are under `functions/`: `eval/run`, `email`, and `smartImportCore`. They fail because this worktree has no `functions/node_modules`.

e2e, local preview of the final build:
- landingHeroMobile 13/13;
- landingHeroV3 8/8;
- landingColoursV2 9 passed, 3 skipped (its own conditional skips).

On dev, landingHeroMobile passes 13/13.

## Commits

- **`f47ed928` Phone hero v3.1 — task chips, materials popover, navy Join.**
  - `src/marketing/HeroCard.tsx`
  - `src/marketing/heroCard.css`
  - `src/marketing/landingCopy.ts`
  - `src/marketing/landingCopy.test.ts`
  - `design-refs/landing-hero-mobile-v3-1.html`
  - `design-refs/.refhashes.json`
- **`3a62daf7` Phone hero v3.1 — locks.**
  - `tests/e2e/landingHeroMobile.measure.ts`
  - `reports/landing-hero-mobile-v3-1/mutation-proofs.txt`

Both are pushed to `main`. This report, the shots and the CLAUDE.md note follow in their own commit.

## Screenshots (app left, ref right, 390 × 844)

- `shots/compare-pop-chapters.png`: the popover on Chapters.
- `shots/compare-chip-created.png`
- `shots/compare-chip-complete.png`
- `shots/compare-chip-reminder.png`
- `shots/compare-drawer.png`: the grown drawer with Join and the link.

The same five moments captured from dev are the `shots/dev-390-*.png` files. The only differences from the ref are the higher card and the smaller grown scale (see false premise 2).

## Locks

| Lock | State | What it holds | Break that turned it red |
|---|---|---|---|
| HM14 chips | rewritten (was the floating-tag lock) | The three chips, in order, each inside its own line's `.mk-lc-att` (lines 1, 2, 3), wholly on screen, gone within 3.5s. Only "Task complete" is sage. No floating `.mk-up` exists at any moment. Tested at 390×844 and 375×667. | floatTag appends a floating `.mk-up` to the card root → "@390: no floating pill element at any moment" |
| HM16 popover | new | The popover's top is 0–16px below the pill (measured 11.1). Its opacity is under 5%, read on the same sample that first sees a letter of "Partial requested" (measured 0). | `.mk-pillpop{margin-top:40px}` → "within 16px of it"; tuck delayed to u+1400 → "already gone when the first letter of Partial requested appears" |
| HM17 buttons | new | Join is `rgb(42, 58, 82)` on white. "See how it works" has no fill (`rgba(0, 0, 0, 0)`), is underlined, still points at `#pulse`, and keeps its chevron. | Join back to rust → Expected "rgb(42, 58, 82)", Received "rgb(162, 69, 42)"; link filled with no underline → "See how it works has no fill" |
| HM13 copy | rewritten | The front card reads "The Taloned Mr Ripley"; four back cards read "Lord of the Wings". The switcher's classes left the "nothing of v2" list, because they are live again in the popover. | `HERO_PHONE_MS_FRONT = "Lord of the Wings"` → "the front card's manuscript" |
| HM6 reduced motion | updated | The new titles, and no chips, popover or pill in the still end state. | (covered by HM13's title break and v3's proofs) |

**About HM16's design.** The popover reaches "gone" about 50ms before the first letter appears, and the recorder samples every 50ms. Comparing two sampled timestamps could therefore flake either way. The lock instead reads the popover's opacity on the very sample that first sees the letter.

## Dev

- Deployed from `dev/ver1-nbab-pkglink-hm1-ver21-hm2-hm3-ver22-hm4-hm31`. That is `origin/main` merged into the branch dev was serving, which carries another session's Versions v2. The merge had no conflicts, and the check reported 747 design refs unchanged.
- I confirmed dev still served the previous bundle (`index-DU3TOttD.js`) in the same command as the deploy.
- **Served bundle: `index-Cg54IVTu.js`.** At 390 wide:
  - the popover drops and flicks to Chapters;
  - the three chips stamp into their rows;
  - Join is navy and "See how it works" is the underlined link.
- Prod is untouched.
