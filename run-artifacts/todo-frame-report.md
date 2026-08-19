# To-do page — page frame and workspace containers. Run report

**Baseline:** 330 files · **5773 passed** · 0 failed. **Final:** 330 · **5776** · 0 failed.
**Frame assertions: 11 RED → 0 RED / 32 green** (`frame-RED-before.txt` → `frame-FINAL.txt`),
measured at 1440, 1920 and 390. Chassis suite re-run after everything: **66/66 green**.

---

## ⚠️ Premises in this brief that turned out false

1. **"Below the page's narrow breakpoint it goes full width and the pane stacks beneath, as now."**
   There was no breakpoint. The split kept `520px minmax(0,1fr)` at every width, and the RED
   baseline measured the consequence at 390: **the journey's form was 0px wide and the timeline
   34px** — the grid-collapse fault, live on mobile today. The stack now exists (container query,
   780, derived) and 390 measures form/story 172px each, zero overflow.
2. **"Task pane ≥ 900" and "side-by-side at 1440" are arithmetically impossible.** Sidebar+shell
   270 + page gutters 160 + tasks chrome 30 + split pad 44 + list 372 + gap 18 = 894 before the
   pane gets a pixel; 894 + 900 = 1794 > 1440, and side-by-side needs pane grid ≥ 736 against an
   achievable 436. Zeroing every gutter still exceeds the viewport. The honest ceilings after the
   rebalance: **pane 498 at 1440, 978 at 1920**. Re-scoped: 1440 asserts *deliberately stacked with
   the form ≥ 420*; 1920 asserts the design's own relationship (side-by-side, timeline 300 ± 2,
   form ≥ 420 — measured form 600).
3. **"Update the assertion that currently pins the divergence" — no such assertion existed.** My
   own last report called the token divergence "a stated, asserted fact"; it was a CSS comment.
   The assertion is now *created*, for the match.
4. **Half of Phase 5 was already done.** `.tdk-w` has read `var(--line)`/`var(--r-lg)` since the
   chassis run; the one surviving mockup-sampled literal was the story card's `#ece4d9`, now
   `var(--line)`/`var(--r-lg)`, with `#ece4d9` asserted extinct in the sheet.
5. **"Fits comfortably in 372px" — not the agent lines.** F4 measured three of them truncating
   mid-name at 372 (`Elinor Hale · Cavendish & Roe` ≈ 190px in a ~150px lane). The one-line
   ellipsis on `.tdg-sub` was itself a deliberate old rule, reversed in place: the line wraps.

## Concurrency (§0)

No concurrent session this run: HEAD never moved, tree clean on two spaced snapshots, one
claude-code process, no `index.lock`. Every edited block was re-read from disk first.

## The measurements table (Phase 2)

In full in **`frame-measurements.md`** (raw chain: `frame-measurements-raw.txt`). Headlines:

| | 1440 | 1680 | 1920 |
|---|---|---|---|
| list card | 518 | 518 | 518 |
| pane before | **350** | 590 | 830 |
| pane after | **498** | 738 | **978** |

The chain (1440): viewport 1440 → `ws-main` 1216 → `wpg-scroll` 1170 **(pad 80/80 — shell-wide,
stated and left)** → `tpl-cols` 980 → `.tdw-split` (pad 22/22, **`520px minmax(0,1fr)`** —
`todoSplit.css:47`, one file one line) → `.tdk` pad 24/24 → pane. **The list was the fixed track
and the pane took the leftovers — the design's relationship inverted.** DPR = 1, all numbers CSS px;
the wide-pane screenshot was a 2× capture (a Retina grab is 2880 wide and shows the pane at ~700
device px). No max-width caps the pane anywhere in the chain.

## Every assertion, red → green

| id | red before | green after |
|---|---|---|
| P1 ×2 (send) | `[object Object]` FOUND on card and in journey | clean on all five |
| F1 | list 520 | 372 ± 2 |
| F2 | pane 350 (≥900 impossible — arithmetic above) | ≥ 490 @1440 (498); W1 ≥ 960 @1920 (978) |
| F4 | three agent lines truncated | none |
| J1/J2 ×3 | stacked, form < 420 | 1440 deliberately stacked, form 436 ≥ 420 |
| W2/W3 (new) | — (side-by-side impossible pre-rebalance) | same offsetTop, timeline 300, form 600 |
| W4/T1 | — | tiles one row at 1440 and 1920 |
| N1b (new) | — | ≤ 2 tiles per row at 390 |
| N2 | form 0px, story 34px | 172/172, no overflow |

## Per phase

| commit | phase | landed |
|---|---|---|
| `deb134f` | 1 | `[object Object]` → `formatQueryMaterials` in `materials.ts` — **two faults in one expression**: the join printed objects, and the objects were the *wrong fact* (the send rows, not what previously went). The formatter's input type forced the honest source, `q.materialsWanted`. |
| — | 2 | measurements only, artefact committed with 3 |
| `2381924` | 3 | list 372 fixed; the stack that never existed (container 780, derived); `.tdg-sub` wraps |
| `6069475` | 4 | jgrid threshold **786, derived** (grid loses 50; 420+16+300=736); tiles two-up under 360 |
| `c73194a` | 5 | story card joins the QC relationship; `#ece4d9` extinct, asserted |
| *this* | 6 | 21 screenshots (7 journeys × 3 viewports), final suites, report |

**What surprised me:** my own Phase 3 edit closed `.tdw-split` early and orphaned three
declarations inside the container query — invalid CSS, silently dropped, the exact
malformed-comment class this repo documents. **The `tasksViewport` locks caught it; the rendered
page showed nothing wrong.** Repaired in the same commit, noted in the stylesheet where it happened.

## Locks re-pointed (never deleted)

- `tasksViewport.test.tsx` — pinned `--tdw-rail-w: 520px` → 372, reason in place.
- `paneChassis.test.ts` — pinned `@container (min-width: 680px)` → 786, derivation in place.

## Out of scope, named

- The count gap (`13 · 13 of 12` here) — untouched.
- `Query.materialsWanted` vs `Activity.materials` — Phase 1 reads the query field *because that is
  where the data is today*; the storage decision stays open and stays first.
- Duplicate key warnings; materials forms/bulk/Pro; `rowDeed` (left as the one wording).

## ⚠️ The one thing to look at first in the morning

**1440 is a stacked viewport now, honestly and permanently** — the timeline sits under the form
below a 786px pane container, and 1440 yields 486. If side-by-side at 1440 matters, the ~150px to
find are not in this page: they are the shell's (`wpg-scroll`'s 80px gutters, the 224px sidebar).
That is a shell decision, not a tasks-page one — and the second candidate is the 390 view, which is
now *safe* (nothing 0px) but renders ~172px cards in a 390 viewport; the tasks page is parked on
mobile per CLAUDE.md, and unparking it is its own pass.
