# Pinned rows sit centred in their visible area

**Branch:** `fix-pinned-row-centre`, cut from **`954a9413`**: the dev integration branch `…-qc1384-pkg4-pkg41`, which dev served as `index-BOw0IoMj.js` (the baseline build of that tip matched it byte for byte). Dev had moved since v138.4: another session deployed Submission packages v4.1 on top of it. `origin/main` also now points at that same commit.

## False premises (read first)

1. **Only two pages have a pinned row: the Query Centre and the Contact list.**
   - **Comparable titles** has a full-screen list (`useFullScreenList`) but no pinned row. Its page is also in `src/components/manuscripts/`, which this pack forbids touching.
   - **Submission packages (v4)** has neither.
   - **`/queries/responses` is not a route on this branch**, so RS1 doesn't exist here.
   - Instead of RS1 and those two pages' full-screen locks, L1 ran their nearest equivalents: `compsV25` (Comparable titles' full screen) and `pk4` (packages v4).
2. **There is no "existing single position writer" for either row.** Both were placed by construction: a stated 68px child of the sheet at `top: 0`. The shared frame adds the one writer the pack describes (`usePinCover`). It writes only the measured cover; the box itself is still placed by construction.
3. **The cover is the sheet lip and nothing else.** The lip is 12px, `z-index: 19`, `pointer-events: none`. The folder tab's flap and the sheet's radius don't reach the row.
   - **Hit-testing cannot see the lip**, because of `pointer-events: none`. The first recon used `elementsFromPoint` and reported nothing covering the row.
   - The cover was found by **paint**: each element meeting the row's top 24px is painted a probe colour in turn, and the screenshot pixels are checked.
4. **"Children have no top padding" is applied to the content row and the children's margins, not to the children's own padding.** Removing a button's or a search box's internal padding would change the control itself, not where it sits.

## §0 Recon (before the fix; scrolled 1500px, 1512 × 900 and 1280 × 800)

| Page | Component | Row box | What covered its top | Visible top | Children vs box centre | Children vs visible centre |
|---|---|---|---|---|---|---|
| Query Centre | `QcPinned138` | top 105.75, 68 tall | `div.sheet-lip`, **12px** | 117.75 | 0.0px | **−6.0px** (6px high) |
| Contact list | `ContactPinnedRow` | top 105.75, 68 tall | `div.sheet-lip`, **12px** | 117.75 | 0.0px | **−6.0px** (6px high) |

The readings are the same at both widths.

**What QC138.1 A1 measured, and why it passed:** each child's centre against the pinned row's own box. The children were exactly centred on that box, at 0.0px. But the box's top 12px is under the lip, so the reader sees a 56px strip with the contents 6px high in it. A1 asked the right question of the wrong rectangle.

## What changed

| Part | Commit | |
|---|---|---|
| A | `352a4d62` | `shell/PinnedRow` + `pinnedRow.css`: the one frame. `usePinCover` measures the lip along the sheet's top edge and writes `--pin-cover` on the sheet. It runs on mount, on any resize of the sheet or a lip, and 340ms after such a change; nothing polls. The row is `--pin-cover + 64px`, padded down by `--pin-cover`, around one 64px flex row (`align-items: center`, no child margins). It publishes `--pin-row-h` for the headings. |
| B | `fd44ac15` | Both pages render their rows through `PinnedRow`. Each page's own box, height (68), padding, positioning and show/hide rules are deleted; their headings and the Contact list's scroll padding read `--pin-row-h`. Nothing in either page was offsetting the contents; the lip was. |
| C | `046458a0` | Optical centring. The "73 queries" / "37 agents" titles (Special Elite 20px, line-height 1) had their ink, cap height to baseline, **2.9px above** the content row's centre. One shared `--pin-ink-nudge: 0.145em` (2.9 / 20, so it scales with the type) moves a `data-pin-text` child down by `translate`. |
| D | this commit | Locks, harness edits, report. |

**After:** the row is 76 tall (12 covered + 64), and every child's centre is 0.0px from the visible centre on both pages at both widths. The titles are judged by their ink.

## Locks: PIN1 (`tests/e2e/pinRow.measure.ts`; shared helpers in `pinLib.ts`)

Each lock was green on the branch and red on its named mutation (`mutation-proofs.json`):

| Lock | Green | Red (mutation) |
|---|---|---|
| P1 | Every child within 1px of the visible area's centre; the visible top is found by paint; text-only children judged by ink. | `--pin-cover` 0: children 6.00px high. |
| P2 | The cover is measured (12px, `div.sheet-lip`); the content row and every child start below it. | `padding-top` removed: the content row starts at 0 against a 12px cover. |
| P3 | Both rows render through `PinnedRow`; no rule naming a page's own row class sets `height`, `padding-top`, `padding` or `top`. Tailwind's preflight `*` reset is excluded because it names no class. | Contact list given its own `padding-top: 0`: caught. |
| P4 | The headings' top equals the row's bottom (±1) and holds across a 1500 → 1680 scroll in five steps. | The old fixed 68 offset: 173.8 against 181.8. |

**Edited, each with a note:**
- **QC138.1 A1:** now measures as P1 does, against the visible area, found by paint.
- **CL17 C1:** the row's height is held to the sheet's measured `--pin-cover + 64`, no longer a stated 68. Not on the edit list, but forced by the change.
- **QC138.2's and QC138.3's `hoverRow` helpers:** move away first, let any open peek fold, then centre the row and hover it.
  - In the old order (scroll, then move away), the previous row's peek folded after the target was placed. The target slid up about 150px, and its hover point could land under the sticky stack (pinned row, headings, a group band), which now reaches 8px lower.
  - Found by debugging a QC138.2 B1 failure that reproduced 3/3 on this build and 0/3 on the base build, with the same test file.

## L1

The full run on the final state:

| Suite | Result |
|---|---|
| PIN1 | 4 passed |
| QC138 | 16 passed |
| QC138.1 | 6 passed (A1 edited) |
| QC138.2 | 2 passed, D1 failed: pre-existing, also red on the base build |
| QC138.3 (D–F) | 3 passed |
| QC138.4 | 5 passed |
| CL17 | 13 passed (C1 edited) |
| CL17.1 | 6 passed |
| compsV25 (Comparable titles' full screen) | 13 passed |
| pk4 (packages v4) | 38 passed |

**Two reds are pre-existing:**
- **QC138.2 D1** (motion timing) fails on the **base** build `954a9413` too.
- **QC138.2 C1** is intermittent on **both** builds. On the base it failed once in two runs, on `cor-closed`.

Neither is caused by this change. The base was built in a separate worktree and served on its own port for these comparisons.

**Gates:** tsc clean; both builds clean; Vitest 8807 passed, and the only red is the known `functions/src/email.test.ts`.

## Shots (`shots/`)

`before-*` and `after-*` for each page's pinned row at 1512 and 1280, with 24px of context above and below.

## Integration and dev

Dev served `index-BOw0IoMj.js`, from `dev/…-qc1384-pkg4-pkg41` at `954a9413`. This branch contains that branch, so the integration branch **`dev/…-qc1384-pkg4-pkg41-pinfix`** is a fast-forward to `61ed4ec9`: the same commit the gates and locks above ran on. It was built from a clean detached worktree and deployed hosting-only to `scriptally-dev`, after checking the served hash immediately before. **Dev now serves `index-XJ-N_guT.js`**, the gated build's own hash. Not merged to main; prod untouched.
