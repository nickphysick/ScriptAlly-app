# Plumage colours v2 — report

Nick's rulings on Plumage colours v1 as it looked on dev: the with-you outline is gone, Full is slate blue, Offer is
duck egg (soft stripes on the two card bands only, ink text), and every grid card names its status on a label across
its band's bottom edge. Pack: `design-refs/plumage-colours-v2/` (two files, SHA256 as briefed, enrolled in Phase 0).

## False premises, and where the code overruled the prompt

1. **"The frame clips today: change the clipping" — the frame never clipped the label.** The label hangs 11px below
   the band, but the band is inside the frame (`.qc154-in`), with the facts below it, so the label lies wholly inside
   the frame's box. The brief's own mutation for lock 6 ("restore the frame's clipping") stays **green**, measured in
   Chromium and WebKit (E6). What would cut the label is the band itself clipping (`.qc154-hd { overflow: hidden }`),
   and that mutation (E6b) reads red in every reading. I still took the frame's clipping off, as briefed (the band now
   rounds its own top corners, 12px); it costs nothing measurable, but it is one line to put back if Nick prefers:
   `pc2card.css` `.qc154-card .qc154-in { overflow: visible; }`. For Nick (§6 A).
2. **Lock 5's "text … contrast of at least 4.5:1" cannot hold for the card's quieter ink, on any band.** The agency
   line is ink at 58% (4.02:1 on duck egg, 4.30 on the stripes' paper, 3.75 on Full sent), a skipped step ink at 42%
   (2.57:1), a skipped link ink at 50% (3.19:1). These are every band's, not the offer's, and unchanged by this work.
   PC2-5 asserts that every text and mark on an offer surface is ink and that **solid** ink is ≥ 4.5:1 on duck egg and
   each stripe (13.07 the lowest); the reduced-strength values are recorded in the ledger, not asserted. For Nick (§6 B).
3. **The stripes' paper `#f6f0e5` is not in the table.** The brief says the stripes are "built from the table's own
   hexes (paper, Partial requested, Full requested)"; the table has no `#f6f0e5` (Queried's band is `#efe6d6`). It is
   now `STRIPE_PAPER` beside the table, and the two shades are read from the table, so the stripes still follow it.
4. **The grid card is not only the Query Centre's.** `QcCard154` is also rendered by Responses (`RspReadOn`,
   `RspEmpty`), so those cards carry the label too. "Every grid card" was taken literally.
5. **The hover status under the track existed** (v154's `.qc154-thl`, drawn by `Track153`'s `label` prop). It is
   deleted, not hidden: the prop, its span, its rules and its reduced-motion rule. Two older locks asserted it and are
   re-pointed (§4).
6. **CLAUDE.md "Design rules (settled)" says "No green."** Duck egg `#c5e0d8` is a blue-green. It is Nick's ruling in
   this brief and is built as ruled; named so the two settled texts can be reconciled (§6 C).
7. **v1's Phase 3 commit message miscounts its own gate.** It says "full Vitest 13,254 passed, 0 failed"; the run gave
   13,250 passed and 1 failed (a font-family lock, fixed in that commit and re-run alone, green). Corrected in the next
   commit's message (no history was rewritten).
8. **The brief's lock 4 list includes Responses' offer strip; the harness never shows one.** The Responses page in
   the seed opens a Full answer, not an offer, so the offer strip there is covered by the source lock
   (`stageColours.test.ts`: `responses5.css` restates the table) and by `stripStyle` reading `statusBand`, not by a
   rendered reading. Signed and Resubmitted have no live card in the seed either: their bands are unit-locked only.

## 1. Branch, base, commits, bundles

- Base: what dev served at Step 0 and still served at Phase 5 — `index-BGvJwFRg.js`, built from
  `dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1` @ 7972443ea (main d4ef22495 + the qc167 line). Branch
  `plumage-colours-v2` cut from it.
- Step 0 STOP gate passed: `withYouOutline`, `bandRequested` and the navy offer were in `stageColours.ts`. Query card
  v167 is in the base; **v166 (the wash) is on no branch I can find** (`git log --all | grep v166` is empty). This work
  depends on neither.

| Phase | Commit | What |
|---|---|---|
| 0 | 215da373f | the two frozen refs, SHAs checked, enrolled in `design-refs/.refhashes.json` |
| 1 | 41f30644e | the table (Full, Offer, accent inks), the outline's five exports deleted, every reader, older unit locks re-pointed |
| 2 | 0729ad051 | `OFFER_STRIPES` / `STRIPE_PAPER`; `bandBackground` stripes for Offer and Signed; the grid band draws them |
| 3 | ec16fa9e8 | the status label, `pc2card.css`, the hover label deleted |
| 4 | d42b77df9 | `tests/e2e/pc2.measure.ts`, frames, `pc1.measure.ts` retired, older e2e locks re-pointed, decisions docs |
| 4 fix | cde6fadbd | PC2-6's clip read made able to go red (§3) |
| 5 | this report, the dev integration branch, the deploy | |

## 2. Step 0 findings

- **The outline's readers (0.3):** `withYouOutline` / `withYouShadow` / `WITH_YOU_OUTLINE_PX` in `QcCard154.tsx`
  (`--wy`, `data-wy`; `qcv154.css` `.qc154-card[data-wy] .qc154-hd`), `QcSlip153.tsx` (`qcv153.css`
  `.qc153-slip[data-wy] .qc153-top`), `QcCard152.tsx` (`sc1card.css` `.qc152-band[data-wy]`), `RspPanel.tsx`
  `stripStyle`, `Dash2Next.tsx` (inline), `phone/v4/QueryPageV4.tsx` (inline). `PLUMAGE_NAVY` was read only by the
  table and its test.
- **Offer and Full surfaces (0.4):** the grid band (`--tone`), the slide-in strip (`bandBackground`), bubbles
  (`qcThread152` `agentTint`), group swatches (`qc153` `sectionSwatch`, `swatchInk`), Stage pills and bar
  (`StageFilter`), the applied row (`AppliedRow`), Birds-eye (`barFill`), Responses (`responses5.css`,
  `responses15.css`, `stripStyle`), the Dashboard (`Dash2Next`, `Dash2Active`, `dash2Feed.css`, `df1.css`, `dash3.css`),
  Versions (`versionsV6.css`), search (`SearchDesk` chips and peek), the paperclip (`qc1533` `TAB_ACCENT_157`), the
  slide-in's rim (`qcMotion160` `rimColours`), the composer disc, the phone (disc, glyph, bars, query page, task desk).
  Hex restatements: `responses5/15.css`, `dash2Feed.css`, `df1.css`, `qcv1522card.css`, `versionsV6.css`,
  `qc1533.ts`. Paper on navy (`OFFER_INK`, `#f4eee5` on offer rules): `qcv157.css`, `qcv153.css`, `sc1card.css`,
  `dash3.css`, `phoneV4.css`, `phoneV5.css`, `responses5.css`, `Dash2Active`, `qc153` `swatchInk`, the phone census.
- **The grid card (0.5):** band `.qc154-hd`, min-height 76, padding 12/14/12/12, `overflow: visible`; frame
  `.qc154-in`, `overflow: hidden`, radius 13 with a 1px edge; facts `.qc154-fx`, padding 10 (8 in the ≤380px
  container). The status name existed as the card's `aria-label`, the visually hidden `.qc154-sr`, the track's
  `title`, and the hover label `.qc154-thl`.
- **Locks (0.6):** `stageColours.test.ts`'s "no sheen" sweep (no gradient on an offer surface) and its outline,
  navy and v1 Full assertions; `qc1512`, `qc1533`, `qcFoot1522`, `qcThread152`, `dash3Cards`, `qcCard154`,
  `qcViews156`, `todoWs58`, `qcTrack154` unit tests; `pc1.measure.ts`, `qc157` (QC157-1, -3), `qc154` (M1, M3),
  `lf1` (LF4) rendered.

## 3. The locks, red first

Every new or changed lock was proved red under its own named mutation, alone, in a disposable worktree, restored by
content hash afterwards. Full record: `mutation-proofs.jsonl`.

| Lock | Source mutation (Vitest) | Rendered mutation (pc2.measure.ts) | Red rows |
|---|---|---|---|
| 1 no outline | S1 the Partial requested outline restored in `qcv154.css` | E1 the same | 6 |
| 2 table = JSON, restatements = table | S2 `responses15.css` Full `--sb` left at `#b5b6c0` | E2 v1's Full mark `#65667c` on the fact labels | 1 |
| 3 band per status | S3 R&R joins the requested shades | E3 the same (grid band, slide-in strip, Birds-eye bar) | 3 |
| 4 stripes on two bands only | S4 the Stage pill draws the stripes | E4 the same (pill and segment) | 2 |
| 5 ink, no navy | S5 `bandInk` gives the paper for the offer | E5 the offer card's name in `#f4eee5` | 4 |
| 6 the label, unclipped | S6 frame clipping restored (`pc2card.test`) | **E6 frame clipping restored: GREEN** (false premise 1); E6b the band clips: red | 0 / 98 |
| 7 no overlap, one height | S7 the facts' 18px removed (`pc2card.test`) | E7 the same | 264 |
| 8 no "With you", chevron or arrow | — | E8 the ref's "With you" tab on requested cards | 26 |
| 9 the rim | — | E9 the Full rim left at v1's `#65667c` | 1 |

**PC2-6 could not go red at first.** E6b cut every label in half on screen while the lock read them whole: the probe
scrolled the label into view, and a clipping band is a scroll container, so the scroll moved the band's content up by
the clipped 11px and undid the clip; and its pixel read counted the white card body as the label. Fixed in cde6fadbd
(scroll the card, read every clipping ancestor's box, look for the label's own edge line in its stage colour), then
E6b read red in all four readings and E6 stayed green.

Green, on the branch: `pc2.measure.ts` 6 passed, 1,436 rows (88 grid cards; populations: Queried 38, Partial
requested 6, Partial sent 8, Full requested 7, Full sent 8, R&R 1, Offer 2, Rejected 15, No response 2, Withdrawn 1).
Every card one height: 202px at 1280 and 1512, 204px at 1920; the label 7px clear of the facts. PC2-2 read 5,589
elements. Unit: `stageColours.test.ts` 35, `pc2card.test.tsx` 4.

## 4. Older locks re-pointed or retired

- **Retired, replaced:** `tests/e2e/pc1.measure.ts` (PC1-2 outline, PC1-3 navy offer, PC1-1/4/5/6 v1 hexes) by
  `pc2.measure.ts`; PC1-7 (search tiles) carried over unchanged as PC2-9b. QC154 M1's band row (it still expected
  v157's slate ladder, red since v1) in favour of PC2-3/4.
- **Re-pointed to v2's values:** `stageColours.test.ts` (the table from the v2 JSON; the outline describe replaced by
  "the outline is gone"; "no gradient on an offer surface" now "stripes on the two card bands, nowhere else, and no
  offer rule animates"), `qc1512`, `qc1533` (accent, ink, resting ink 82% over white for Full and Offer),
  `qcFoot1522`, `qcThread152`, `dash3Cards`, `qcViews156`, `todoWs58`, `phoneStyle.census` (the paper left the
  palette).
- **Re-pointed to the label:** `qcCard154.test.tsx` and QC154 M1 ("no status word on show" → "on show exactly once,
  on the label"; a card in a folded group, 0 × 0, is not read), `qcTrack154.test.tsx` and QC154 M3 (the hover label →
  "no hover label").
- **Re-pointed for ink:** QC157-3 (an offer's track is ink, not the paper), QC157-1 (an offer band is striped, read
  by PC2-4), LF4 (v1's navy exclusion removed: no stage band is the app's navy now).

## 5. Baseline before and after

| | Before (7972443ea) | After (this branch) |
|---|---|---|
| tsc | clean | clean |
| vite build | clean | clean |
| Vitest | 13,245 passed, 0 failed, 4 skipped (931 files) | 13,251 passed, 0 failed, 4 skipped (932 files) |
| pc1 / pc2 | pc1 5 passed | pc1 retired; pc2 6 passed |
| QC157 | 6/7/9 ×2 and 11 ×2 red | the same four red; QC157-1 and -3 green |
| QC163 | W red | W red (the same three rows) |
| QC164 | 1/2/3/8/9 red | the same |
| QC167 | 10 red | 10 green (it passed here; it flickers) |
| QC158 (not in the brief's set; run because v1 touched it) | 1/15 ×2 red | the same, identical numbers |
| QC154 M1, M2 (run for the label) | M1 ×2, M2 ×2 red | M1 green; M2 ×2 red ("Response overdue" vs today's "Past expected", a copy lock older than this) |
| LF1 (not in the brief's set; re-pointed here) | — | 6 green |

What was already red is untouched. QC157-11 ("nothing moved", red before against a v157 baseline) now also records
the cards 10px taller: the facts' 18px room above them (was 8 at this card width). QC154 M3 and M5 hang for their
10-minute timeouts on this harness and were not run to the end (on the base or the branch).

## 6. For Nick to rule

- **A. The frame's clipping.** It never cut the label; it is off as briefed. Keep it off, or put it back (one line)?
- **B. Quieter ink on the bands.** The agency line (ink at 58%) is under 4.5:1 on every band (4.02 on duck egg), and
  unreached steps and skipped links are fainter still. Unchanged by v2 and not asserted; name a floor if one is wanted.
- **C. "No green"** in the settled design rules, beside the duck egg offer.
- **D. Duck egg and the agents' teal tile.** The kind tiles are in search only. An offer's status chip (duck egg
  `#c5e0d8`) and an agent's tile (teal `#b0c1be`) can be in the same result list; 1.34:1 apart. I found no surface
  where they touch, but I did not frame search with both on screen.
- **E. How Revise & Resubmit reads now.** It shares Full sent's band `#b9c9da` exactly (PC2-3: grid band, strip and
  Birds-eye bar all `#b9c9da`), and v2 took away its navy outline, so on the grid only the label ("Revise &
  resubmit") and the track's R&R mark tell it from Full sent; on the slide-in the strip's name and track do; on
  Birds-eye, bubbles, pills and the Dashboard nothing but words or position does.
- **F. Full requested beside Closed.** `#dbe4ee` against `#eceae6` is 1.07:1 (v1's was 1.23); Full sent 1.41.
- **G. Responses' grid cards carry the label too** (false premise 4). Keep, or the Query Centre only?
- **H. The agent card follows the table again** (`acColours` reads `STAGE_COLOURS`): an agent card at Full is slate
  blue, at Offer flat duck egg (no stripes: it is not one of the two card bands). No agent card file was edited.

## 7. Frames, the dev deploy, and what is left

Frames (Chromium and WebKit at 1512, `frames/`): the list whole and one card per status (Offer, Partial requested
and sent, Full requested and sent, R&R, gone quiet), Birds-eye, the slide-in for Offer and for Full requested, the
Stage pills, Responses, and the Dashboard's "How it's going" chart (Full and Offer bars; Versions has no versions in
the harness, so no chart there). Desktop WebKit cannot press the harness's Sign in button (it never becomes
actionable, and a launched context has no action timeout, so the first frames run hung 15 minutes): the WebKit test
signs in with Enter and the measurement's navigation clicks are DOM clicks.

The dev deploy, the final gates and the bundle proof are appended below by Phase 5.
