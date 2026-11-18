# Query Centre — decisions (dev line)

⚠️ main has its own `docs/decisions/query-centre.md` (moved from CLAUDE.md on 11 Nov). This file was created on the dev line by Query Centre v157; at merge, move the v157 section below into main's file by hand and delete this header.

## Current state

- Newest build on this line: Query Centre v157 (18 Nov 2026; ref design-refs/query-centre-v157.html; report reports/query-centre-v157/REPORT.md; branch `query-centre-v157`, NOT merged). The grid card is `QcCard154.tsx`, styled by qcv154 → qcv1541 → qcv156 → qcv1561 → qcv157.
- Stage colours come from one table, `src/lib/stageColours.ts` (band, tint, mark per stage). The grid card reads `band` only; `tint` and `mark` wait for the next pack.
- Not yet on the slate ladder (they move in the next pack): the stage ring, Birds-eye, the log-a-query slip preview, the pull-out query card, Dashboard, activity feed, Analytics, Contact list, Responses, To-do, phone pages.

## Query Centre v157 — the slate ladder, the foil offer, centred boxes, gone quiet (18 Nov 2026)

Baked decisions (the pack's; do not reopen):
1. Colour is the stage and nothing else. Whose move it is never changes a band's colour.
2. Closed is grey (`#eceae6`), not sand.
3. Revise & Resubmit and Resubmitted are in the Full stage.
4. Offer has the foil; Offer and Signed share it. It moves once on hover or focus-visible and stays; nothing loops.
5. Fact boxes are centred top to bottom. Needs-you is a white box with a 1.5px navy outline. There is no dot.
6. Gone quiet is the fade, the dots, the z's on hover, and "Gone quiet · Nudge or close". The grid card never shows Nudge and Close buttons; the arrow chip opens the card (`chipPress` in lib/qc154), whose footer offers both.
7. Nothing on a grid card is a button at rest.

How it is built:
- `slipTone` returns the five stage names; `SLIP_TONE_FILL` is the bands. The v153 tone names survive only as `legacyTone153` / `LEGACY_TONE_FILL_153` for the surfaces that keep today's colours (slip preview, Birds-eye's `data-sk`); the stage ring has its own copy (`RING_FILL`).
- A card is quiet by the page's existing test: the stamped `stateOf(r) === "quiet"`, else `whereItStands(r) === "quiet"` (lib/qc154 `isQuietCard`). No new derivation; `rowAct` is unchanged, so other surfaces keep "Nudge" / "Close it".
- The quiet line: "nudged {date}" from `nudgeMsOf` (the nudge since the last send), else "since {reply date}" (`expectedMs`); neither date, no line (an agent with no stated reply window, quiet by the undated 84-day rule).
- The z's sit on the card itself (overflow visible), outside `.qc154-in`, which clips. Any `overflow: hidden` on the card cuts them (QC157-8).
- Every stylesheet hex that restates the table is asserted equal to it (stageColours.test.ts, qcv157.test.ts).

Locks: tests/e2e/qc157.measure.ts (QC157-1 … QC157-11, at 1512 × 982 and 1280 × 800, every fold open), src/lib/stageColours.test.ts, src/components/queries/centre/qcv157.test.ts and qcQuiet157.test.tsx.
