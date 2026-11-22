# Submission packages v39.2 — report (the replacement pack)

Branch `submission-packages-v39-2`, in its own worktree. **The first v39.2 had landed** (a384dd4b → 3408fc69, pushed and
on dev as `dev/pk391-qm1-pk392`, index-CRC8gyVq.js), so this pack is built on top of it, from tip **3408fc69**, and the
work it got wrong is reworked (§2). Level with base: `git rev-list --count HEAD..origin/submission-packages-v39-2` = 0,
clean tree. The new ref and its twelve screens were verified against `SHA256SUMS` (ref 8cf26f5c…, SHA256SUMS 42898c3c…);
it replaces the first pack's ref at the same path, and the hash is re-recorded deliberately (`--update`).

## 1 · False premises and deviations

1. **"The page ground's pseudo-element carries the packages tile".** The Contact list's page pattern is not a
   pseudo-element. It is the page scroller's own background (contactV25.css A1 — and the Query Centre's is the same,
   qcv150.css A1): `background-color: #f2eee8`, a 340 × 360 tile repeating, `background-attachment: local`, with the
   opacity baked into the SVG (`stroke-opacity="0.085"`, 1.5px stroke). The pack says to use the same mechanism, so the
   packages page does exactly that, and L1 checks the scroller's background rather than a `::before`.
2. **Opacity and size are the Contact list's, not the ref's.** The ref draws its tile at 240 × 240 on a `::before` at
   opacity .055; this page uses 340 × 360 and `stroke-opacity` 0.085 baked into the tile, as the Contact list does. The
   motifs are the ref's, at the ref's drawn scale and 1.4px stroke, spread over the larger tile (so they are as sparse as
   the Contact list's). L1 reads the opacity from both SVGs, never from a literal.
3. **The ref's 2px rule under the version row computes to the 1px row border** — its `.slt.t-ver+.slt` box-shadow is
   overridden later in its own cascade. The pack bakes the 2px ink-10% rule in, so it is built.
4. **"Phase 4: Part E, the folder tab and the rows" needs no edit.** It landed with the first v39.2 (024c78ea), and the
   new ref's computed values for it match the first ref's exactly (diffed with `scripts/pk392/probe-ref.cjs`); only the
   card's height differs, because the ref's Versions list is longer. The one Part E change — the tabs read Versions,
   Letters, Synopses and open on Versions — is in Phase 3. So the pack's Phase 4 has no commit.
5. **The panel exposed a real bug: the colour picker could open off screen.** It is portalled and fixed 10px under the
   package's tile; with the panel's padding the tile sits on the fold at 1280 × 832, and the picker opened below the
   screen where it could not be scrolled to (pk39 L2 timed out on "element is outside of the viewport",
   `redfirst-older-suites-on-panel.txt`). The picker now flips above the tile when it would not fit below (1512df16).
6. **The ref keeps "Pages from" in How it works' illustration and the empty page's animation, and "No pages" on the
   showcase cards.** Only step 3's copy is in the pack; those stay as the ref draws them.
7. **The explainer → panel gap.** The ref draws 48 at 1512 and 40 at 1280; v39.1 set 48 at both widths and this pack
   does not list it, so it stays 48.
8. **"· {k} file(s)" can never show** — materials in the app carry no files (as in the first v39.2).
9. **The ref's screen 04 shows Add on a sent package**; a sent package is locked here and offers none (v38). Screen 04
   is taken on an unsent package.
10. **The design-ref folder was staged with a path-limited `git add -A -- design-refs/submission-packages-v39-2`** so
    the first pack's renamed screens were deleted in the same commit; nothing outside that path was staged.

## 2 · What the first v39.2 did, and what was reworked

| First v39.2 | Now |
|---|---|
| A `::before` pattern inside the header card (a384dd4b), 240 × 240, opacity 0.085, faded from the left | **Removed.** The pattern is the page scroller's, by the Contact list's mechanism; the tile is re-laid at 340 × 360 with the opacity baked in (e249d1ee) |
| "Your packages" as a 30px heading (8113ec12) | Kept: it matches this ref (Part D) |
| Your materials as a folder tab, rows that never cut a name (024c78ea) | Kept (Part E); its tabs now lead with Versions (Phase 3) |
| Locks L1 (header pattern), L2, L7 | L1 rewritten for the page ground; L2 kept; L7 opens Letters first (the list now opens on Versions) |

## 3 · Commits (this pack)

| Phase | Commit | Files |
|---|---|---|
| 1 · A, the page pattern | e249d1ee | `packages-pattern.svg` (re-laid), `pk392.css`, the new ref + `.refhashes.json` |
| 2 · B + D, the panel | 29ef6bc4 | `SubmissionPackages.tsx`, `pk391.css`, `pk39.css`, `pk392.css` |
| 3 · C, the version first | 3eb25f07 | `SubmissionPackages.tsx`, `Pk26Builder.tsx`, `Pk38Drawer.tsx`, `Pk38Results.tsx`, `Pk39Tip.tsx`, `Pk39HowItWorks.tsx` (+ its test), `pk392.css` |
| 4 · E | — | nothing to change (§1.4) |
| the picker fix | 1512df16 | `Pk26Builder.tsx` |
| 5 · locks, report | this commit | `tests/e2e/pk392.measure.ts`, `pk392.shots.measure.ts`, `pk26/pk38/pk39/pk391.measure.ts`, `RETIRED-submission-packages-v39-2.md`, `scripts/pk392/probe-ref2.cjs`, `CLAUDE.md`, this report |

- **A** — `.pk39-wpg > .wpg-scroll`: #f2eee8, the tile repeating at 340 × 360, `local`. Every card, band and the header
  keep their own fills; the pattern takes no room and no pointer events.
- **B** — `.p9-pkc` wraps the labels and the builder: #fbf9f5, radius 20, v39.1's card shadow, padding 28/32/32
  (22/22/24 at a sheet ≤1200), at the Contact list width; the band 96 below (80 compact). On the brand-new page it is
  `display: contents`, so that page is as built.
- **C** — version → query letter → synopsis in the packing list, the drawer, the showcase cards, the pieces row and both
  tab rows (each opening on Versions); the explainer and How it works step 3 take the pack's copy. Display order only.

## 4 · Gates (baseline → final)

| Gate | Baseline (3408fc69) | Final |
|---|---|---|
| tsc | 0 errors | 0 errors |
| build (`build:dev`, grepped) | clean | clean |
| Vitest | 678 files, 10,624 passed, 3 skipped | 678 files, 10,624 passed, 3 skipped (the step 3 test gained an assertion) |
| e2e (pk26, pk38, pk39, pk391, pk392) | 47 passed (the first v39.2) | 43 passed + PK26-B red (it dragged from the default list, now Versions); PK26-B rewritten to open Letters and re-run green: **all pass** |

## 5 · Locks

`tests/e2e/pk392.measure.ts` (fixture `seedPk40.mjs`):

- **L1 Pattern** (rewritten): the page's scroller carries the packages tile at 340 × 360, repeating, `local`, on
  #f2eee8; the tile's `stroke-opacity` equals the Contact list's (both SVGs read); the header card has no pattern and a
  flat fill; no horizontal overflow (scroller, window, document) at 1280 and 1512.
- **L2 Type**: exactly three typewriter headings; the materials tab's label the one exception.
- **L7 Materials** (now opens Letters first): the tab, the 40-character name in full at 1280, the in-package row, Add on
  hover or focus.
- **L8 Panel** (new): the panel holds the labels, the builder's label and both cards; the explainer and the band are
  outside it; its edges are the header card's (±1); #fbf9f5, radius 20; the band 96 below it (80 at 1280).
- **L9 Version first** (new): the packing list's first slot is the version (by position on screen), then letter,
  synopsis, Also sends; "Version" over "Sets the pages that go out"; both tab rows lead with Versions and open on it;
  Best opening first; the drawer's "What's in it" starts with Version; the stored packages are equal by value before and
  after (Firestore returns map keys in no fixed order, so the dumps are compared canonicalised, not as text).

**Red first, on the first v39.2's build** (`redfirst-v39-2a-base.txt`): L1 at both widths (no page tile, a header-card
`::before`), L8 at both widths (no panel), L9 (letter first, Letters open, Best letter first, "Query letter" first in the
drawer).

**Red under its own break, on the final build** (`mutation-proofs.txt`): L1 (page tile removed), L2 (label names in the
typewriter), L7 (names ellipsised), L7b (Add shown at rest), L8 (the panel spans the sheet), L9 (the version row moved
last), **L9data** (a stored name really changes between the two reads — the only way to prove the stored-fields check
can fail, since nothing on the page writes), PK26-W (panel at 48), pk391 L1 (panel at 48), pk391 L4 (explainer 20 above
the panel).

Rewritten older locks are listed in `tests/e2e/RETIRED-submission-packages-v39-2.md`. Their natural reds on the panel
build are in `redfirst-older-suites-on-panel.txt`; pk38 L8's change is a path fix (its claim is unchanged), and pk39
L2's new "the picker is on screen" check is red there as a timeout.

## 6 · Screenshots and the final run

`app/` holds the six ref screens at 1512 × 982 and 1280 × 832; `side-by-side/` puts each beside the ref's. The fixture
has four live packages, so at 1280 "+ New package" wraps (v39.1's premise 7), and its letters have no summaries.

## 7 · Deploy

- **Dev had moved again.** It served `index-BM6PjqtJ.js`: the "retire calendar" session had merged its work onto the
  first v39.2's dev branch as `dev/pk391-qm1-pk392-calx` (d6726195). Confirmed by building d6726195 — an exact match.
- This pack merged onto it as **`dev/pk391-qm1-pk392-calx-pk392b` (a9ed5341)**, pushed. The one conflict was
  `design-refs/.refhashes.json`: both sides' entries kept, this branch's new hash for the v39.2 ref winning. Gates on the
  merged tree: tsc 0, Vitest 685 files / 10,687 passed (3 skipped), build clean.
- Hosting only, `--config firebase.dev.json --project scriptally-dev`, from that clean worktree. **Dev now serves
  `index-hDdKXFfG.js`.** `pk392.measure.ts` (L1, L2, L7, L8, L9) passes against the live site. No rules or functions
  changed. Prod is untouched.
