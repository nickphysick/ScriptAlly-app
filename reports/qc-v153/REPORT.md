# Query Centre v153 — framed slips, filter rail, slim bar, Birds-eye in place

Branch `query-centre-v153`, cut from the dev chain's tip **`114e70967`** (`dev/…-tdp1-aisg1`, which carries v152.2
and page width v1). NOT merged, NOT pushed. Ref: `design-refs/query-centre-v153.html`
(sha256 `bf44ad54…b98e9`, enrolled in `.refhashes.json`).

## False premises found in Step 0

1. **v152.2 and page width v1 were not on `main`.** Both live only on the dev chain (703 and 801 commits ahead of
   `main`). Stopped and reported; Nick ruled to build on the chain's tip, `114e70967`.
2. **The ref was not committed.** It came from `~/Downloads/query-centre-v153-pack.zip`; the hash matched.
3. **The shell's width is 1256px with 40px gutters, not "up to 1660px with ~32px gutters".** That is page width
   v1's actual contract (`--page-cap` / `--page-gutter`, workspacePageGrid.css). The page consumes it unchanged.
4. **Search does not cover notes.** It matches the agent's name and agency only (`matchesFind`), so the
   placeholder reads "Find an agent or agency", not the ref's "…or note". Locked by `qcBar153.test.tsx`.
5. **The row action wording is "Nudge", not "Nudge Sophie".** `rowAct` names no agent; the CTA uses it unchanged.
6. **`/` was already bound** (`SHORTCUTS.qcFind`, in `useQcListKeys`) to the field passed as `findRef`. The bar's
   search takes that ref; no second binding was added.
7. **`StageGlyph` has no document and no bullseye.** Its full is a solid disc and its offer a ring and dot. The
   track's four nodes (and the three closed glyphs) are a new `TrackNode` export in `StageGlyph.tsx`, in its grammar.
8. **The existing `FramedCard` is not the brief's frame** (6px rim, burgundy line). The 7px rim / #e3d5c9 line is
   a new shared class, `containers/framedSlip.css` (`.sa-slip` / `.sa-slip-in`). The Dashboard's CSS is not read.

## What landed

| phase | commit | what |
| --- | --- | --- |
| 1 | `632ca8b31` | the slip (`QcSlip153`, `lib/qc153`, `TrackNode`, `framedSlip.css`, `qcv153.css`), the ref enrolled |
| 2 | `989dff20b` | two columns, group headings with swatches and lines, the Gone quiet / Closed folds, the slim summary line; tabs, Filters button, panel, pill row and to-do rows retired |
| 3 | `1a32eddd2` | the filter rail over `Qc138Filters`, faceted counts (`lib/qc153Rail`), zero-fade, Reset, "n on", folding sections, export at the foot |
| 4 | `d6bb07a6e` | the slim sticky bar (`QcBar153`) |
| 5 | `10656e210` | Birds-eye: framed, stage palette, sentence-case trailing labels, no rust |
| 6 | `f574a18ae`, `03c42915b` | the bar's class collision fixed; Last heard names the agent's move when the query went out the same day; the measurement; this report |

## Gates against baseline (`114e70967`, worktree with the primary's node_modules)

| gate | baseline | each phase |
| --- | --- | --- |
| `tsc --noEmit` | 0 errors | 0 errors |
| `vite build` | clean, no warnings | clean, no warnings |
| Vitest (`--exclude functions/eval/**`) | 11,455 passed, 3 failed, 3 skipped | 3 failed (the same 3), passes rising with the new suites (11,470 at phase 5) |

The three baseline failures are `emuGuard` (1) and `firestoreTarget` (2), about emulator recipes and Firebase
entry points under `tests/`, untouched here. `functions/eval/**` is excluded because the brief forbids eval tests;
the first baseline collected `functions/eval/run.test.ts`, which failed at import (no SDK in the worktree), so
nothing was spent. `tsc` needed `--max-old-space-size=8192` here (it aborted with exit 134 at the default).

New unit locks, each proved red by breaking the mapping and restored: stage → colour, in/out/closed → arrow,
skipped steps (`qc153.test.ts`); faceted counts exclude only their own facet over a non-empty population, proved red
twice (`qc153Rail.test.ts`); the slip's name, id and tone (`qcSlip153.test.tsx`); the bar's count and search words
(`qcBar153.test.tsx`).

## Measured on dev (`tests/e2e/qc153.measure.ts`, 1440 × 900 and 1920 × 1080)

Final deploy `index-M5ROLnQi.js` (`03c42915b`): **list 46/46 and Birds-eye 53/53 at both widths, 6 of 6 tests.**

- **S1 sticky, measured, not read from CSS.** The page really scrolls (precondition), and after 900px the bar's top
  sits on the sheet's lip within 1.5px, while the rail stays on screen beside it. The bar spans the list column and
  its search takes the rest (437px at 1440).
- **S2** 35 slips, each one control named "agent, agency, status", the header tint the stage's, four facts. All
  four tones appeared on the dev account (sand, rose, blue, heather).
- **S3** the CTA is hidden at rest and shown on hover. **S4** Enter opens the card, the slip takes the navy ring,
  Escape closes it and focus returns to `query-row-{id}`.
- **S5** no rust or late colour in any text in List, nor in any colour in Birds-eye. **S6** Birds-eye is in the
  framed card and its trailing labels are sentence case.

**What measurement caught that the unit gates did not.** On the first deploy the slim bar rendered as a
34 × 14 box: the rail's proportion bar was also named `.qc153-bar`. The sticky check passed over it, because a small
box still sticks. The bar-spans-the-column check was added and would have been red on that build. The screens also
showed "Last heard: queried" on a same-day R&R, which is now fixed and locked.

## Screens (`reports/qc-v153/`)

`list-top-*`, `list-hover-*`, `card-open-*`, `list-scrolled-*`, `birds-*`, and the ref's `ref-list-*`,
`ref-hover-*`, `ref-birds-*`.

## Where the build departs from the ref, and why

- **Width:** 1256px of content (the shell's), not 1660 (see false premise 3).
- **Search placeholder:** "Find an agent or agency" (false premise 4).
- **CTA words:** `rowAct`'s ("Nudge", "Send your partial"), as the brief asks; the ref's sample says "Nudge Sophie".
- **The CTA takes no tab stop.** The slip is one control (`role="button"`); a button inside it would be two controls
  in one place. Keyboard readers open the card (Enter/Space) and act there. The CTA shows on focus as well as hover.
- **Next-box wording** is the existing `nextNum` words joined on one line ("12 days late", "No date yet"), with no
  italic second line; the ref's sample lines ("answer the offer") are not in the app's model. Nick rules on Next
  separately.
- **Birds-eye keeps its existing layout** (navy header with zoom and arrows, its group sections and rows), per the
  brief; the ref draws a different Birds-eye. Only the four named changes were made.
- **In Birds-eye the bar's Sort and Group are Birds-eye's own** (Urgency / Status / One timeline; Due / Waiting /
  Agent), as before, because its groupings are not the list's.
- **Group menu heading** stays the existing "Group the list by" (the brief names only "Sort each group by" as new).
- **The summary line** shows the existing heading with a full stop added and the existing detail sentence; the
  to-do rows under it are gone.

## Deferred, named

- `tests/e2e/qc151`, `qc1511`, `qc1512` and `qc1522.measure.ts` read the retired table, tabs and pill row
  (`tests/e2e/RETIRED-query-centre-v153.md`). `qc1522`'s card checks are still live and need repointing to open a
  query from a slip.
- The rail's Most used is a radio, but `past` is also More's "Past their reply date" switch (one field, by design
  since v140): choosing another Most used pick turns that switch off too.
- Merging: this branch sits on `114e70967`; it goes onto the dev chain and to `main` with v152.2 and page width v1.

## Dev

https://scriptally-dev.web.app/queries, serving `index-M5ROLnQi.js` (`03c42915b`). Dev served the chain tip `index-GtyhzUwl.js` before the first deploy, and a clean build of `114e70967` reproduced that hash byte for byte, so nothing on dev was lost. Prod is untouched.
