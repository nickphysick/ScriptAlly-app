# Query letters v2.4 — the navy header (no Top tip), placeholder art, one list and one workspace, "No text saved"

14 Nov 2026. Branch `query-letters-v2-4`, cut from `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi` (c24562273, then the
served line). Ref: `design-refs/query-letters-v2-4/` (`query-letters-v2-4.html` baf4a2c7…, `query-letters-v2-4-1717.png`
c30fd2c8…), enrolled in `.refhashes.json`. This pack replaces v2.2 and v2.3, which were never run.

**Dev:** serves `index-DTfFPD0T.js` from `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24` @ 004487c22
(pushed). Before the deploy it served `index-Ipyz7Xi7.js`. **Prod: not touched. main: not merged.**

## False premises and deviations (first)

1. **"The v2.1 wording is asserted only in the smoke."** It is also asserted in `tests/e2e/queryLettersV21.measure.ts`
   (QL21-6, 7/8, 6b). Those are re-pointed to the new copy. QL21-1–3 (the tip) are retired.
2. **Phase C, "reuse the sheet's header shadow recipe".** The sheet's shadow (`0 0 0 1px rgba(28,19,15,.1), 0 18px 34px
   -22px rgba(28,19,15,.45)`) is a paper shadow, not the ref's header shadow. I used the ref's
   (`0 22px 36px -26px rgba(28,19,15,.55)`).
3. **The 270 / 30 desk conflicts with the header it sits under.** The built Query Centre header puts its headline at
   268 + 28 = 296. A 270/30 desk would put the workspace 4px off the headline. The desk uses **268 / 28**, so the
   headline and the workspace both start at x = 408 at 1717 (QL24-6). Day one keeps the brief's **270 / 760 / 30**
   (QL24-7).
4. **ArtSlot shows a mono key.** "No caption" was asked for, so `.art-phk` is hidden on this page only. The slot
   is forced to exactly 190 × 142 with border-box, because the ratio box plus border gave 143.98.
5. **ArtSlot's own comment says header art doesn't go through it.** Your ruling in the brief overrides it. The
   comment is left as is, and this report records the exception.
6. **Dev moved mid-pack.** When I finished, dev served `index-Ipyz7Xi7.js` from `…-clq11-td56`, not the
   `index-BQC9KmLH.js` line this was cut from. That line's tip (1e8274f32) is a report-only commit over 1607812c3; the
   build stamps the short HEAD sha (`vite.config.ts:9`), so I rebuilt 1607812c3 to confirm it gives `Ipyz7Xi7`
   (it does), then merged into a new `…-clq11-td56-ql24`. One conflict, `design-refs/.refhashes.json`: both sides had
   appended entries, so I kept both.
7. **QL24-5's red** was first noted "by inspection". It has since been executed: the lock against a `git archive` of
   c24562273 fails 3/3.

## Step 0 map

- The navy header is `shell/OpenHeader` inside a wrapper with classes `qc151 qc153`, dressed by the Query Centre
  sheets: `qcv1534` §2–3 (title, grid `268px minmax(0,1fr) minmax(400px,560px)`, gap 28) and `qcv156` §1
  (`:is(.qc151.qc153, .cl27) > .qc1531-hd`: radius 20, `#2a3a52`, padding, margin).
- The Contact list already reuses it through `.cl27` (`ContactHeaderQc.tsx`). Query letters reuses it through
  `.qc151.qc153` on `.qlp-hdw`, and imports the four QC sheets. **No QC or OpenHeader file is edited.**
- OpenHeader always renders `.qc1531-rc`. This page hides it and sets the grid to `268px minmax(0,1fr)`,
  min-height 227 (the Query Centre's measured height), so the right block is empty as asked.

## Gates

| | tsc | build:dev | Vitest |
|---|---|---|---|
| Baseline (c24562273) | 0 | clean | 3 failed / 12523 passed |
| Final (branch tip) | 0 | clean | 3 failed / 12525 passed |
| Merged dev line (004487c22) | 0 | clean | touched specs 41 / 41 |

The 3 failures are the same 3 on both runs: `emuGuard` (1) and `firestoreTarget` (2). They come from 28 older
fixture scripts, and none is a query-letters file. The e2e locks on the merged line: QL2 + QL21 + QL24, **31 passed**.
Query Centre / Contact list header locks on the branch tip: qc156 V1/V2/V4/V5/V6 and qc1561 W1–W4 pass. qc156 V3 and
clq1 1440/1717 fail with identical items on the base and the tip, so they were failing before this pack.

## Commits and locks

| Phase | Commit | What |
|---|---|---|
| A | df1b15c6a | the ref; the navy header reused; the Top tip deleted (TopTip.tsx, its styles, its key) |
| B | f5bcb1224 | the drawing is `ArtSlot name="query-letters-header"`, 190 × 142, aria-hidden, no caption |
| C | cdd913c5a | 48px under the header, the header shadow, day one at 270 / 760 / 30 |
| D | afd879e42 | one list plus one workspace: `#fbf9f5`, 18px, rail 340 with a hairline; under 1320 the rail goes under the letter; under 900 everything stacks |
| E | c0a5cf50c | "No text saved" copy; a dashed panel with no background |
| fix | e4386a7ba | the slot exactly 142; QL24-6c measures from the desk |
| proofs | 2f2645e3b | mutation-proofs.jsonl + screenshots |
| merge | 004487c22 | into the served dev line |

Locks, each red then green: `mutation-proofs.jsonl`.
- QL24-1: same header primitive and measurements as the Query Centre (227 / 20px / navy / 54px / 46).
- QL24-2: the Query Centre header is unchanged. 24 elements match `qc-header-before.json`. The red was qcv156's navy
  shifted by one channel, done in the measurement worktree.
- QL24-3: the drawing sits where the Query Centre's and the Contact list's do (rewritten for the art; see below).
- QL24-4: no tip.
- QL24-5: `ql24.test.ts`, which checks nothing is left of the tip.
- QL24-6 / 6a / 6b / 6c: the step and the workspace.
- QL24-7: day one.
- QL24-8 / 9 / 10: "No text saved".
- QL24-L: loading.

## The header against the ref

The built header is reused, so where the ref differs, the built value wins:

| | Built (Query Centre) | Ref |
|---|---|---|
| headline | 54px | 66px |
| primary button | 46 | 45 |
| radius | 20px | 24px |
| art column | 268 (+ 28 gap) | 300 |
| shadow | the ref's | `0 22px 36px -26px rgba(28,19,15,.55)` |

## The drawing (14 Nov, later): the hawk at the writing desk, "for now"

Nick supplied the illustration, a hawk with glasses on a chain, writing at a desk, with an envelope beside the
paper. It replaces the placeholder and is drawn the way the Query Centre and the Contact list draw theirs. Branch
`query-letters-v2-4-art`, cut from the served dev line.

- **Asset:** `public/images/letters/query-letters-header.webp`. Cropped from Nick's 1000 × 1000 transparent webp to the
  drawing's own bounds (922 × 849, as the other two drawings are cropped), resized to 400 × 369 (2× its 190 display),
  43 KB, alpha kept.
- **Markup:** a plain `<img alt="" width={190}>` in OpenHeader's art cell, the same pattern as `QcHeader1531` and
  `ContactHeaderQc`. The source is `QL_HEADER_ART` in `QueryLettersPage.tsx`, with `?v=` set to the first 8 hex digits
  of its sha-256.
- **Alignment:** `.qc1531-art img` (qcv1531) gives the width of 190; qcv1534 centres it in the 268 column. Its box is
  then made as tall as the Query Centre's armchair hawk (183.14) with equal `margin-block`, the Contact list's recipe.
- **The placeholder is deleted.** The `query-letters-header` ArtSlot slot, its census entry and its CSS are gone.
  `ArtSlot.tsx` and `artSlots.test.tsx` are back to how they were before v2.4.
- **Lock QL24-3, rewritten.** At 1440 and 1717 it reads each page's art cell, the drawing's width and its centre,
  all measured from that page's own header. Readings (the same at both widths):

  | | cell (x, y, w, h) | drawing (w, centre) |
  |---|---|---|
  | Query Centre | 39, 22, 190, 183.1 | 190, (134, 113.6) |
  | Contact list | 39, 22, 190, 183.2 | 190, (134, 113.6) |
  | Query letters | 39, 22, 190, 183.1 | 190, (134, 113.6) |

  Query letters must equal the Query Centre exactly. It must equal the Contact list to the whole pixel, because that
  page's own margin recipe gives 183.2. This lock is visual, so it has no red proof (CLAUDE.md: red proofs are only
  for logic locks).
- **To change the drawing later:** replace the file and update `?v=`. If the new drawing's proportions differ, update
  the 369/400 in the `margin-block` rule in `queryLetters.css`.

## Screenshots (`shots/`)

The ref is `design-refs/query-letters-v2-4/query-letters-v2-4-1717.png`. The rest state is shot at 1717 only, because
lock QL24-1 measures it at that width. Every other state has both widths:

- `01-rest-1717`
- `02-editor-1440` / `-1717`
- `03-sent-no-text-1440` / `-1717`
- `04-unsent-no-text-1440` / `-1717`
- `05-day-one-1440` / `-1717`
- `06-loading-1440` / `-1717`
- `07-narrow-1200`: the rail sits under the letter.

**The Query Centre header before and after:** `qc-header-before-1717.png` / `qc-header-after-1717.png`, plus the
numbers in `qc-header-before.json`.

## Worktrees

- `ScriptAlly-ql24` (the pack's): removed at the end of the session.
- The measurement worktree for QL24-2's mutation: removed when the proof was taken.
- The scratch deploy worktree and the 1607812c3 check worktree: both removed.
