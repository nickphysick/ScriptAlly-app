# Public pages on phones v1 — report

Branch `public-phone-polish-v1`, cut from **d5edca5a** (the tip `dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2-td12`, proved to be what dev serves by building it: `index-Br61DMeD.js` locally and on dev). Not merged to `main`. Ref: `design-refs/public-phone-polish-v1/` (manifest `898774d7…0560c`, 23 files OK).

Everything here applies at **≤760px** on the marketing tier and **<768px** in the account frame. P1 holds 1440 × 900 and 1280 × 800 identical to the build before the pack on all nine pages (DOM and pixels).

## False premises

1. **The board does not load 10C.** It loads each decision's *Recommended* option as its default, and decision 10's is **B** (a card on navy), not the **C** (all navy) the prompt lists as Nick's pick. The prompt describes C in detail, so **C was built**. The board renders were taken with C forced via its own `qh-pub-picks2` storage.
2. **The ref's "before" shots were taken without the webfonts.** The typewriter face is Courier and Playfair is Times in all ten. My re-takes match them in layout, structure and copy at every view; nothing on the pages had changed since 29 Oct. The hero card is also caught at a different frame of its animation.
3. **"Use a `hashchange` listener in the place App reads the pre-auth hash".** One is already there: App's `useHash` hears the change and passes a new `initialMode`. The fault was in `Auth`, which seeded its mode from that prop once and never followed it. The fix is a prop-following effect in `Auth`; App's listener is untouched, and there is no second router.
4. **P6 as written ("the tab's `scrollWidth` ≤ `clientWidth`") cannot pass or fail on the fault.** The tab's `scrollWidth` includes its decorative flare (`.ws-ftfl`, `right: -12px`), so it is 12px over on a correct page. "Create ac…" was clipped by the tab *row* (`.sf-tabs`), not by the tab's own overflow. P6 therefore measures the name's wrapper (`.ws-ftnm`): its overflow, its right edge against the row's, and the tab against "Back to site".
5. **The board draws the menu's founding button cream; the prompt says the Join bar's primary.** Built as the Join bar's pink (`#e8b4a3`, now the token `--mk-join`) with ink text, going to `/founders`.
6. **The board's "How can we help?" renders in Playfair**, because brand.tsx forces bare `h2`s and the board's injected rule loses. The prompt says the display face, so it is Special Elite.
7. **The small-capitals list was not complete.** A census of every text node at 360 and 390, with a live founding count and the page walked to the bottom, found eight more under 12px or in capitals under 14px. Each now gets the same treatment:
   - the closing card's places counter;
   - the join bar's count;
   - Pricing's counter line;
   - Pricing's sticky founding bar;
   - the legal pages' section numbers ("01");
   - "or with email";
   - the account frame's BETA chip;
   - the hero drawer's privacy note.

   None shows without a live count or a scroll, which is why the review's shots had none of them.
8. **`.mk-pvmorelbl` has no rule of its own.** Its capitals came from the button `.mk-pvmore`. Both are now set: the label to 14px/600 sans, and the button's tracking and case.
9. **Not every "inline privacy policy" link stands alone on a line.** The "Privacy" ending the founding notes closes a sentence, and a 44px area there overlapped the claim button by 6px and Pricing's "What founding writers get" by 9px (measured). It has no hit area. Contact's fine-print link has one and overlaps nothing.
10. **There are no separate pricing or founders sheets.** All of it is `marketing.css`, plus `heroCard.css` (the drawer note) and `onboarding.css` (the account frame).
11. **`.sf-lab` is not only the account frame's.** The signed-in set-up screens share it, so every account rule is scoped to `.sf--account`.
12. **Sharing Pricing's sheet with Contact exposed a corner.** `.mk-sheet:has(.mk-pvm)` is `overflow: visible`, so Contact's full-bleed ground then painted square oat over the sheet's rounded bottom corners. LC2 S1 caught it on the first run; on a phone the ground now takes the sheet's width and its 18px bottom radius.
13. **P9 as first written was vacuous.** Public pages set `overflow-x: clip` on `html` and `body`, so `scrollWidth` never shows an overflow. The lock stayed green under its own mutation. It now asks for any element drawn past the viewport's edge, unless an ancestor of its own clips or scrolls it.
14. **The pack was in `~/Downloads/queryhawk-phone-all-stages.zip`, not at the repo root.** Only `design-refs/public-phone-polish-v1/` was extracted.

## Gates: baseline against final

| Gate | Baseline (d5edca5a) | Final |
|---|---|---|
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npx tsc --noEmit -p functions/tsconfig.json` | exit 0 | exit 0 |
| `npm run build:dev`, grepped `error\|[WARNING]` | 0 lines | 0 lines |
| `npx vitest run` | `Test Files  693 passed (693)` · `Tests  10747 passed \| 3 skipped (10750)` | `Test Files  693 passed (693)` · `Tests  10747 passed \| 3 skipped (10750)` |

## Commits

| Commit | Files |
|---|---|
| `de6b2b22` A: sentence case and readable sizes | `marketing.css`, `onboarding.css`, `design-refs/public-phone-polish-v1/` (24 files) |
| `05da4ee5` B1: footer, contact button, sign-up tab | `marketing.css`, `onboarding.css` |
| `3213e3fa` B2: Contact on phones | `marketing.css`, `ContactPage.tsx`, `contactCopy.ts` |
| `9e86e331` B3: About on phones | `marketing.css` |
| `9f2c4e38` C: tap targets, the phone menu, auth follows the hash | `marketing.css`, `heroCard.css`, `MarketingShell.tsx`, `Auth.tsx`, `onboarding.css` |
| D: locks, shots and the report | `tests/e2e/publicPhonePolish.measure.ts`, `tests/e2e/hitBoxes.ts`, six re-pointed suites, Contact's ground-corner fix in `marketing.css`, `CLAUDE.md`, this folder |

## The locks (`tests/e2e/publicPhonePolish.measure.ts`, PP1)

Run with `SA_E2E_BASE_URL=<this build> PP1_BASE_URL=<the build before> npx playwright test --no-deps --project=measure tests/e2e/publicPhonePolish.measure.ts`. The logged-out pages need no sign-in, so `--no-deps` skips it. Readings are in `pp1-readings.jsonl`; the full red-before log is in `red-before.txt`.

| Lock | Claim (population) | Red before | Red under `PP1_MUTATE` |
|---|---|---|---|
| P1 | 1440 and 1280, nine pages: DOM and pixels identical to the build before (18 captures) | n/a (needs both builds) | ✘ two phone rules unscoped: "pages that changed at a desktop width" |
| P2 | no text under 12px, outside the hero card and plate tags (1,066 text nodes) | ✘ | ✘ tab line back to 8.6px |
| P3 | no capitals under 14px (1,066 text nodes) | ✘ | ✘ `.mk-ccpill` back to capitals |
| P4 | Contact: a card over the navy holding the h1 and email, three white ways, no kicker, navy Send. About: ink hero with white h1, three white cards, no 01–03, one note card | ✘ "Contact opens on a card" | ✘ wrapper unwrapped: "Contact opens on a card" |
| P5 | footer, menu, account frame (360 and 390) and the other listed links: every hit box ≥ 44 × 44, none overlapping (12 groups, sampled with `elementFromPoint`) | ✘ "footer 360: under 44 × 44" | ✘ footer gap back, no min-height |
| P6 | the account tab's name is whole at 320 and 360, both modes (4 readings) | ✘ "320 /#/signup: name clipped by the tab row" | ✘ "Your account" shown again |
| P7 | menu: the six items in order, then the founding button, which lands on `/founders` | ✘ (no button) | ✘ Founding writers removed |
| P8 | `#/login` → `#/signup` → `#/login` with no reload: Sign in, Create account, Sign in | ✘ | ✘ `hashchange` stopped at the window |
| P9 | nothing drawn past either viewport edge, 320/360/390/430 × nine pages (36 loads, >5,000 elements each run) | ✓ (already true) | ✘ 520px footer: "320 / mk-footinner 0..520" |

**Final run, all nine:** `9 passed (3.0m)` against the final build, with `PP1_BASE_URL` on the build before. P9 was first written over `scrollWidth`, proved vacuous by its own mutation, and rewritten (premise 13). P1 compares capture sets, not single captures (see the note at the line), because the build before differs from itself in rendering noise.

### Existing suites: re-pointed only where this pack changed the subject

Ten suites (HM, landingColoursV2, onbV5, pricingMobile, landingMobileV1–4, aboutV1, landingHeroV3) were run on the build before the pack and on this one.
- Before: **92 passed, 5 skipped, 0 failed**.
- This build, before re-pointing: **84 passed, 8 failed**. Every one of the 8 failures is caused by this pack.

Each was re-pointed with its reason at the line:

| Lock | Why it changed |
|---|---|
| aboutV1 A3 | At 390 the spot sits above the words in each card (11B), so it now asserts spot above copy, stacked on one left edge |
| aboutV1 A6 | At ≤760 the caption is hidden inside the 64px spot; the plate's name is checked in its `aria-label` instead |
| LC2 N2 | The menu's pink founding button is a filled button, not a link on ink (P7 holds it) |
| LC2 S1 | About opens on ink at ≤760 (top held as ink); Contact takes Pricing's 20px top corners and is read in its side gutter |
| landingMobileV3 LS2 | The hidden counter's text is read case-free, and the lock now also asserts it is hidden |
| onbV5 A3 | Below 768 the account labels are Source Sans 3 in sentence case; 768 and up are unchanged |
| pricingMobile PVM-10 | The counter line and "What founding writers get" label are Source Sans 3 |
| pricingMobile PVM-7 | At 375 × 667 the taller 13px lines pushed "Which plan suits me best?" 11px below the fold. The click then scrolled the form back on screen, so the bar correctly stayed hidden. The scroll now keeps the opener on screen |

**HM (HM1–HM21) needed no change.** **Final, after re-pointing:** `92 passed`, `5 skipped`, 0 failed: the same counts as the build before.

## The pairs

`pairs/*.png` sets the board's rendering of Nick's picks (left) beside the app (right). The navy strip across the foot of each board frame is the board's own picks bar, not the page. The views:
- Contact: top, ways and form, at 390 and 360;
- About: opening, points and note, at 390 and 360;
- footer, menu, sign up, sign in, Terms, Founders, Pricing top and plans, the hero.

`after/*.png` holds the app alone at 2×. Deliberate differences from the board:
- the menu button is pink, not cream (premise 5);
- "How can we help?" is in Special Elite, not Playfair (premise 6);
- the recessed "Sign in" tab still peeks at 360, which the board's snapshot omits.

## Where each candidate selector went

No rule is the candidate's own. Each is restated at the overridden rule's specificity, in a phone media block at the end of its owning sheet.

| `candidate-fixes.css` | Now | Sheet |
|---|---|---|
| `.mk-s3n, .mk-ckicker, .mk-fweyebrow, .mk-doceyebrow {display:none!important}` | same selectors, `display: none` | `marketing.css` |
| `.mk-ccpill, .mk-pvtag, .mk-claimkicker, .mk-fwk, .mk-notekick, .mk-pvmorelbl, .mk-pvstepsh` | `.mk-ccpill, .mk-claimkicker, .mk-notekick, .mk-pvm .mk-pvtag, .mk-pvm .mk-pvmorelbl, .mk-pvm .mk-pvstepsh, .mk-fwcard .mk-fwk` | `marketing.css` |
| `.sf-eyebrow`, `.sf-lab`, `.ws-ftg` | `.sf--account .sf-eyebrow / .sf-lab / .ws-ftg` | `onboarding.css` |
| `.mk-field label, .mk-cmaillabel` | same | `marketing.css` |
| `.mk-drtag, .mk-docmeta, .mk-signrole, .mk-pvjscount` | `… .mk-pvlayer .mk-pvjscount` | `marketing.css` |
| `.mk-pvtabsin small, .mk-rungline, .mk-rungline em` | `.mk-pvm .mk-pvtabsin button small, .mk-scope .mk-rungline(, em)` | `marketing.css` |
| `.mk-footgrid / .mk-footbrand / .mk-footcol ul / .mk-footcol button` | same, plus `min-width: 44px` | `marketing.css` |
| `.mk-cbtn {background:#2a3a52!important}` | `background: var(--mk-navy)`, hover `var(--mk-navy-hov)` | `marketing.css` |
| `.mk-hp-bird {…}` | **not ported**: the hawk stays (Nick, 29 Oct) | — |
| `@media (max-width:400px){.ws-ftg{display:none!important}}` | `@media (max-width: 399.98px) { .sf--account .ws-ftg { display: none } }` | `onboarding.css` |

The board's option CSS went the same way:
- Contact's ways and form, and About's cards, are plain selectors inside the phone block.
- The two card shadows and the hairline are lifted into tokens that Pricing's own rules now read (`--mk-pv-cardline`, `--mk-pv-cardlift`, `--mk-pv-perklift`).
- Contact's opener **shares Pricing's classes** (`.mk-pvm`, `.mk-pvbox`, `.mk-pvart`, `.mk-pvin`, `.mk-pvh1`, `.mk-pvsub`) rather than restating them.

**`!important` kept: one.** It is the font family on Contact's new `.mk-contact .mk-waysh`, because brand.tsx forces every bare `h2` with `!important`, the house reason recorded at every such heading.

## Dev

- Before: `index-Br61DMeD.js` (`…-pa2-2-td12`, d5edca5a).
- After: `index-DB-2-vh0.js`, from a clean build of the tip of `dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2-td12-ppp1` (this branch, which sits directly on what dev served).
- Checked against the deployed site: PP1 P2–P9 with `SA_E2E_BASE_URL=dev`, **8 passed**. P1 needs both builds side by side, so it runs locally only.
- ⚠️ The first run against dev failed six locks, and that was the harness, not the page. PP1 built URLs from the raw env value, so the keyword `dev` became the path `dev/contact`, which the deployed app served as the sign-up screen. PP1 now uses the config's resolved `baseURL` (follow-up commit), and a readiness wait replaces a fixed settle time.

## Open items for Nick

1. **The same small capitals on desktop.** Every rule here is phone-only, so the desktop still has the mono capitals this pack retired on phones.
2. **Should desktop Contact and About follow** the phone versions (the card opener, the ways as cards, the all-ink About opening, the letter card)?
3. **Legal placeholders.** Terms, Privacy and Contact still print `[LEGAL ENTITY NAME]` and `[REGISTERED / TRADING ADDRESS]` from `src/lib/companyInfo.ts`.
4. **About's illustrations and the founder photo.** On phones the four plates are 64px/72px dashed spots, and the drawings will need round crops. On desktop the captioned placeholders are unchanged.
5. **The recessed "Sign in" tab at 360** shows as a 29px sliver; its tap area now reaches 16px left to make 44. Hiding it below 400px would be cleaner (the link under the form does the same job), but that is a design call.
6. **The board's 10th default** loads B, not the C you picked (premise 1). Only the board is affected; the app has C.

## CLAUDE.md

A section titled "Public pages on phones v1" was added to `CLAUDE.md` on this branch.

## Worktree

`../ScriptAlly-ppp` removed at the end (`git worktree list` checked afterwards), after the dev deploy, along with its two `vite preview` processes.

The repo had **six** worktrees besides the primary when this began, over the limit of five. Two belong to the phone-app-v2 session that was still running (`ScriptAlly-pa2`, `ScriptAlly-pa2-int`), so they were not touched. Cleaning up the other four (`ScriptAlly-desk`, `ScriptAlly-dv1-base`, `ScriptAlly-dv1-measure`, `ScriptAlly-hero3`) is offered, not done.
