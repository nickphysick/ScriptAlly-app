# Set-up and importing on phones v1 — report

Branch `setup-import-phone-v1` in the worktree `/Users/nickphysick/ScriptAlly-sip`, built overnight on 30 Oct (Stage 3 of the conductor run). Brief: `prompts/3-cc-prompt-setup-import-phone-v1.md`. Refs: `design-refs/setup-import-phone-v1/` (18/18 hashes OK). Nick's picks loaded as defaults (board 1: 1B–7B; board 2: 1B–6B).

Covers the screens between sign-up and the dashboard below 768px. The desktop (768px and up) is unchanged: S11 compares the DOM and the pixels of 16 lab screens at 1440 and 1280 against the base build.

## False premises

1. **The reading tip's art is not a placeholder.** It is a finished drawing (`/images/import/tip-hawk.png`). It is kept, in a 56px round spot.
2. **"Row 14 · 2 queries" on a question card cannot be shown.** A `DeckCard` carries no sheet row number and no query count. The phone card's foot shows the card's own `sub` line.
3. **"Welcome's four options above the fold" was not true after Phase A.** The fourth option ended at 830 against a pinned foot starting at 770. Phase F tightened the welcome panel and the option cards on phones only (S3 holds it); measured heights are below.
4. **"Your list fits in about one phone height" holds at 390 × 844 only.** It is 841px there. At 360 × 780 the same screen is 899px, because the cards' text wraps. S3 holds 390 and reports 360.
5. **S5's "the timings are unchanged (R1 still green)": R1 is red on the base build too.** onbV9's R1 compares the loader and Import-page files against a fixed older commit. On the base (`3c1e5b90`, what dev served) it already lists `ImportPage.tsx` and `HandoffNav.tsx`, changed by earlier packs. This pack changes neither timing constant (`SCATTER_TIMINGS` and `IMPORTING_TIMINGS` are untouched), and S9 measures the importing beat at 950ms.
6. **The question layer could not use phone app v2's `PhoneFlowShell`.** That shell takes a query `JourneyView`, and the review deck is not one. A local layer was built (see "Reused parts").

## Gates

Baseline (base `3c1e5b90`) and final (this branch) are identical:

| Gate | Baseline | Final |
|---|---|---|
| tsc root | 0 | 0 |
| tsc functions | 0 | 0 |
| `npm run build:dev` grepped for `error\|[WARNING]` | no lines | no lines |
| Vitest | `Test Files  697 passed (697)` · `Tests  10774 passed \| 3 skipped (10777)` | `Test Files  697 passed (697)` · `Tests  10774 passed \| 3 skipped (10777)` |

## Commits

| Commit | Phase | Files |
|---|---|---|
| `aa2b2a53` | A: the frame and the set-up steps | SetupFrame.tsx, setupParts.tsx, ImportOverview.tsx, SmartImportReview.tsx, onboarding.css, importFlow.css, v9/onbV9.css |
| `341539e2` | B: the reading screen | ScatterSettleLoader.tsx, ImportTipsCard.tsx, OnbLabImport.tsx, import/ImportFlow.tsx, importFlow.css |
| `e177c380` | C: the review steps | SmartImportReview.tsx, reviewRows.tsx, importFlow.css |
| `73e5c61c` | D: questions, one per screen | v9/ReviewDeck.tsx, v9/onbV9.css |
| `18844244` | E: the importing loader and /import | ImportingLoader.tsx, SmartImportReview.tsx, importFlow.css |
| (F) | F: locks, shots and the report | tests/e2e/setupImportPhone.measure.ts (new), tests/e2e/reviewDrive.ts, onbV5 / onbV5Import / onbV9 measures (re-points), onboarding.css (`--sf-foot-h` default), v9/onbV9.css (welcome spacing), this report and the shots |

All paths are under `src/components/onboarding/` unless named otherwise. Every commit also updates `PROGRESS.md`.

## What was built

- **The frame on a phone (board 1, 1B and 6B).** On a set-up screen the folder tabs are replaced by a navy band: Step n of N, the step's name, and one segment per step.
  - The band reads the frame's own steps. The review overrides it through `useSetupBand`, giving "Review: repeats / agents / queries" with its own segments.
  - Back and Continue are pinned to the bottom. `PhonePin` portals them into `.sf-foothost`, and a spacer equal to `--sf-foot-h` keeps the last content clear.
- **Labels (2B).** v9's small capitals become sentence case in the body face, weight 600, at least 13px.
- **Welcome (3B).** No picture slot.
- **Your list (4B).** Short cards with one line each.
- **Your file (5B).** A plain numbered "What happens next".
- **The tick (7B).** The tick is navy, never sage.
- **The reading screen (board 2, 1B).** Slips fall into two piles, gated on `prefers-reduced-motion` only.
  - The piles count up to the overview's totals after the result. Before it they hold at 0, never a guess.
  - The status line reads "N of N rows read", and the tips card is headed "Did you know?".
- **Review header (2B).** The navy band carries on through the review.
- **Ready rows (4B).** App-style rows. A tap opens the row's own details as a sheet. A left swipe reveals "Don't import", which calls the row's own remove and stays in place with Undo.
- **Repeats (5B).** A two-agent set becomes three choices: keep the first, keep the second, or keep both. "Next set" applies the choice through the same `onRemove`/`onKeepBoth`. Three-way and reconcile sets keep their own cards, one per screen.
- **Questions (3B).** The deck becomes a compact card with "Answer this". That opens a full-screen layer with one question per screen, Skip, and "Save and next".
  - The layer renders the same question body.
  - "Save and next" presses the question's own button, which stays in the DOM visually hidden.
- **The importing loader (6B).** Full-screen navy, with the loader's own five step words ticking on the existing 950ms interval. It lifts at the existing `LIFT_AT_MS`.
- **`/import` inside the app.** There is no SetupFrame there, so the review draws its own steps (`.im-appsegs`) at the top of the sheet.

## Locks — SIP1 (`tests/e2e/setupImportPhone.measure.ts`)

The locks run on `#/onb-lab` at 390 × 844 and 360 × 780. S6 and S8 compare with 1440, and S11 compares 1440 and 1280 with the base build. Each lock asserts its population first.

| Lock | Holds | Red-before (`SIP1_MUTATE`) | Red reading |
|---|---|---|---|
| S1 | band = the frame's step count and name, one segment per step, no folder tab, on 6 set-up screens × 2 sizes | `.sf-tabs` shown | `welcome @390: folder tab visible` |
| S2 | no uppercase text under 14px on 18 screens × 2 sizes, BETA exempt | `.sf-lab` uppercase 10px | deep-equality list of offenders |
| S3 | Welcome's first option ends above the pinned foot; all four exist; Your list ≤ 1.05 × 844 at 390 | picture slots shown | `390x844: title to the last card fits about one phone height` |
| S4 | the foot's bottom equals the viewport at the top and at the end; the last content clears it (4 screens × 2) | static foot | `bookmore&filled=1 @390 at the top` |
| S5 | the piles end on the overview's agents and queries totals; slips fall with motion, none under reduced motion | a fixture whose totals differ | deep-equality: piles ≠ totals |
| S6 | the `review` fixture driven to the end at 1440 (desktop deck) and at 390 (one per screen) hands the import the same result (2,876 bytes, identical) | phone escape answers blocked | the phone run cannot finish (`page.click` timeout on the disabled primary) |
| S7 | a left swipe reveals "Don't import"; pressing it marks the row out with Undo | swipe action hidden | `Don't import revealed` |
| S8 | four sets resolved the same way at both widths: choice "keep first" and "keep both" each hand the import what today's buttons do, and the two choices differ | "keep both" mapped to "keep first" | `both: the agents the review keeps` |
| S9 | the five steps tick on the 950ms beat (±200), the first at the first beat | every step ticked at once | `step 2 on the 950ms beat` |
| S10 | band text white; no green on a phone; no image drawn twice (12 screens) | sage gomark | deep-equality list: green found |
| S11 | DOM and pixels identical to the base at 1440 and 1280 on 16 screens (32 readings, all identical). The sign-up screen alternates between two byte-different frames on the same build, so each screen takes up to five captures | phone rules leaking to desktop (slots hidden) | `screens that changed at a desktop width` |

## Re-run of the older suites (onbV5, onbV5Import, onbV5ImportPage = IP1, onbV9, importLoaderV2)

Each suite ran against this build (`:4722`) and the base (`:4721`). The base has **10 reds**, all present on both builds, so none comes from this pack: H2 ×2, N3 ×2, P1 ×2, D1, R1, B3 and T1. T1 is now green here; see below.

19 cases were newly red here. Every one asserted the phone layout this pack replaced. Each is re-pointed with its reason at the line:

- **onbV5 F4:** the folder tab is now the band (`.sf-pband`), and the exit sits in the brand row.
- **onbV5 S2:** Continue is found in `.sf-foothost`.
- **onbV5 E1:** the chip is sentence case below 768px.
- **onbV5Import R3:** the phone status reads `Ready · N of N rows read`.
- **onbV5Import S2 ×3:** sheet controls include the pinned foot.
- **onbV5Import V2 ×3:** `fixedOverFrame` exempts `.sf-foothost`. The reachable target on a phone is the row's face or the repeat choice, because the buttons are visually hidden.
- **onbV5Import V5:** the row buttons are pressed on the element itself below 768px.
- **onbV9 G:** at 400 the deck is the compact card, so the check asserts "Answer this" instead of the dots.
- **onbV9 M1:** green once `reviewDrive.ts` learned the phone layer.
- **Skipped at phone width, with the SIP1 lock that replaces each:**
  - onbV5Import R2 reading (S1, S5);
  - R4 reading (S5, S10);
  - R2 importing (S9);
  - V1 ×3 (S1, S6).

**`reviewDrive.ts` keeps working.** Its phone branch opens the layer with "Answer this", reads question cards from `[data-im="q-layer"]`, and presses visually hidden answer buttons on the element itself.

**T1 found one fault, now fixed.** The new `--sf-foot-h` had no declared default, so the token sweep listed it as resolving to nothing. `.sf { --sf-foot-h: 0px; }` now declares it.

After the re-points, all 40 phone-width cases in those files pass, including the six skipped by design.

**Final run:** `11 passed`. Each of S1–S11 was proved red under its own break first (10 + S11, all `1 failed`). S6's red is a timeout rather than an inequality: with escape answers blocked, the phone run cannot finish the deck.

## Shots

- `after/`: each screen at 390 × 844, @2×.
- `pairs/`: today's composite on the left and after on the right. There is one pair for every `today/` screen, plus:
  - `reading` at three moments (working, mid-count, done);
  - `review` at its three steps (repeats, agents, queries);
  - `review-review`, which shows one question open in the layer;
  - `review-dupes`, one repeat set;
  - `importing`, the loader.

## S3 heights

| Size | Welcome options (top → bottom) | Pinned foot top | Your list: title → last card |
|---|---|---|---|
| 390 × 844 | 418→483 · 491→555 · 563→627 · 635→700. **All four above the foot** (Phase A had the fourth ending at 830) | 770 | 161 → 1002 = **841px**, about one phone height |
| 360 × 780 | 475→540 · 548→634 · 642→706 · 714→800. Three above the foot; the fourth starts at 714, under it | 706 | 161 → 1060 = **899px**, about 1.15 phone heights |

S3 holds 390 × 844, as the brief states it, and reports 360.

## Reused parts

- **Reused:** `useIsMobile` (shell/mobileChrome); the review's own handlers (`onRemove`, `onKeepBoth`, `onToggleOpen`, `onDelete`, every question's answer button); `summaryModel` → `reviewTallies` for the piles; `IMPORTING_MESSAGES` and the existing interval for the loader's steps; `StatusDot` for the query rows' disc.
- **Built locally; lift candidates for a later shared pass:**
  - `PhonePin` and the foot host (setupParts / SetupFrame);
  - the question layer (`.o9-ql` in ReviewDeck), since `PhoneFlowShell` needs a `JourneyView`;
  - `PhoneRowShell` (swipe and tap, reviewRows);
  - `PhoneDupePick`.

## Dev

FILL

## Open items for Nick

1. **Illustration spots.** The reading tip keeps its finished hawk drawing. The loader and the Your-list cards have no drawing on a phone. Both boards drew empty spots and nothing was invented.
2. **The desktop set-up.** Should it follow any of this (sentence-case labels, the band, the pinned foot, one question per screen)? Nothing desktop was touched.
3. **What the boards drew that the model cannot supply:**
   - the question card's "row 14 · 2 queries" (DeckCard has neither);
   - a progress count during reading before the result: the piles hold at 0 until the real totals arrive rather than counting a guess.
4. **The in-app `/import` review on a phone.** Its Back and Continue buttons are in the flow, not pinned, because there is no SetupFrame foot host there.
5. **Three-way and reconcile repeat sets keep their own cards.** Only the two-agent set has the three-choice form.

## CLAUDE.md section

Added as "Set-up and importing on phones v1" in the branch's CLAUDE.md.

## Worktree

FILL
