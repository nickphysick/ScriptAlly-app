# Retired by Query Centre v132

Ref: `design-refs/query-centre/query-centre-v132.html`. On the desktop (≥768px) the carousel ("Recently moved") is replaced by **Recently updated**: a lede, a featured card and an "Also moved" panel. The phone keeps the v126 carousel, so nothing about the phone is retired here.

A retired case is skipped with `retiredV132(why, by)` (`inkRetired.ts`); a skip is not a pass, and the report counts it.

## Phase 1 — Recently updated

| Case | What it asserted | Superseded by |
|---|---|---|
| `qcV126` QC126-5 · carousel | eight desktop carousel cards, newest first | QC132 R5 (five rows, newest first) |
| `qcV131` QC7 · title follows the chosen section | the carousel's title, its "show recently updated" line and its clear link | QC132 R2 (heading follows the card; a second press clears) |
| `qcV1311` D7 · a card fills the carousel only | the list is untouched when a desk card fills the carousel | QC132 R2 (the same claim over Recently updated) |

## Re-pointed, not retired (the claim survives)

- `qcV126` QC126-6 · desk ≠ list: counts `ru-row` (five at most) instead of carousel cards; the list-is-identical checks are unchanged.
- `qcV126` QC126-7 · one card: the featured card is the app's `.qcard`; the component census is unchanged.
- `qcV126` QC126-20 · one door: presses the featured card's action (`ru-act`) instead of a carousel card's.
- `qcV131` QC1 · page order: measures `[data-qcv="ru"]` where it measured `.qc13-cz`.
- `qcV131` QC14 · art slots: Recently updated draws no spot, so the slot under test is the first one on the page.
- `qcV131` QC16 · loading frames: measures `[data-qcv="ru"]`, whose loading frame keeps its box.

## Red before this pass (not touched)

- `qcV126` QC126-2: three `a17.css` rules (Analytics) paint the old neutral ground. Recorded in CLAUDE.md.
- `qcV131` QC15: needs its reference captured from the pre-v131 build (`QC15_CAPTURE=1`); the file is absent in this worktree.

## Phase 2 — the "Your queries" workspace head

Nothing retired: every case that read the old head still asserts its claim, through the new one.

- `qcV131` QC1: the workspace starts 96 below Recently updated (the ref's `#ws` margin, room for the hawk's 74px rise), measured at `[data-qcv="ws-head"]`. It was 44 to the v131 section head.
- `qcV131` QC8: unchanged. The live count keeps the `data-qcv="showing"` probe and its `data-x`/`data-y`.
- `qcV96` QC4: reaches the grouping through `ws-head` / `ws-group`, and its no-truncation sweep covers the head's title, controls, pills and chips.

Deleted with the old head: `QcSentence`'s `section` variant (desktop only, no caller once the workspace head replaced it), `QcSectionHead` (its only caller), and their `.qc13-sh*`, `.qc13-ctl`, `.qc13-link`, `.qc13-qs` and `.qc13-art--section` rules.
