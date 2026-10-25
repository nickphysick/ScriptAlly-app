# Landing hero on phones, v3.2 — the flip, and agents named

25 Oct 2026. Ref: `design-refs/landing-hero-mobile-v3-2.html`. On `main` at `16b2ed1a`; dev serves `index-B3rTkS_C.js` from `dev/hm31-pv4-qc1492-dh41-cl24-hm32`, which is Contact list v24's dev branch with main merged in. Prod untouched.

## False premises

1. **The ref's `--cgx-h` is not the visible height.** `Math.min(card.offsetHeight-44, (594-64)/0.73-60)` mixes a viewport y (594) with a stage y (64). The first term (661) always wins, so the face's body is centred in the card less its band, not in the part above the drawer. Ported verbatim; a "corrected" value put the title 25px higher than the ref.
2. **The ref has not one she/he string to rewrite, but the brief's whole list reduces to one.** Step 0 swept every hero string in both layouts. The full list is below.

## Step 0: every gendered string on the hero, and what it became

| Where | Before | After |
|---|---|---|
| Popover label, phones and desktop (`PHONE_STORY.asked.label`) | She asked for | Eleanor asked for |

The flip faces are new in v3.2 and were built named from the start ("Eleanor wants to read more!", "Eleanor wants the full!"). All three strings now come from `agentRef(first)` in `landingCopy.ts`: the first name, or "the agent" / "The agent" when none is saved.

## Gates: baseline vs final

| Gate | Baseline (before any edit) | Final |
|---|---|---|
| tsc | exit 0 | exit 0 |
| vite build (grepped for errors/warnings) | clean | clean |
| vitest | `Test Files  3 failed \| 637 passed (640)` · `Tests  1 failed \| 9865 passed \| 3 skipped (9869)` | `Test Files  3 failed \| 638 passed (641)` · `Tests  1 failed \| 9868 passed \| 3 skipped (9872)` |
| e2e, both hero files | 30 locks | `36 passed (5.8m)` |

The three failing vitest files are the same before and after: `functions/eval/run.test.ts`, `functions/src/email.test.ts`, and `functions/src/smartImportCore.test.ts` (the 32k ceiling). Nothing under `functions/` was touched.

## Commits

- `8ee78699` **Phone hero v3.2 — the card flips to celebrate the partial and the full**. Files: `design-refs/.refhashes.json`, `design-refs/landing-hero-mobile-v3-2.html`, `src/marketing/HeroCard.tsx`, `src/marketing/heroCard.css`, `src/marketing/landingCopy.ts`.
- `85fdf503` **Landing hero — agents named in request notes, never she/he**. Files: `src/marketing/agentRef.test.ts`, `src/marketing/landingCopy.test.ts`, `src/marketing/landingCopy.ts`.
- `16b2ed1a` **Phone hero v3.2 — locks**. Files: `reports/landing-hero-mobile-v3-2/mutation-proofs.txt`, `tests/e2e/heroWording.ts`, `tests/e2e/landingHeroMobile.measure.ts`, `tests/e2e/landingHeroV3.measure.ts`.
- This report, the screenshots and the CLAUDE.md line ride a fourth commit.

## What the flip does (measured at 390 × 844)

- **Partial:** the face shows from 7.1s to 9.6s at Day 36. The popover opens at 10.2s and "Partial requested" types at 12.4s.
- **Full:** the face shows from 26.0s to 28.4s at Day 99. "Full requested" types at 29.1s.
- **The turn:** each turn passes edge-on. Neighbouring frames read +73° to +87° on one side and −68° to −85° on the other.
- **Confetti:** all 18 pieces stay above the title. The lowest centre is 10px above its top edge.
- **The loop** now runs about 35s, up from about 27s.
- **The desktop** loop is unchanged at about 29s, with no face element and no turn.

## Screenshots

Phase 1, the app beside the ref (`shots/compare-*.png`): edge-on, the partial burst, partial settled, full settled, and the popover. The card sits higher than the ref's because of the 24 Oct "cards higher" change, as before. The ref's popover still says "She asked for", because the ref predates the wording rule.

From dev after the deploy: `shots/dev-390-partial.png`, `shots/dev-390-full.png` and `shots/dev-1440-popover.png`. Local builds: `shots/popover-phone.png` and `shots/popover-desk.png`. All read "Eleanor asked for".

## Locks

**Added.** Each was red against its named break, at the assertion it exists for (`mutation-proofs.txt`):

| Lock | Claim | Break → red at |
|---|---|---|
| HM18 | The face shows exactly twice a run, at Day 36 and Day 99. The card turns through edge-on going in and coming out. The popover is never visible with the face. The face is gone before the popover opens and before Full requested types. | `HM18` card held flat → "turns in through edge-on"; `HM18b` face left showing → "exactly twice"; `HM18c` popover forced visible → "never visible while the face is" |
| HM19 | Every confetti piece's centre stays above the face's title. | Pieces moved to 96% → "still above the title's top edge" |
| HM20 | Phone, whole run: no she/he/her/him in any text node on the card; the popover reads "Eleanor asked for". | Label rewritten to "She asked for" → "no she/he/her/him" |
| HM21 | Reduced motion: no visible face, and the card never turns about Y. | Injected face → "no frame shows a face"; injected rotateY → "no frame turns the card" |
| LH19 | Desktop at 1440 × 780, whole run: no `.mk-cgx`, no 3D transform on any card, no keyframe naming rotateY. | Injected face → "no .mk-cgx"; rotateY on the front card → "no card is turned about Y" |
| LH20 | Desktop, whole run: same as HM20. | Same break → same assertion |

The unit lock in `src/marketing/agentRef.test.ts` covers the name, the blank-name fallback ("the agent" / "The agent", including null, undefined and spaces), and no pronoun in any built string. It was red before Phase 2: the module did not export the helper.

**Rewritten** for the longer loop:
- HM14 waits 37s instead of 27s; the first run now ends at about 35s, so 27s would have failed its "the first run ended" population check.
- HM16 waits 16s instead of 14s, because the partial's flip now comes before the popover.
- HM15 is unchanged at 60s and still covers two runs (out at 34.9s, a fresh Day 1 0.8s later).

**Retired:** none.

## Dev

Dev serves `index-B3rTkS_C.js`, from `dev/hm31-pv4-qc1492-dh41-cl24-hm32` at `162bfe42`. That is Contact list v24's dev branch, which dev was serving as `index-nmR8INfB.js`, with main merged in. The only conflict was `design-refs/.refhashes.json`, where both sides added a ref; the union checks 759 refs.

Run against dev:
- HM18: flips at Day 36 and Day 99.
- HM20 and LH20: "Eleanor asked for" in both layouts, no pronouns.
- LH19: no flip on desktop.

All four passed.
