# Status marks v3 — report

Branch `status-marks-v3`, cut from `shell-tabs-v2-1` @ `9d66210a6` (the branch dev served: `index-BgrkJp8g.js`, hash checked at the start).

## False premises

1. **"Confirm these four are still where the marks are drawn" names three files.** `StageGlyph` and `TrackNode` are both in `StageGlyph.tsx`; the four drawings are `StatusDot`, `StageGlyph`, `TrackNode` and `STATUS_GLYPHS`. All four were where the brief said.
2. **"For each reachable importer of `StageGlyph`" — only one importer *renders* it.** Four files import it (QcFilterMenu140, QcList138, bandMarks, QcHeader138), and every one is reachable at module level (Queries.tsx imports them). But the desktop Query Centre passes `bodyless={qcDesk}` to `QcCentre`, and the only `<QcList138>` sits in that body under `qcDesk ?`, so QcList138 (its peek), `BandMark` (rendered only by QcList138), and `QcAppliedRow140` / `QcFilterStrip142` (props of that one QcList138) are never drawn. `GlyphRow` (QcHeader138) is mounted nowhere ("stays, unmounted" since v149). The one rendered `StageGlyph` was `FilterInner`'s Status chips, shown through `QcFilterPanel151`. I read "reachable" as *rendered from a route*; SM3-8 pins this reading (below).
3. **SM3-8 "no reachable file imports StageGlyph" cannot hold file-wise without editing an unreachable component.** `QcFilterMenu140.tsx` is a rendered file but also holds `QcAppliedRow140`, which still draws `StageGlyph`. The "do not touch unreachable components" rule wins: SM3-8 pins the exact importer set and asserts that inside QcFilterMenu140 only `QcAppliedRow140` draws it.
4. **The search fragment `h7l4 4` also matches two document icons that are not status marks** — `AgentCardParts255.tsx:34` (the agent card's `doc` link) and `phone/v3/v3Icons.tsx:20` (`file`), both `M7 3h7l4 4v14H7z`. SM3-8 matches the three retired offer pages in full instead.
5. **"If nothing imports `TrackNode` afterwards, delete StageGlyph.tsx; if something still does, leave the file"** — after Phase 2 nothing imports `TrackNode`, but `StageGlyph` is still imported, so the file stays. `TrackNode` itself is deleted (Phase 5), under CLAUDE.md's "the thing a pass replaces is deleted"; it also held the old offer page path SM3-8 forbids.
6. **The lock commits.** The brief puts every lock in Phase 5's commit and asks each to be proved red before its fix. I committed each lock with the phase it guards (SM3-1–6 in Phase 1, SM3-7's unit half in Phase 2, SM3-9 in Phase 4, SM3-8 and the measurement in Phase 5), so every commit's gates covered its own change.
7. **SM3-5 and SM3-7 each have two halves.** This repo's Vitest has no DOM, so computed colours and node boxes need a browser. SM3-5's markup half (no colour on the svg under `inherit`) and SM3-7's structure half are unit locks with mutation reds; their computed and geometry halves run on the fixture grid (`tests/e2e/statusMarksV3.measure.ts`).

## Step 0

- **Reference:** `design-refs/status-marks-v3.html`, SHA256 `3749c3bb3c58226ecb69508c3b06d9217ce2457ed4f654faa3a3ddc21777ed40` — matches.
- **StatusDot** is still the single app-wide status component.
- **Fifth-drawing search** (old page fragments, and any svg chosen by Offer, Signed, R&R or Resubmitted):
  - `RecordResponseModal.tsx:255-260, 371` — lucide `Pencil` for the R&R choice and `Trophy` for the Offer choice and the Offer step's header. Status-chosen icons, but the modal is **unreachable**: it is mounted in Queries.tsx and Dashboard.tsx, yet `setIsRecordResponseModalOpen(true)` is never called and Dashboard's only opener (`setNudgeTask`) is only ever set to null. Left as it is.
  - `marketing/HeroCard.tsx` — hand-drawn pills for Queried, Partial requested, Partial sent, Full requested only; no Offer/R&R drawing. Not a status mark of these four.
  - `AgentCardParts255.tsx`, `v3Icons.tsx` — document icons (false premise 4).
  - Everything else draws through `StatusDot` (or a wrapper of it), or is a chart or tint, not a mark (QcStageRing1531's donut, V2Overlays' funnel, QcList's CSS `<i>` "how much manuscript" dot).
- **Importers and reachability:**

  | Importer | Imports | Rendered from a route? |
  |---|---|---|
  | QcSlip153.tsx (`Track153`) | TrackNode | yes — QcCard154 (QcPage151, the desktop grid) and QcLogStages (log a query preview) |
  | QcCard154.tsx | Track153 | yes |
  | QcFilterMenu140.tsx `FilterInner` | StageGlyph | yes — via QcFilterPanel151 |
  | QcFilterMenu140.tsx `QcAppliedRow140` | StageGlyph | no — a prop of the undrawn QcList138 |
  | QcList138.tsx `Peek` | StageGlyph | no — QcCentre is `bodyless` on the desktop |
  | bandMarks.tsx `BandMark` | StageGlyph | no — rendered only by QcList138 |
  | QcHeader138.tsx `GlyphRow` | StageGlyph | no — mounted nowhere |

  No consumer passes `StageGlyph`'s `"key"` kind, so there was no non-status key to keep.
- **Tests that assert a status drawing:** `statusDot.test.tsx` (the only unit spec that read Offer's page or R&R's dash — rewritten to the new grammar, not deleted), `marketingFooter.test.tsx` (glyph count only; unchanged), `sentStrip.test.ts` (a different glyph; unchanged). `qcTrack154`, `qcSlip153`, `qcCard154`, `qcStageRing1531` and `qcState155` read classes, labels and `data-k` on spans, not the svgs — all green unchanged. `tests/e2e/qcV138.measure.ts` asserts the dashed ring on the header's `GlyphRow`, unmounted since v149 — stale before this pack and untouched by it.

## Baseline (before any edit, at 9d66210a6)

tsc clean · build clean · Vitest 876 files passed, **2 failed (3 tests)**: `src/test/emuGuard.test.ts` (1) and `src/test/firestoreTarget.test.ts` (2). The gate is "no worse".

## Commits

| Phase | Commit | What |
|---|---|---|
| 1 | `947262206` | StatusDot: the seal (Offer, Signed), the arrows (R&R, switched at S=16), `tone`, `reached`; header rewritten; SM3-1–6; statusDot.test.tsx rewritten |
| 2 | `a101777c7` | Track153 draws with StatusDot (`tone="inherit"`, Offer step `reached` only when current, closed step = its closed status); SM3-7 unit half |
| 3 | `c33eaa868` | The filter panel's Status chips draw StatusDot at 15px, `tone="inherit"`; dashed outer ring gone |
| 4 | `1888f2a47` | `STATUS_GLYPHS[5]` is SEAL_SOLID in currentColor; SM3-9 |
| 5 | see branch tip | TrackNode deleted; SM3-8; the fixture-grid measurement, contact sheet and this report |

## Locks — red and green

| Lock | Red before the fix | Mutation red | Green |
|---|---|---|---|
| SM3-1 seal | ✗ on the original StatusDot (the page) | Signed's page restored → "Signed @12: expected 'M7 3.5h7l4 4V20.5H7z' to be 'M12.00 2.40A…'" | ✓ |
| SM3-2 arrows | ✗ (the dashed ring) | switch at 14 → "@15: no ring: expected 1 to be +0" | ✓ |
| SM3-3 unchanged | ✓ by design (it locks "unchanged") | dash `6 4`→`5 4` → "Full Requested @13" differs from the capture | ✓ |
| SM3-4 outline | ✗ | prop ignored → "Offer: expected length 2 but got 1" | ✓ |
| SM3-5 inherit | ✗ (unit) | ink set inline under `inherit` → "Queried: … not to match /color:/" | ✓ unit; ✓ computed: under rgb(47, 74, 105) every stroke and fill is that colour; default every one is rgb(28, 19, 15) (12 marks each) |
| SM3-6 names | ✓ by design | Signed labelled "Offer" → "expected { label: 'Offer' } to equal { label: 'Signed' }" | ✓ |
| SM3-7 track | ✗ on the old track (three-node match, the 40 viewBox) | `reached` always true → "Queried: the outline seal: expected … to contain 'd=\"M12.00 3.20A2.55'" | ✓ unit; ✓ grid: 28 cards × 3 widths (1280, 1512, 1920), 924 boxes (node, svg, link) compared, **worst Δ 0px**; 4 StatusDot svgs and 0 TrackNode svgs per card; both Offer cards' fourth step solid, the Full Sent card's outline |
| SM3-8 one drawing | ✗ with TrackNode restored ("an old offer page is still drawn"; "export const TrackNode") | one StageGlyph left in the filter chips → "a second StageGlyph drawing in the filter menu: expected 2 to be 1" | ✓ |
| SM3-9 landing | ✗ on the old page glyph (4 paths) | `#1c130f` hard-coded → "expected … to contain 'fill=\"currentColor\"'" and "glyph 5 … /#[0-9a-f]{3,8}/" | ✓ |

SM3-3 and SM3-6 compare against `src/test/fixtures/statusMarksV3.baseline.json`, the component's own markup and names captured at 9d66210a6 before the edit. SM3-1, -2, -4 and -9 read the paths out of the reference's "Path data" block at test time.

## Screenshots (fixture grid, emulator harness, 1512 × 982)

- `before-offer.png` / `after-offer.png` — Noah Bright, Offer: the current step's page becomes the solid seal.
- `before-rr.png` / `after-rr.png` — Iris Kwan, Revise & Resubmit: the current step is now the arrows in a ring (v3.1, below), and the fourth step's faded page is the faded outline seal.
- `before-queried.png` / `after-queried.png` — Queried: the fourth step's faded page becomes the faded outline seal.
- `contact-sheet.png` — all twelve statuses from StatusDot at 12, 13, 16, 24 and 30, the outline seal, and the two SM3-5 probe rows; `reference-table.png` beside it. Row for row the same, including the R&R switch between 15 and 16.

## Where a status mark is still drawn outside StatusDot

- `marketing/marketingMarks.tsx` `STATUS_GLYPHS` — the public pages' own bundle; the same paths, copied (the brief's Phase 4).
- `StageGlyph.tsx` `StageGlyph` — drawn only by unrendered components (table above). Left on disk.
- `RecordResponseModal.tsx` — lucide Pencil (R&R) and Trophy (Offer) choice icons; the modal cannot be opened.

## Deviations worth a look

- **StatusDot's wrapper on the track is 12px.** The track's CSS sizes the svg (17–24px by context); StatusDot's wrapper span is a layout box. A wrapper wider than the smallest node (21px) would widen the node's grid track and push the svg off centre, so it is held at the minimum. The drawing's size is unchanged (Δ 0px).
- **The track's marks are bigger inside the same box.** TrackNode's ring sat at r 14 on a 40 box (70%); StatusDot's at r 10 on 24 (83%). The svg box is unchanged; the ring inside it is a little larger and the same weight.
- **The filter chips' glyph is the row's first status**: Full requested (also R&R), Full sent (also Resubmitted), Offer (also Signed) — as the stand rows already group them.

## v3.1 — the arrows on an R&R card's current step (17 Nov, Nick's ruling)

Phase 2 drew each step's own mark, so an R&R card's current step was the Full step's mark and the arrows were on no card. Now, on a card whose status is Revise & Resubmit, the current step renders `StatusDot` for Revise & Resubmit (`tone="inherit"`). Nothing else changes: Resubmitted keeps Full Sent's mark, requested statuses keep their solid step marks, and the other three steps of an R&R card are as before.

- **Size.** The current step's svg renders at 20px at 1280, 1512 and 1920 (read off the grid), 17px in a card under 380px (`@container (max-width: 380px)`), and 24px in the log-a-query slip — 16px or more everywhere, so the ringed form throughout and nothing to report. StatusDot picks R&R's form from the size it is GIVEN, and the track gives every step a 12px layout wrapper (the CSS sizes the svg), which would have drawn the small form. So the R&R current step alone is given 17px — the smallest it renders — which also fits the smallest current node (28px).
- **How the track knows the status.** `Track153` gained an optional `status` prop, passed by its two callers (QcCard154, QcSlip153); `slipTrack` in `lib/` is untouched.
- **Geometry.** SM3-7 re-run on the fixture grid: 924 node, svg and link boxes at three widths, worst Δ **0px**.

| Lock | Red before the fix | Mutation red | Green |
|---|---|---|---|
| SM3-10 (unit, qcTrackMarks.test.tsx) | ✗ "expected 2 to be 1" (the Full mark's two circles) | R&R drawn as Full Sent → "expected 2 to be 1" | ✓ one ring, the four RR_INNER paths from the reference; every other status's current step byte-identical to `src/test/fixtures/qcTrackCurrent.baseline.json` (captured at e08d528d5); the R&R card's other three steps equal Full Sent's |
| SM3-10 (fixture grid, `SM3_10=today|fixed`) | ✗ R&R current step `{"circles":2,"paths":0}` | — (the "today" run is the old code) | ✓ `{"circles":1,"paths":4}`; the 27 other cards' current-step markup unchanged against `sm3-10-today.json` |

SM3-7's unit check that every step's wrapper is 12px now names the one exception (R&R's current step, 17px) rather than being loosened.

One unrelated red seen once: `marketingLinks.test.tsx` "no source file hardcodes the retired support address" timed out at 6.9s under parallel load (Vitest's default is 5s); alone it passes (15/15, 4.2s). It walks `src/` and nothing it reads changed.

## Dev

See the wrap-up for the URL and the served bundle hash.
