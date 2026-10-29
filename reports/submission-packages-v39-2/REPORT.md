# Submission packages v39.2 — report

Branch `submission-packages-v39-2`, cut from the tip of `submission-packages-v39-1`, **c4534e41**, in its own worktree.
Level with base: `git rev-list --count HEAD..origin/submission-packages-v39-1` = 0, and the tree was clean. The ref and
its ten screens were verified against `SHA256SUMS` (ref 02c2fe8d…, SHA256SUMS fb288567…) before anything else.

## 1 · False premises and deviations

1. **The Contact list does not draw a pattern behind its header card.** Its pattern is the page sheet's own background
   (`contactV25.css` A1: `public/images/contact/doodle-tile.svg`, 340 × 360, repeating, `background-attachment: local`)
   under an opaque white card. There is no pseudo-element, no mask and no element opacity: the SVG bakes
   `stroke-opacity="0.085"` into its strokes. So "the same mechanism" could not be copied. The packages pattern is the
   ref's mechanism (a `::before` inside the card's clip, `isolation: isolate`, `z-index: -1`).
2. **Opacity: the Contact list's 0.085, not the ref's 0.07**, as the pack asks where they differ. **Mask: the ref's left
   fade is kept**, although the Contact list has none. The Contact list's pattern never sits under text because its card
   covers it; on this card the fade is what keeps the title and buttons clear, which the pack also asks for. To match
   the Contact list literally (no mask), delete the two `mask-image` lines in `pk392.css`; L1 would then need its mask
   check removed.
3. **"Lock v39.1's L4 still holds: the tab's top equals the package card's top".** v39.1's L4 is the rhythm lock (48 / 24
   / 96) and says nothing about the tab. The claim is asserted in the new L7, and pk39's L4 (which compared the two
   headers' heights and tops) is rewritten to it.
4. **The meta line's "· {k} file(s)" can never show.** A material in the app carries no files (`MaterialRow` has none,
   and the drawer has no attachments). The meta line reads "Sent n" or "Not sent yet".
5. **The ref's 04 shows Add on a sent package.** In the app a sent package is locked and offers no Add (v38's ruling,
   unchanged). The screenshot 04 is taken on "Ready one", an unsent package, so the hover shows Add as the ref draws it.
6. **The card stays sticky at 56px, not the ref's 16.** The ref's 16 tucks the 40px tab under the scroller's top edge
   while the card is stuck; at 56 the tab stays 16 clear.
7. **"The tabs start 18px under the strip".** The ref computes 18 from the card's top edge, and the 5px strip lies over
   that edge (it is a pseudo-element), so the tabs are 13 under the strip. The ref's computed value was used.
8. **The summary line drops "· sent n · in m packages".** The ref's row shows the material's own summary and moves
   "Sent n" to the meta line; "in m packages" has no place in the ref's row and is dropped. A material with no summary
   of its own shows no summary line (the fixture's letters have none).
9. **Hover background.** The ref lifts the FIRST row with a shadow on hover and keeps the hairline on the others (an
   accident of its cascade). Every row here takes the white background on hover and keeps its hairline; no lift.

## 2 · What changed

| Phase | Commit | Files |
|---|---|---|
| 1 · Part A, the header's pattern | a384dd4b | `public/images/packages/packages-pattern.svg` (new), `pk392.css` (new), `SubmissionPackages.tsx` (import) |
| 2 · Part B, "Your packages" | 8113ec12 | `Pk39Labels.tsx`, `pk391.css` (mono rule removed), `pk392.css` |
| 3 · Part C, the folder tab and rows | 024c78ea | `Pk26Builder.tsx`, `pk391.css` (F block and the serif title rule removed), `pk392.css` |
| 4 · locks, report | this commit | `tests/e2e/pk392.measure.ts`, `pk392.shots.measure.ts`, `seedPk40.mjs` (`--long-name`), `pk26/pk39/pk391.measure.ts`, `RETIRED-submission-packages-v39-2.md`, `scripts/pk392/`, the ref, `.refhashes.json`, `CLAUDE.md`, this report |

- **A** — the tile is the ref's inline SVG, written out unchanged (parcel, envelope, stamp, a parcel tied with string,
  luggage tag, dashed routes, tick; 1.4px ink stroke). 240 × 240, repeating, from the card's top left.
- **B** — "Your packages" is an h2 in Special Elite 30px/1.1, `#1c130f`, with "Open one to change it below" (Source
  Serif italic 15px, ink 60%) 4 under it; the art is 16 to its left, centred on the pair.
- **C** — the tab: 40 tall, `#5e2f3a`, radius 12 12 0 0, padding 0 18 0 14; the envelope glyph (the ref's two-gradient
  drawing, `#f3d4d6`) and "Your materials" in Special Elite 16px `#fbf1ef`; a 12px concave fillet; a 5px strip. The card
  is `#fbf9f5`, radius 0 16 16 16, no art. Rows: `30px minmax(0,1fr)`, padding 12 12 12 14, top-aligned; names wrap;
  summaries clamp at two lines; the meta line in Source Serif 12px at ink 48%; the in-package row `#fbf3f3` with a 3px
  `#9b4a57` inset edge and "✓ In this package ·" in italic berry, no Add; Add (top right, on a white wash) and Edit only
  on hover or focus; Add always under `hover: none`; hairlines at ink 6%, none under the in-package row.
- The `MATERIALS_ART` constant and the row's grip markup are deleted (nothing reads them).

## 3 · Gates (baseline → final)

| Gate | Baseline (c4534e41) | Final |
|---|---|---|
| tsc | 0 errors | 0 errors |
| build (`build:dev`, grepped for error / [WARNING]) | clean | clean |
| Vitest | 678 files, 10,624 passed, 3 skipped | 678 files, 10,624 passed, 3 skipped |
| e2e (pk26, pk38, pk39, pk391, +pk392) | — | 47 passed, 0 failed (`e2e-final.txt`) |

The first baseline Vitest run had three `functions/` files red; that was `functions/node_modules` missing from the fresh
worktree (as in v39.1). With it linked, 678/678.

## 4 · Locks

New, in `tests/e2e/pk392.measure.ts` (fixture `seedPk40.mjs`; L7 re-seeds with `--long-name` and puts the short name
back after):

- **L1 Pattern** (1280, 1512): a `::before` on the header card; its background is `packages-pattern.svg`, 240 × 240; opacity
  0.085 (±0.001); faded in from the left; absolute, `z-index: -1`, in an isolated card inside its clip; no horizontal
  overflow in the scroller, the window or the document; the title's colour `#1c130f`.
- **L2 Type** (rewrites v39.1 L2): exactly three typewriter headings (the title's highlight, "Your packages" as an H2, the
  open package's name), and the one exception is the materials tab's label; "Your packages" 30px/33 ink, no capitals;
  the italic line, 4 under (±1); the art left of the pair and centred on it (±1).
- **L7 Materials** (rewrites v39.1 L7; 1280, 1512): the tab `#5e2f3a`, 40 (±1) tall, its top the package card's top
  (±1), the card 40 under it; at 1280 the 40-character name "Comps-forward, for agents who ask for it" shows in full
  (scrollWidth ≤ clientWidth) and is not ellipsised; exactly one row has the berry edge, its meta line starts
  "✓ In this package · " and it has no Add; every row has its meta line; Add is hidden at rest and shows on hover and on
  focus.

**Red first, against the v39.1 build** (`redfirst-v39-1-base.txt`): every case red — L1 (no `::before`), L2 (two
typewriter elements, mono heading, no italic line), L7 (tab `#fbf9f5` and 84 tall, the long name 283 wide in a 101 box,
ellipsised, no berry edge, no meta line, Add not shown on focus).

**Red under its own break, on the v39.2 build** (`mutation-proofs.txt`): `PK392_MUTATE=L1` (pattern removed) → L1 red at
both widths; `L2` (label names typewriter) → L2 red; `L7` (names ellipsised) → L7-1280 red (the name check runs at 1280
only); `L7b` (Add shown at rest) → L7 red at both widths.

Rewritten older locks (`tests/e2e/RETIRED-submission-packages-v39-2.md`):

| Lock | Red on v39.1 build | Red under break |
|---|---|---|
| pk391 L2, L7 | — | retired, replaced by pk392 L2 / L7 |
| pk26 PK26-M (names in full, not one line) | yes: the long name ellipsised | `PK26_MUTATE=PK26-M` → red |
| pk39 L4 (tab top = package card top; 340 / 300 wide) | yes: 320 / 280 wide | `PK39_MUTATE=L4tab` (tab back in its card) → red, 40 off |

The tab-top half of pk39 L4 was already true on v39.1 (its two headers had equal tops then); its break is what proves it.

## 5 · Screenshots

`app/` holds the five ref screens at 1512 × 982 and 1280 × 832; `side-by-side/` puts each beside the ref's. Two known
differences: the harness account has four packages, so at 1280 "+ New package" wraps under the labels (v39.1's
premise 7); and the fixture's letters have no summaries of their own.

## 6 · Deploy

(Filled in after the deploy.)
